import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LIMITS } from '@/config/limits'
import { TaskCancelledError } from '@/services/image/workerClient'
import { useImageQueueStore } from '@/stores/imageQueue'

// The worker client is mocked: unit tests must not spawn real workers.
vi.mock('@/services/image/workerClient', async () => {
  class TaskCancelledError extends Error {
    constructor() {
      super('Processing was cancelled.')
      this.name = 'TaskCancelledError'
    }
  }
  const process = vi.fn()
  return {
    imageWorkerClient: { process, dispose: vi.fn() },
    TaskCancelledError,
  }
})

import { imageWorkerClient } from '@/services/image/workerClient'

function makeFile(name: string, type: string, size = 1024): File {
  return new File([new Uint8Array(size)], name, { type })
}

const processMock = vi.mocked(imageWorkerClient.process)

function settings() {
  return {
    resize: { maintainAspectRatio: true, allowUpscale: false },
    output: { format: 'webp' as const, quality: 80 },
  }
}

describe('imageQueue store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('starts empty', () => {
    const store = useImageQueueStore()
    expect(store.isEmpty).toBe(true)
    expect(store.count).toBe(0)
    expect(store.selectedItem).toBeNull()
  })

  it('adds valid files and selects the first one', () => {
    const store = useImageQueueStore()
    const rejected = store.addFiles([
      makeFile('a.jpg', 'image/jpeg'),
      makeFile('b.png', 'image/png'),
    ])
    expect(rejected).toHaveLength(0)
    expect(store.count).toBe(2)
    expect(store.selectedId).toBe(store.items[0]?.id)
    expect(store.items[0]?.status).toBe('pending')
    expect(store.items[0]?.previewUrl).toMatch(/^blob:/)
  })

  it('rejects invalid files without adding them', () => {
    const store = useImageQueueStore()
    const rejected = store.addFiles([makeFile('anim.gif', 'image/gif')])
    expect(rejected).toHaveLength(1)
    expect(rejected[0]?.code).toBe('UNSUPPORTED_FORMAT')
    expect(store.isEmpty).toBe(true)
    expect(store.lastRejected).toHaveLength(1)
  })

  it('removes an item and revokes its object URL', () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL')
    const store = useImageQueueStore()
    store.addFiles([makeFile('a.jpg', 'image/jpeg'), makeFile('b.png', 'image/png')])
    const firstId = store.items[0]!.id
    const firstUrl = store.items[0]!.previewUrl

    store.removeItem(firstId)
    expect(store.count).toBe(1)
    expect(revokeSpy).toHaveBeenCalledWith(firstUrl)
    // selection falls back to the remaining item
    expect(store.selectedId).toBe(store.items[0]?.id)
  })

  it('clearAll revokes every object URL and resets selection', () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL')
    const store = useImageQueueStore()
    store.addFiles([makeFile('a.jpg', 'image/jpeg'), makeFile('b.png', 'image/png')])
    const urls = store.items.map((item) => item.previewUrl)

    store.clearAll()
    expect(store.isEmpty).toBe(true)
    expect(store.selectedId).toBeNull()
    for (const url of urls) {
      expect(revokeSpy).toHaveBeenCalledWith(url)
    }
  })

  it('selectItem only selects existing items', () => {
    const store = useImageQueueStore()
    store.addFiles([makeFile('a.jpg', 'image/jpeg')])
    const id = store.items[0]!.id

    store.selectItem('nonexistent')
    expect(store.selectedId).toBe(id)

    store.addFiles([makeFile('b.png', 'image/png')])
    const secondId = store.items[1]!.id
    store.selectItem(secondId)
    expect(store.selectedId).toBe(secondId)
  })

  it('respects the batch size limit', () => {
    const store = useImageQueueStore()
    const files = Array.from({ length: LIMITS.MAX_BATCH_SIZE + 5 }, (_, i) =>
      makeFile(`img-${i}.jpg`, 'image/jpeg'),
    )
    const rejected = store.addFiles(files)
    expect(store.count).toBe(LIMITS.MAX_BATCH_SIZE)
    expect(rejected).toHaveLength(5)
  })

  describe('processing', () => {
    function successHandle() {
      return {
        promise: Promise.resolve({
          blob: new Blob(['x'], { type: 'image/webp' }),
          width: 100,
          height: 100,
          format: 'webp' as const,
          size: 1,
          originalSize: 1024,
          compressionRatio: 0.001,
          processingTime: 5,
        }),
        cancel: vi.fn(),
      }
    }

    it('processItem transitions to completed with a result URL', async () => {
      processMock.mockReturnValue(successHandle())
      const store = useImageQueueStore()
      store.addFiles([makeFile('a.jpg', 'image/jpeg')])
      const id = store.items[0]!.id

      await store.processItem(id, settings())

      const item = store.items[0]!
      expect(item.status).toBe('completed')
      expect(item.result).toBeTruthy()
      expect(item.resultUrl).toMatch(/^blob:/)
      expect(item.progress).toBe(1)
      expect(processMock).toHaveBeenCalledWith(
        expect.objectContaining({ file: item.file }),
        id,
        expect.objectContaining({ onProgress: expect.any(Function) }),
      )
    })

    it('processItem transitions to error on failure', async () => {
      processMock.mockReturnValue({
        promise: Promise.reject(new Error('decode failed')),
        cancel: vi.fn(),
      })
      const store = useImageQueueStore()
      store.addFiles([makeFile('a.jpg', 'image/jpeg')])

      await store.processItem(store.items[0]!.id, settings())

      expect(store.items[0]!.status).toBe('error')
      expect(store.items[0]!.error).toBe('decode failed')
    })

    it('processItem transitions to cancelled on TaskCancelledError', async () => {
      processMock.mockReturnValue({
        promise: Promise.reject(new TaskCancelledError()),
        cancel: vi.fn(),
      })
      const store = useImageQueueStore()
      store.addFiles([makeFile('a.jpg', 'image/jpeg')])

      await store.processItem(store.items[0]!.id, settings())

      expect(store.items[0]!.status).toBe('cancelled')
      expect(store.items[0]!.error).toBeNull()
    })

    it('cancelItem invokes the active cancel handle', async () => {
      let rejectPromise!: (error: Error) => void
      let cancel!: ReturnType<typeof vi.fn>
      processMock.mockImplementation(() => {
        cancel = vi.fn(() => {
          // The real worker answers cancel asynchronously.
          queueMicrotask(() => rejectPromise(new TaskCancelledError()))
        })
        return {
          promise: new Promise((_, reject) => {
            rejectPromise = reject
          }),
          cancel,
        }
      })

      const store = useImageQueueStore()
      store.addFiles([makeFile('a.jpg', 'image/jpeg')])
      const id = store.items[0]!.id

      const processing = store.processItem(id, settings())
      await Promise.resolve() // let processItem reach the await
      store.cancelItem(id)
      await processing

      expect(cancel).toHaveBeenCalledTimes(1)
      expect(store.items[0]!.status).toBe('cancelled')
    })

    it('processAll processes pending items and clears isProcessing', async () => {
      processMock.mockImplementation(() => successHandle())
      const store = useImageQueueStore()
      store.addFiles([makeFile('a.jpg', 'image/jpeg'), makeFile('b.png', 'image/png')])

      await store.processAll(settings())

      expect(store.items.every((item) => item.status === 'completed')).toBe(true)
      expect(store.isProcessing).toBe(false)
    })

    it('removing an item mid-processing discards the late result', async () => {
      let resolvePromise!: (value: import('@/types/image').ImageProcessResult) => void
      processMock.mockImplementation(() => ({
        promise: new Promise<import('@/types/image').ImageProcessResult>((resolve) => {
          resolvePromise = resolve
        }),
        cancel: vi.fn(),
      }))

      const store = useImageQueueStore()
      store.addFiles([makeFile('a.jpg', 'image/jpeg')])
      const id = store.items[0]!.id

      const processing = store.processItem(id, settings())
      await Promise.resolve()
      store.removeItem(id)
      resolvePromise({
        blob: new Blob(['x']),
        width: 1,
        height: 1,
        format: 'webp',
        size: 1,
        originalSize: 1,
        compressionRatio: 1,
        processingTime: 1,
      })
      await processing

      expect(store.isEmpty).toBe(true)
    })
  })
})
