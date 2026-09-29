import type { EncodeOptions, OutputFormat, ResizeOptions } from '@/types/image'

/**
 * Encoder adapter interface (ARCHITECTURE.md §7).
 * Implementations must not import Vue.
 */
export interface ImageEncoder {
  supports(format: OutputFormat): boolean

  encode(source: ImageBitmap | ImageData | HTMLCanvasElement, options: EncodeOptions): Promise<Blob>
}

/**
 * Resizer interface (ARCHITECTURE.md §8).
 */
export interface ImageResizer {
  resize(source: ImageBitmap, options: ResizeOptions): Promise<HTMLCanvasElement>
}
