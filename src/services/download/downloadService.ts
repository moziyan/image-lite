import { OUTPUT_FORMAT_EXTENSIONS } from '@/constants/formats'
import type { OutputFormat } from '@/types/image'

/**
 * Build a safe output filename:
 * - preserve the original base name
 * - strip the original image extension
 * - append `-compressed` and the correct extension for the output format
 * - remove path separators and control characters
 */
export function buildOutputFileName(originalName: string, format: OutputFormat): string {
  const extension = OUTPUT_FORMAT_EXTENSIONS[format]

  const safeName = originalName
    .replace(/[\\/]/g, '_') // path separators

    .replace(/[\x00-\x1f\x7f]/g, '') // control characters
    .trim()

  const base = safeName.replace(/\.(jpe?g|png|webp|avif|gif|bmp|tiff?|svg)$/i, '') || 'image'

  return `${base}-compressed.${extension}`
}

/**
 * Trigger a browser download for a Blob. The temporary object URL is revoked
 * after the download is initiated.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  } finally {
    // Defer revocation so the browser has time to start the download.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
