import type { ImageErrorCode } from '@/types/image'

/**
 * Domain error for image operations.
 * UI gets a safe user-facing message plus optional developer details.
 * See ARCHITECTURE.md §17.
 */
export class ImageError extends Error {
  readonly code: ImageErrorCode
  readonly detail?: string
  /** Template params for localized rendering (e.g. file name). */
  readonly params?: Record<string, string | number>

  constructor(
    code: ImageErrorCode,
    message: string,
    detail?: string,
    params?: Record<string, string | number>,
  ) {
    super(message)
    this.name = 'ImageError'
    this.code = code
    this.detail = detail
    this.params = params
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
