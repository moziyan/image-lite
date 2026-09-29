import type { ImageResizer } from '@/services/image/interfaces'
import type { ResizeOptions } from '@/types/image'

import { calculateTargetDimensions } from './resizeCalculator'

/**
 * Canvas-based ImageResizer (ARCHITECTURE.md §8).
 *
 * The returned canvas is owned by the caller. The input bitmap is not closed
 * by this function — ownership stays with the caller.
 */
export class CanvasImageResizer implements ImageResizer {
  async resize(source: ImageBitmap, options: ResizeOptions): Promise<HTMLCanvasElement> {
    const { width, height } = calculateTargetDimensions(
      { width: source.width, height: source.height },
      options,
    )

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to acquire 2D canvas context')
    }

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source, 0, 0, width, height)

    return canvas
  }
}
