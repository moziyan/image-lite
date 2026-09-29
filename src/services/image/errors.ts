import type { ImageErrorCode } from '@/types/image'

/**
 * Domain error for image operations.
 * UI gets a safe user-facing message plus optional developer details.
 * See ARCHITECTURE.md §17.
 */
export class ImageError extends Error {
  readonly code: ImageErrorCode
  readonly detail?: string

  constructor(code: ImageErrorCode, message: string, detail?: string) {
    super(message)
    this.name = 'ImageError'
    this.code = code
    this.detail = detail
  }
}

export function toImageError(error: unknown, fallbackCode: ImageErrorCode = 'UNKNOWN'): ImageError {
  if (error instanceof ImageError) {
    return error
  }
  const message = error instanceof Error ? error.message : String(error)
  return new ImageError(
    fallbackCode,
    'An unexpected error occurred while processing the image.',
    message,
  )
}
