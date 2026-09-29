import type { ResizeOptions } from '@/types/image'

import { createProcessCanvas, type ProcessCanvas } from './canvas'
import type { ImageResizer } from './interfaces'
import { calculateTargetDimensions } from './resizeCalculator'

/**
 * Canvas-based ImageResizer (ARCHITECTURE.md §8).
 * Works on the main thread and inside workers (OffscreenCanvas).
 *
 * The input bitmap is not closed by this function — ownership stays with
 * the caller.
 */
export class CanvasImageResizer implements ImageResizer {
  async resize(source: ImageBitmap, options: ResizeOptions): Promise<ProcessCanvas> {
    const { width, height } = calculateTargetDimensions(
      { width: source.width, height: source.height },
      options,
    )

    const canvas = createProcessCanvas(width, height)
    const ctx = canvas.getContext()

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source, 0, 0, width, height)

    return canvas
  }
}
