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

/** Target-size configuration (serializable mirror of TargetSizeOptions). */
export interface TargetSizeInput {
  targetBytes: number
  allowResize: boolean
  minimumQuality: number
  minWidth: number
  minHeight: number
}

export interface ImageProcessInput {
  file: File
  resize: ResizeOptions
  output: EncodeOptions
  metadata: {
    preserveExif: boolean
  }
  /** When set, the pipeline runs a best-effort search to fit this size. */
  targetSize?: TargetSizeInput
}

export interface ImageProcessResult {
  blob: Blob
  width: number
  height: number
  format: OutputFormat
  size: number
  originalSize: number
  /** Original (decoded) dimensions, after EXIF orientation normalization. */
  originalWidth: number
  originalHeight: number
  compressionRatio: number
  processingTime: number
  /** Present when a target-size search ran. */
  targetSize?: {
    metTarget: boolean
    attempts: number
    quality?: number
    note?: string
  }
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
