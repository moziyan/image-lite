import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PreviewService, TaskCancelledError } from '@/services/image/previewService'
import type { ImageProcessResult } from '@/types/image'

vi.mock('@/services/image/workerClient', async () => {
  class TaskCancelledError extends Error {
    constructor() {
      super('Processing was cancelled.')
      this.name = 'TaskCancelledError'
    }
  }
  return {
    imageWorkerClient: { process: vi.fn(), dispose: vi.fn() },
    TaskCancelledError,
  }
})

import { imageWorkerClient } from '@/services/image/workerClient'

const processMock = vi.mocked(imageWorkerClient.process)

function makeResult(): ImageProcessResult {
  return {
    blob: new Blob(['x'], { type: 'image/webp' }),
    width: 10,
    height: 10,
    format: 'webp',
    size: 1,
    originalSize: 2,
    originalWidth: 100,
    originalHeight: 100,
    compressionRatio: 0.5,
    processingTime: 1,
  }
}

function makeRequest(id = 'item-1') {
  return {
    id,
    file: new File(['x'], 'a.jpg', { type: 'image/jpeg' }),
    settings: {
      resize: {
        maintainAspectRatio: true,
        allowUpscale: false,
      } as import('@/types/image').ResizeOptions,
      output: { format: 'webp' as const, quality: 80 },
    },
  }
}

describe('PreviewService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    processMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces: the worker is only called after the debounce window', async () => {
    processMock.mockReturnValue({ promise: Promise.resolve(makeResult()), cancel: vi.fn() })
    const service = new PreviewService()

    const handle = service.schedule(makeRequest())
    expect(processMock).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(PreviewService.DEBOUNCE_MS)
    expect(processMock).toHaveBeenCalledTimes(1)
    await expect(handle.promise).resolves.toBeTruthy()
  })

  it('a new schedule cancels the pending (not yet started) job', async () => {
    processMock.mockReturnValue({ promise: Promise.resolve(makeResult()), cancel: vi.fn() })
    const service = new PreviewService()

    const first = service.schedule(makeRequest('a'))
    const second = service.schedule(makeRequest('b'))
    first.cancel() // consumer cancels the superseded handle

    await vi.advanceTimersByTimeAsync(PreviewService.DEBOUNCE_MS)
    // Only the second job ever reaches the worker.
    expect(processMock).toHaveBeenCalledTimes(1)
    expect(processMock.mock.calls[0]![1]).toBe('preview-b')
    await second.promise
  })

  it('a new schedule cancels an in-flight job (no accumulation)', async () => {
    const cancels: Array<ReturnType<typeof vi.fn>> = []
    processMock.mockImplementation((_input, taskId) => {
      const cancel = vi.fn()
      cancels.push(cancel)
      if (taskId === 'preview-first') {
        return { promise: new Promise(() => {}), cancel } // never settles
      }
      return { promise: Promise.resolve(makeResult()), cancel }
    })
    const service = new PreviewService()

    const first = service.schedule(makeRequest('first'))
    await vi.advanceTimersByTimeAsync(PreviewService.DEBOUNCE_MS)
    expect(processMock).toHaveBeenCalledTimes(1)
    expect(service.isRunning).toBe(true)

    const second = service.schedule(makeRequest('second'))
    first.cancel()
    await vi.advanceTimersByTimeAsync(PreviewService.DEBOUNCE_MS)

    // The in-flight job's cancel handle was invoked (by the service and/or
    // the consumer cancelling its superseded handle — both are valid).
    expect(cancels[0]).toHaveBeenCalled()
    expect(processMock).toHaveBeenCalledTimes(2)
    await second.promise
    expect(service.isRunning).toBe(false)
  })

  it('cancelPending cancels the debounce timer and the active job', async () => {
    const cancel = vi.fn()
    processMock.mockReturnValue({ promise: new Promise(() => {}), cancel })
    const service = new PreviewService()

    service.schedule(makeRequest())
    await vi.advanceTimersByTimeAsync(PreviewService.DEBOUNCE_MS)
    expect(service.isRunning).toBe(true)

    service.cancelPending()
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(service.isRunning).toBe(false)
  })

  it('clamps oversized resize targets for previews', async () => {
    processMock.mockReturnValue({ promise: Promise.resolve(makeResult()), cancel: vi.fn() })
    const service = new PreviewService()

    const request = makeRequest()
    request.settings.resize = {
      width: 8000,
      height: 4000,
      maintainAspectRatio: true,
      allowUpscale: false,
    }
    const handle = service.schedule(request)
    await vi.advanceTimersByTimeAsync(PreviewService.DEBOUNCE_MS)

    const input = processMock.mock.calls[0]![0]
    expect(input.resize.width).toBe(1600)
    expect(input.resize.height).toBe(800)
    await handle.promise
  })

  it('keeps small resize targets untouched', async () => {
    processMock.mockReturnValue({ promise: Promise.resolve(makeResult()), cancel: vi.fn() })
    const service = new PreviewService()

    const request = makeRequest()
    request.settings.resize = {
      width: 400,
      height: undefined,
      maintainAspectRatio: true,
      allowUpscale: false,
    }
    const handle = service.schedule(request)
    await vi.advanceTimersByTimeAsync(PreviewService.DEBOUNCE_MS)

    const input = processMock.mock.calls[0]![0]
    expect(input.resize.width).toBe(400)
    await handle.promise
  })

  it('propagates worker errors', async () => {
    // The mock's promise rejects before the service's debounce timer fires;
    // the always-fulfilling bridge mirrors the service's forwarding branch so
    // the raw mock promise is never left unobserved (happy-dom lacks Node's
    // unhandled-rejection grace period).
    processMock.mockImplementation(() => {
      const promise = new Promise<ImageProcessResult>((_, reject) =>
        queueMicrotask(() => reject(new Error('decode failed'))),
      )
      void promise.then(
        () => {},
        () => {},
      )
      return { promise, cancel: vi.fn() }
    })
    const service = new PreviewService()

    const handle = service.schedule(makeRequest())
    const assertion = expect(handle.promise).rejects.toThrow('decode failed')
    await vi.advanceTimersByTimeAsync(PreviewService.DEBOUNCE_MS)
    await assertion
  })

  it('propagates TaskCancelledError for cancelled in-flight jobs', async () => {
    processMock.mockImplementation(() => {
      const promise = new Promise<ImageProcessResult>((_, reject) =>
        queueMicrotask(() => reject(new TaskCancelledError())),
      )
      void promise.then(
        () => {},
        () => {},
      )
      return { promise, cancel: vi.fn() }
    })
    const service = new PreviewService()

    const handle = service.schedule(makeRequest())
    const assertion = expect(handle.promise).rejects.toBeInstanceOf(TaskCancelledError)
    await vi.advanceTimersByTimeAsync(PreviewService.DEBOUNCE_MS)
    await assertion
  })
})
