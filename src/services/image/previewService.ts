import { imageWorkerClient, TaskCancelledError } from '@/services/image/workerClient'
import type { EncodeOptions, ImageProcessResult, ResizeOptions } from '@/types/image'

/** Cap preview decode dimensions — previews never need full-resolution pixels. */
const PREVIEW_MAX_DIMENSION = 1600

export interface PreviewSettings {
  resize: ResizeOptions
  output: EncodeOptions
}

export interface PreviewHandle {
  promise: Promise<ImageProcessResult>
  cancel: () => void
}

export interface PreviewRequest {
  /** Unique per preview generation — used as the worker task id. */
  id: string
  file: File
  settings: PreviewSettings
}

/**
 * Debounced, single-flight preview runner.
 *
 * - `schedule()` debounces rapid setting changes (~200ms)
 * - only one preview job is ever in flight; a new schedule cancels the
 *   previous pending/in-flight job so preview jobs never accumulate
 * - preview decode is capped at PREVIEW_MAX_DIMENSION to save memory;
 *   production output is only generated on explicit processing
 */
export class PreviewService {
  /** Debounce window in ms (spec: 150–300ms). */
  static readonly DEBOUNCE_MS = 200

  private timer: ReturnType<typeof setTimeout> | null = null
  private active: { id: string; cancel: () => void } | null = null

  /** True while a preview job is running. */
  get isRunning(): boolean {
    return this.active !== null
  }

  schedule(request: PreviewRequest): PreviewHandle {
    this.cancelPending()

    let cancelCurrent: (() => void) | null = null
    let cancelled = false

    const promise = new Promise<ImageProcessResult>((resolve, reject) => {
      this.timer = setTimeout(() => {
        this.timer = null
        if (cancelled) return

        const clamped = this.clampResize(request.settings.resize)
        const handle = imageWorkerClient.process(
          {
            file: request.file,
            resize: clamped,
            output: { ...request.settings.output },
            metadata: { preserveExif: false },
          },
          `preview-${request.id}`,
        )
        this.active = { id: request.id, cancel: handle.cancel }
        cancelCurrent = handle.cancel

        // This derived promise always fulfills (outcome is forwarded via the
        // resolve/reject calls), so no derived rejection can ever surface as
        // an unhandled rejection while awaiting the debounce timer.
        void handle.promise.then(
          (result) => {
            this.clearActive(request.id)
            resolve(result)
          },
          (error) => {
            this.clearActive(request.id)
            reject(error instanceof Error ? error : new Error(String(error)))
          },
        )
      }, PreviewService.DEBOUNCE_MS)
    })

    return {
      promise,
      cancel: () => {
        cancelled = true
        cancelCurrent?.()
      },
    }
  }

  /** Cancel any pending timer and in-flight preview job. */
  cancelPending(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.active?.cancel()
    this.active = null
  }

  private clearActive(id: string): void {
    if (this.active?.id === id) {
      this.active = null
    }
  }

  /**
   * Clamp resize targets so the worker never decodes more than
   * PREVIEW_MAX_DIMENSION on either axis for previews. Aspect ratio is
   * preserved; explicit resize intent is scaled down proportionally.
   */
  private clampResize(resize: ResizeOptions): ResizeOptions {
    const width = resize.width ?? null
    const height = resize.height ?? null
    const largest = Math.max(width ?? 0, height ?? 0)
    if (largest === 0 || largest <= PREVIEW_MAX_DIMENSION) {
      return { ...resize, allowUpscale: resize.allowUpscale }
    }
    const scale = PREVIEW_MAX_DIMENSION / largest
    return {
      ...resize,
      width: width !== null ? Math.max(1, Math.round(width * scale)) : undefined,
      height: height !== null ? Math.max(1, Math.round(height * scale)) : undefined,
      // The clamp itself must never be blocked by the no-upscale rule.
      allowUpscale: true,
    }
  }
}

export const previewService = new PreviewService()

export { TaskCancelledError }
