import type { ImageProcessInput, ImageProcessResult } from '@/types/image'

import { decodeImage } from './decoder'
import { defaultEncoderRegistry, type EncoderRegistry } from './encoderRegistry'
import { toImageError } from './errors'
import type { ImageResizer } from './interfaces'
import { CanvasImageResizer } from './resizer'
import { validateImageFile } from './validation'

/**
 * Image processing pipeline (ARCHITECTURE.md §6):
 * File -> validate -> decode -> resize -> encode -> statistics.
 *
 * Framework-independent: no Vue imports. All ImageBitmap resources created
 * here are released before returning.
 */
export class ImageProcessor {
  constructor(
    private readonly resizer: ImageResizer = new CanvasImageResizer(),
    private readonly encoders: EncoderRegistry = defaultEncoderRegistry,
  ) {}

  async process(input: ImageProcessInput): Promise<ImageProcessResult> {
    const startedAt = performance.now()

    const validation = validateImageFile(input.file)
    if (!validation.ok) {
      throw toImageError(new Error(validation.error.message), validation.error.code)
    }

    let bitmap: ImageBitmap | null = null
    try {
      const decoded = await decodeImage(input.file)
      bitmap = decoded.bitmap

      const canvas = await this.resizer.resize(bitmap, input.resize)
      // The bitmap has been drawn to the canvas; release it promptly.
      bitmap.close()
      bitmap = null

      const encoder = this.encoders.resolve(input.output.format)
      const blob = await encoder.encode(canvas, input.output)

      const processingTime = performance.now() - startedAt
      return {
        blob,
        width: canvas.width,
        height: canvas.height,
        format: input.output.format,
        size: blob.size,
        originalSize: input.file.size,
        compressionRatio: input.file.size > 0 ? blob.size / input.file.size : 0,
        processingTime,
      }
    } catch (error) {
      throw toImageError(error)
    } finally {
      if (bitmap) {
        bitmap.close()
      }
    }
  }
}

export const imageProcessor = new ImageProcessor()
