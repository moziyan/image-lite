import { OUTPUT_FORMAT_MIME_TYPES } from '@/constants/formats'
import type { EncodeOptions, OutputFormat } from '@/types/image'

import { ImageError } from './errors'
import type { ImageEncoder } from './interfaces'

/** Clamp a 0–100 UI quality value to the 0–1 range expected by canvas APIs. */
export function normalizeQuality(quality: number | undefined, fallback: number): number {
  if (quality === undefined || !Number.isFinite(quality)) {
    return fallback
  }
  return Math.min(1, Math.max(0, quality / 100))
}

function toCanvas(source: ImageBitmap | ImageData | HTMLCanvasElement): {
  canvas: HTMLCanvasElement
  width: number
  height: number
} {
  if (source instanceof HTMLCanvasElement) {
    return { canvas: source, width: source.width, height: source.height }
  }

  const width = source.width
  const height = source.height
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new ImageError('ENCODE_FAILED', 'Failed to acquire 2D canvas context for encoding.')
  }
  if (source instanceof ImageBitmap) {
    ctx.drawImage(source, 0, 0)
  } else {
    ctx.putImageData(source, 0, 0)
  }
  return { canvas, width, height }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(
            new ImageError(
              'ENCODE_FAILED',
              `Encoding to ${mimeType} is not supported by this browser.`,
            ),
          )
        }
      },
      mimeType,
      quality,
    )
  })
}

abstract class CanvasEncoder implements ImageEncoder {
  abstract readonly format: OutputFormat

  supports(format: OutputFormat): boolean {
    return format === this.format
  }

  abstract encode(
    source: ImageBitmap | ImageData | HTMLCanvasElement,
    options: EncodeOptions,
  ): Promise<Blob>
}

export class JpegEncoder extends CanvasEncoder {
  readonly format = 'jpeg' as const
  static readonly DEFAULT_QUALITY = 0.85

  async encode(
    source: ImageBitmap | ImageData | HTMLCanvasElement,
    options: EncodeOptions,
  ): Promise<Blob> {
    const { canvas } = toCanvas(source)
    return canvasToBlob(
      canvas,
      OUTPUT_FORMAT_MIME_TYPES.jpeg,
      normalizeQuality(options.quality, JpegEncoder.DEFAULT_QUALITY),
    )
  }
}

export class WebpEncoder extends CanvasEncoder {
  readonly format = 'webp' as const
  static readonly DEFAULT_QUALITY = 0.85

  async encode(
    source: ImageBitmap | ImageData | HTMLCanvasElement,
    options: EncodeOptions,
  ): Promise<Blob> {
    const { canvas } = toCanvas(source)
    return canvasToBlob(
      canvas,
      OUTPUT_FORMAT_MIME_TYPES.webp,
      normalizeQuality(options.quality, WebpEncoder.DEFAULT_QUALITY),
    )
  }
}

/**
 * PNG encoder.
 *
 * PNG is lossless: JPEG-style lossy quality semantics must not be applied
 * (PRODUCT.md §10). The quality option is intentionally ignored.
 */
export class PngEncoder extends CanvasEncoder {
  readonly format = 'png' as const

  // The options argument is intentionally unused: PNG is lossless and must
  // not apply JPEG-style quality semantics (PRODUCT.md §10).
  async encode(
    source: ImageBitmap | ImageData | HTMLCanvasElement,
    options: EncodeOptions,
  ): Promise<Blob> {
    void options
    const { canvas } = toCanvas(source)
    return canvasToBlob(canvas, OUTPUT_FORMAT_MIME_TYPES.png)
  }
}
