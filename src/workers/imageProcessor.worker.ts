/// <reference lib="webworker" />
/**
 * Image processing worker.
 *
 * Receives typed WorkerRequest messages, runs the image pipeline off the
 * main thread, and replies with typed WorkerResponse messages.
 * Cancellation is cooperative: flags are checked between pipeline stages.
 */

import { decodeImage } from '@/services/image/decoder'
import { defaultEncoderRegistry } from '@/services/image/encoderRegistry'
import { toImageError } from '@/services/image/errors'
import { CanvasImageResizer } from '@/services/image/resizer'
import { validateImageFile } from '@/services/image/validation'
import type { ImageProcessResult } from '@/types/image'
import type { WorkerRequest, WorkerResponse } from '@/types/worker'

const resizer = new CanvasImageResizer()

/** Task IDs that have been asked to cancel. */
const cancelledTasks = new Set<string>()

function post(response: WorkerResponse): void {
  self.postMessage(response)
}

function throwIfCancelled(taskId: string): void {
  if (cancelledTasks.has(taskId)) {
    throw new DOMException('The task was cancelled.', 'AbortError')
  }
}

async function processTask(
  taskId: string,
  payload: Extract<WorkerRequest, { type: 'process' }>['payload'],
): Promise<void> {
  const startedAt = performance.now()

  const validation = validateImageFile(payload.file)
  if (!validation.ok) {
    post({ type: 'error', taskId, error: validation.error.message })
    return
  }

  let bitmap: ImageBitmap | null = null
  try {
    post({ type: 'progress', taskId, progress: 0.1 })

    const decoded = await decodeImage(payload.file)
    bitmap = decoded.bitmap
    throwIfCancelled(taskId)
    post({ type: 'progress', taskId, progress: 0.4 })

    const canvas = await resizer.resize(bitmap, payload.resize)
    bitmap.close()
    bitmap = null
    throwIfCancelled(taskId)
    post({ type: 'progress', taskId, progress: 0.7 })

    const encoder = defaultEncoderRegistry.resolve(payload.output.format)
    const blob = await encoder.encode(canvas, payload.output)
    throwIfCancelled(taskId)

    const result: ImageProcessResult = {
      blob,
      width: canvas.width,
      height: canvas.height,
      format: payload.output.format,
      size: blob.size,
      originalSize: payload.file.size,
      compressionRatio: payload.file.size > 0 ? blob.size / payload.file.size : 0,
      processingTime: performance.now() - startedAt,
    }
    post({ type: 'success', taskId, result })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      post({ type: 'cancelled', taskId })
    } else {
      const imageError = toImageError(error)
      post({ type: 'error', taskId, error: imageError.message })
    }
  } finally {
    if (bitmap) {
      bitmap.close()
    }
    cancelledTasks.delete(taskId)
  }
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data
  if (message.type === 'process') {
    cancelledTasks.delete(message.taskId)
    void processTask(message.taskId, message.payload)
  } else if (message.type === 'cancel') {
    cancelledTasks.add(message.taskId)
  }
}
