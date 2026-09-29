import type { ImageProcessInput, ImageProcessResult } from '@/types/image'
import type { WorkerRequest, WorkerResponse } from '@/types/worker'

export interface ProcessTaskHandle {
  promise: Promise<ImageProcessResult>
  cancel: () => void
}

export interface ProcessCallbacks {
  onProgress?: (progress: number) => void
}

interface PendingTask {
  resolve: (result: ImageProcessResult) => void
  reject: (error: Error) => void
  onProgress?: (progress: number) => void
}

export class TaskCancelledError extends Error {
  constructor() {
    super('Processing was cancelled.')
    this.name = 'TaskCancelledError'
  }
}

/**
 * Typed main-thread client for the image processing worker.
 *
 * Owns a single Worker instance, dispatches typed requests, and routes
 * typed responses back to the per-task promise handlers.
 */
export class ImageWorkerClient {
  private worker: Worker | null = null
  private readonly pending = new Map<string, PendingTask>()

  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('@/workers/imageProcessor.worker.ts', import.meta.url), {
        type: 'module',
      })
      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        this.handleMessage(event.data)
      }
      this.worker.onerror = (event: ErrorEvent) => {
        this.failAll(new Error(event.message || 'Worker failed unexpectedly'))
      }
    }
    return this.worker
  }

  private handleMessage(message: WorkerResponse): void {
    const task = this.pending.get(message.taskId)
    if (!task) return

    switch (message.type) {
      case 'progress':
        task.onProgress?.(message.progress)
        break
      case 'success':
        this.pending.delete(message.taskId)
        task.resolve(message.result)
        break
      case 'error':
        this.pending.delete(message.taskId)
        task.reject(new Error(message.error))
        break
      case 'cancelled':
        this.pending.delete(message.taskId)
        task.reject(new TaskCancelledError())
        break
    }
  }

  private failAll(error: Error): void {
    for (const task of this.pending.values()) {
      task.reject(error)
    }
    this.pending.clear()
  }

  process(
    input: ImageProcessInput,
    taskId: string,
    callbacks?: ProcessCallbacks,
  ): ProcessTaskHandle {
    const worker = this.ensureWorker()

    const promise = new Promise<ImageProcessResult>((resolve, reject) => {
      this.pending.set(taskId, { resolve, reject, onProgress: callbacks?.onProgress })
    })
    // Attach a no-op rejection handler immediately so a task that rejects
    // before the caller awaits does not surface as an unhandled rejection.
    promise.catch(() => {})

    const request: WorkerRequest = { type: 'process', taskId, payload: input }
    worker.postMessage(request)

    return {
      promise,
      cancel: () => {
        if (!this.pending.has(taskId)) return
        const request: WorkerRequest = { type: 'cancel', taskId }
        this.worker?.postMessage(request)
      },
    }
  }

  /** Terminate the worker and reject all outstanding tasks. */
  dispose(): void {
    this.failAll(new TaskCancelledError())
    this.worker?.terminate()
    this.worker = null
  }
}

export const imageWorkerClient = new ImageWorkerClient()
