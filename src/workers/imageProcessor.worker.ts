/// <reference lib="webworker" />
/**
 * Image processing worker.
 *
 * Receives typed WorkerRequest messages, runs the image pipeline off the
 * main thread, and replies with typed WorkerResponse messages.
 * Cancellation is cooperative: flags are checked between pipeline stages.
 */

import { createProcessCanvas, type ProcessCanvas } from '@/services/image/canvas'
import { decodeImage } from '@/services/image/decoder'
import { defaultEncoderRegistry } from '@/services/image/encoderRegistry'
import { toImageError } from '@/services/image/errors'
import { CanvasImageResizer } from '@/services/image/resizer'
import { searchTargetSize } from '@/services/image/targetSize'
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
    let blob: Blob
    let width = canvas.width
    let height = canvas.height
    let targetInfo: ImageProcessResult['targetSize']

    if (payload.targetSize && payload.output.format !== 'png') {
      // Best-effort target-size search: quality binary search, then
      // dimension fallback (AGENT_PROMPTS §7.2). PNG is lossless — quality
      // search does not apply, so PNG skips target size entirely.
      const search = await searchTargetSize(
        payload.targetSize,
        canvas.width,
        canvas.height,
        async (candidate) => {
          throwIfCancelled(taskId)
          let source: ProcessCanvas = canvas
          if (candidate.scale !== 1) {
            source = createProcessCanvas(
              Math.max(1, Math.round(canvas.width * candidate.scale)),
              Math.max(1, Math.round(canvas.height * candidate.scale)),
            )
            const ctx = source.getContext()
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            ctx.drawImage(canvas.getCanvasSource(), 0, 0, source.width, source.height)
          }
          const encoded = await encoder.encode(source, {
            ...payload.output,
            quality: candidate.quality,
          })
          return { size: encoded.size, blob: encoded }
        },
      )
      blob = search.result.blob
      width = Math.max(1, Math.round(canvas.width * search.candidate.scale))
      height = Math.max(1, Math.round(canvas.height * search.candidate.scale))
      targetInfo = {
        metTarget: search.metTarget,
        attempts: search.attempts,
        quality: search.candidate.quality,
        note: search.note,
      }
      throwIfCancelled(taskId)
    } else {
      blob = await encoder.encode(canvas, payload.output)
      throwIfCancelled(taskId)
    }

    const result: ImageProcessResult = {
      blob,
      width,
      height,
      format: payload.output.format,
      size: blob.size,
      originalSize: payload.file.size,
      compressionRatio: payload.file.size > 0 ? blob.size / payload.file.size : 0,
      processingTime: performance.now() - startedAt,
      targetSize: targetInfo,
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
