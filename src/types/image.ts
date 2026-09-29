/**
 * Domain types for image processing.
 * See ARCHITECTURE.md §5.
 */

export type ImageStatus = 'pending' | 'processing' | 'completed' | 'error' | 'cancelled'

export type OutputFormat = 'jpeg' | 'png' | 'webp' | 'avif'

export interface ResizeOptions {
  width?: number
  height?: number
  maintainAspectRatio: boolean
  allowUpscale: boolean
}

export interface EncodeOptions {
  format: OutputFormat
  quality?: number
}

export interface ImageProcessInput {
  file: File
  resize: ResizeOptions
  output: EncodeOptions
  metadata: {
    preserveExif: boolean
  }
}

export interface ImageProcessResult {
  blob: Blob
  width: number
  height: number
  format: OutputFormat
  size: number
  originalSize: number
  compressionRatio: number
  processingTime: number
}

export type ImageErrorCode =
  | 'UNSUPPORTED_FORMAT'
  | 'INVALID_IMAGE'
  | 'FILE_TOO_LARGE'
  | 'PIXEL_LIMIT_EXCEEDED'
  | 'DECODE_FAILED'
  | 'ENCODE_FAILED'
  | 'OUT_OF_MEMORY'
  | 'CANCELLED'
  | 'UNKNOWN'
