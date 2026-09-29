import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ImageWorkerClient, TaskCancelledError } from '@/services/image/workerClient'
import type { ImageProcessResult } from '@/types/image'
import type { WorkerRequest, WorkerResponse } from '@/types/worker'

/** Minimal Worker stand-in driven manually by the test. */
class MockWorker {
  static instances: MockWorker[] = []

  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  readonly posted: WorkerRequest[] = []
  terminated = false

  constructor() {
    MockWorker.instances.push(this)
  }

  postMessage(message: WorkerRequest): void {
    this.posted.push(message)
  }

  terminate(): void {
    this.terminated = true
  }

  emit(message: WorkerResponse): void {
    this.onmessage?.({ data: message } as MessageEvent<WorkerResponse>)
  }
}

function makeResult(): ImageProcessResult {
  return {
    blob: new Blob(['x']),
    width: 100,
    height: 100,
    format: 'webp',
    size: 1,
    originalSize: 2,
    compressionRatio: 0.5,
    processingTime: 1,
  }
}

function makeInput(): Parameters<ImageWorkerClient['process']>[0] {
  return {
    file: new File(['x'], 'a.jpg', { type: 'image/jpeg' }),
    resize: { maintainAspectRatio: true, allowUpscale: false },
    output: { format: 'webp', quality: 80 },
    metadata: { preserveExif: false },
  }
}

describe('ImageWorkerClient', () => {
  beforeEach(() => {
    MockWorker.instances = []
    vi.stubGlobal('Worker', MockWorker)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates the worker lazily and reuses it', () => {
    const client = new ImageWorkerClient()
    expect(MockWorker.instances).toHaveLength(0)

    client.process(makeInput(), 't1')
    client.process(makeInput(), 't2')
    expect(MockWorker.instances).toHaveLength(1)
    client.dispose()
  })

  it('posts a typed process request', () => {
    const client = new ImageWorkerClient()
    client.process(makeInput(), 'task-1')

    const worker = MockWorker.instances[0]!
    expect(worker.posted[0]).toEqual({
      type: 'process',
      taskId: 'task-1',
      payload: makeInput(),
    })
    client.dispose()
  })

  it('resolves with the result on success', async () => {
    const client = new ImageWorkerClient()
    const handle = client.process(makeInput(), 'task-1')
    const result = makeResult()

    MockWorker.instances[0]!.emit({ type: 'success', taskId: 'task-1', result })
    await expect(handle.promise).resolves.toBe(result)
    client.dispose()
  })

  it('forwards progress events to the callback', async () => {
    const client = new ImageWorkerClient()
    const progresses: number[] = []
    const handle = client.process(makeInput(), 'task-1', {
      onProgress: (p) => progresses.push(p),
    })

    const worker = MockWorker.instances[0]!
    worker.emit({ type: 'progress', taskId: 'task-1', progress: 0.4 })
    worker.emit({ type: 'progress', taskId: 'task-1', progress: 0.8 })
    worker.emit({ type: 'success', taskId: 'task-1', result: makeResult() })

    await handle.promise
    expect(progresses).toEqual([0.4, 0.8])
    client.dispose()
  })

  it('rejects with the worker error message', async () => {
    const client = new ImageWorkerClient()
    const handle = client.process(makeInput(), 'task-1')

    MockWorker.instances[0]!.emit({ type: 'error', taskId: 'task-1', error: 'decode failed' })
    await expect(handle.promise).rejects.toThrow('decode failed')
    client.dispose()
  })

  it('cancel sends a cancel message and rejects with TaskCancelledError', async () => {
    const client = new ImageWorkerClient()
    const handle = client.process(makeInput(), 'task-1')

    handle.cancel()
    const worker = MockWorker.instances[0]!
    expect(worker.posted[1]).toEqual({ type: 'cancel', taskId: 'task-1' })

    worker.emit({ type: 'cancelled', taskId: 'task-1' })
    await expect(handle.promise).rejects.toBeInstanceOf(TaskCancelledError)
    client.dispose()
  })

  it('cancel is a no-op for unknown or finished tasks', async () => {
    const client = new ImageWorkerClient()
    const handle = client.process(makeInput(), 'task-1')
    const worker = MockWorker.instances[0]!

    worker.emit({ type: 'success', taskId: 'task-1', result: makeResult() })
    await handle.promise

    handle.cancel()
    // Only the process message was posted — no cancel for a finished task.
    expect(worker.posted).toHaveLength(1)
    client.dispose()
  })

  it('dispose terminates the worker and rejects pending tasks', async () => {
    const client = new ImageWorkerClient()
    const handle = client.process(makeInput(), 'task-1')
    const worker = MockWorker.instances[0]!

    client.dispose()
    expect(worker.terminated).toBe(true)
    await expect(handle.promise).rejects.toBeInstanceOf(TaskCancelledError)
  })

  it('ignores messages for unknown task ids', async () => {
    const client = new ImageWorkerClient()
    const handle = client.process(makeInput(), 'task-1')
    const worker = MockWorker.instances[0]!

    worker.emit({ type: 'error', taskId: 'ghost', error: 'nope' })
    worker.emit({ type: 'success', taskId: 'task-1', result: makeResult() })
    await expect(handle.promise).resolves.toBeTruthy()
    client.dispose()
  })
})
