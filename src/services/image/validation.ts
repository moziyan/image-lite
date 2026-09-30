import { LIMITS } from '@/config/limits'
import { ACCEPTED_INPUT_MIME_TYPES } from '@/constants/formats'
import type { ImageErrorCode } from '@/types/image'

export interface FileValidationError {
  code: ImageErrorCode
  fileName: string
  /** English fallback, replaced by localized text at display time. */
  message: string
  /** Template params for localized rendering (e.g. max size in MB). */
  params?: Record<string, string | number>
}

export type FileValidationResult =
  { ok: true; file: File } | { ok: false; error: FileValidationError }

export function isSupportedImageType(mimeType: string): boolean {
  return ACCEPTED_INPUT_MIME_TYPES.includes(mimeType)
}

/**
 * Validate a single file against input type and size limits.
 * Pixel-count validation requires decoding and happens later in the pipeline.
 */
export function validateImageFile(file: File): FileValidationResult {
  if (!isSupportedImageType(file.type)) {
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_FORMAT',
        fileName: file.name,
        message: `"${file.name}" is not a supported format. Accepted: JPEG, PNG, WebP.`,
        params: { name: file.name },
      },
    }
  }
  if (file.size > LIMITS.MAX_FILE_SIZE) {
    const maxMB = Math.round(LIMITS.MAX_FILE_SIZE / 1024 / 1024)
    return {
      ok: false,
      error: {
        code: 'FILE_TOO_LARGE',
        fileName: file.name,
        message: `"${file.name}" exceeds the maximum file size of ${maxMB} MB.`,
        params: { name: file.name, maxSize: maxMB },
      },
    }
  }
  return { ok: true, file }
}

export interface BatchValidationResult {
  accepted: File[]
  rejected: FileValidationError[]
}

/**
 * Validate a list of files, enforcing the batch size limit.
 * Files beyond the batch limit are rejected.
 */
export function validateImageFiles(files: readonly File[]): BatchValidationResult {
  const accepted: File[] = []
  const rejected: FileValidationError[] = []

  for (const file of files) {
    if (accepted.length >= LIMITS.MAX_BATCH_SIZE) {
      rejected.push({
        code: 'BATCH_LIMIT',
        fileName: file.name,
        message: `"${file.name}" was skipped: batch size limit of ${LIMITS.MAX_BATCH_SIZE} images reached.`,
        params: { name: file.name, max: LIMITS.MAX_BATCH_SIZE },
      })
      continue
    }
    const result = validateImageFile(file)
    if (result.ok) {
      accepted.push(result.file)
    } else {
      rejected.push(result.error)
    }
  }

  return { accepted, rejected }
}
