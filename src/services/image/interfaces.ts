import type { EncodeOptions, OutputFormat, ResizeOptions } from '@/types/image'

import type { ProcessCanvas } from './canvas'

/**
 * Sources an encoder can draw from. Works on the main thread
 * (HTMLCanvasElement) and inside workers (OffscreenCanvas, ImageBitmap).
 */
export type CanvasImageSourceLike =
  ImageBitmap | ImageData | HTMLCanvasElement | OffscreenCanvas | ProcessCanvas

/**
 * Encoder adapter interface (ARCHITECTURE.md §7).
 * Implementations must not import Vue.
 */
export interface ImageEncoder {
  supports(format: OutputFormat): boolean

  encode(source: CanvasImageSourceLike, options: EncodeOptions): Promise<Blob>
}

/**
 * Resizer interface (ARCHITECTURE.md §8).
 */
export interface ImageResizer {
  resize(source: ImageBitmap, options: ResizeOptions): Promise<ProcessCanvas>
}
