import { OUTPUT_FORMAT_MIME_TYPES } from '@/constants/formats'
import type { EncodeOptions, OutputFormat } from '@/types/image'

import { createProcessCanvas, type ProcessCanvas } from './canvas'
import { ImageError } from './errors'
import type { CanvasImageSourceLike, ImageEncoder } from './interfaces'

/** Clamp a 0–100 UI quality value to the 0–1 range expected by canvas APIs. */
export function normalizeQuality(quality: number | undefined, fallback: number): number {
  if (quality === undefined || !Number.isFinite(quality)) {
    return fallback
  }
  return Math.min(1, Math.max(0, quality / 100))
}

function isProcessCanvas(source: CanvasImageSourceLike): source is ProcessCanvas {
  // A ProcessCanvas is our own wrapper: its getContext takes no arguments,
  // unlike HTMLCanvasElement.getContext(contextId, options).
  return (
    typeof source === 'object' &&
    source !== null &&
    'toBlob' in source &&
    typeof (source as ProcessCanvas).toBlob === 'function' &&
    'getContext' in source &&
    typeof (source as ProcessCanvas).getContext === 'function' &&
    (source as ProcessCanvas).getContext.length === 0
  )
}

function isImageData(source: CanvasImageSourceLike): source is ImageData {
  return 'data' in source && source.data instanceof Uint8ClampedArray
}

function toProcessCanvas(source: CanvasImageSourceLike): ProcessCanvas {
  if (isProcessCanvas(source)) {
    return source
  }

  const width = source.width
  const height = source.height
  const canvas = createProcessCanvas(width, height)
  const ctx = canvas.getContext()

  if (isImageData(source)) {
    ctx.putImageData(source, 0, 0)
  } else {
    ctx.drawImage(source as CanvasImageSource & ImageBitmap, 0, 0)
  }
  return canvas
}

async function encodeCanvas(
  source: CanvasImageSourceLike,
  mimeType: string,
  quality?: number,
): Promise<Blob> {
  try {
    const canvas = toProcessCanvas(source)
    return await canvas.toBlob(mimeType, quality)
  } catch (cause) {
    if (cause instanceof ImageError) throw cause
    throw new ImageError(
      'ENCODE_FAILED',
      `Encoding to ${mimeType} is not supported by this browser.`,
      cause instanceof Error ? cause.message : String(cause),
    )
  }
}

abstract class CanvasEncoder implements ImageEncoder {
  abstract readonly format: OutputFormat

  supports(format: OutputFormat): boolean {
    return format === this.format
  }

  abstract encode(source: CanvasImageSourceLike, options: EncodeOptions): Promise<Blob>
}

export class JpegEncoder extends CanvasEncoder {
  readonly format = 'jpeg' as const
  static readonly DEFAULT_QUALITY = 0.85

  async encode(source: CanvasImageSourceLike, options: EncodeOptions): Promise<Blob> {
    return encodeCanvas(
      source,
      OUTPUT_FORMAT_MIME_TYPES.jpeg,
      normalizeQuality(options.quality, JpegEncoder.DEFAULT_QUALITY),
    )
  }
}

export class WebpEncoder extends CanvasEncoder {
  readonly format = 'webp' as const
  static readonly DEFAULT_QUALITY = 0.85

  async encode(source: CanvasImageSourceLike, options: EncodeOptions): Promise<Blob> {
    return encodeCanvas(
      source,
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

  async encode(source: CanvasImageSourceLike, options: EncodeOptions): Promise<Blob> {
    void options
    return encodeCanvas(source, OUTPUT_FORMAT_MIME_TYPES.png)
  }
}
