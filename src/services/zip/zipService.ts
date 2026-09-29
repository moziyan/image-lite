import { OUTPUT_FORMAT_EXTENSIONS } from '@/constants/formats'
import type { OutputFormat } from '@/types/image'

export interface ZipEntry {
  /** Suggested file name (will be sanitized and de-duplicated). */
  name: string
  blob: Blob
}

export class ZipError extends Error {
  constructor(
    readonly code: 'EMPTY' | 'BUILD_FAILED',
    message: string,
  ) {
    super(message)
    this.name = 'ZipError'
  }
}

const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

/**
 * Sanitize a name so it is safe inside a ZIP archive:
 * - strip path separators and control characters
 * - no leading dots/spaces, no trailing dots/spaces (Windows)
 * - avoid Windows reserved device names
 * - cap length
 */
export function sanitizeZipEntryName(name: string): string {
  let safe = name
    .replace(/[\\/]/g, '_')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim()

  safe = safe.replace(/^[.\s]+/, '').replace(/[.\s]+$/, '')

  const dotIndex = safe.lastIndexOf('.')
  const stem = dotIndex > 0 ? safe.slice(0, dotIndex) : safe
  if (WINDOWS_RESERVED_NAMES.test(stem)) {
    safe = `_${safe}`
  }

  if (safe.length > 120) {
    const ext = dotIndex > 0 ? safe.slice(dotIndex) : ''
    safe = safe.slice(0, 120 - ext.length) + ext
  }

  return safe || 'image'
}

/** De-duplicate entry names: `a.webp`, `a-2.webp`, `a-3.webp`, ... */
export function makeUniqueNames(names: readonly string[]): string[] {
  const used = new Map<string, number>()
  return names.map((name) => {
    const dotIndex = name.lastIndexOf('.')
    const stem = dotIndex > 0 ? name.slice(0, dotIndex) : name
    const ext = dotIndex > 0 ? name.slice(dotIndex) : ''

    const count = used.get(name.toLowerCase()) ?? 0
    used.set(name.toLowerCase(), count + 1)
    if (count === 0) {
      return name
    }

    let candidate: string
    let n = count + 1
    do {
      candidate = `${stem}-${n}${ext}`
      n += 1
    } while (used.has(candidate.toLowerCase()))
    used.set(candidate.toLowerCase(), 1)
    return candidate
  })
}

/** Build a suggested ZIP entry name for a processed image. */
export function buildZipEntryName(originalName: string, format: OutputFormat): string {
  const extension = OUTPUT_FORMAT_EXTENSIONS[format]
  const safe = originalName.replace(/[\\/]/g, '_').trim()
  const base = safe.replace(/\.(jpe?g|png|webp|avif|gif|bmp|tiff?|svg)$/i, '') || 'image'
  return sanitizeZipEntryName(`${base}-compressed.${extension}`)
}

/**
 * Build a ZIP archive from processed results.
 *
 * - only the provided (successful) entries are included
 * - names are sanitized and de-duplicated
 * - throws a typed ZipError when there is nothing to archive
 */
export async function buildZip(entries: readonly ZipEntry[]): Promise<Blob> {
  if (entries.length === 0) {
    throw new ZipError('EMPTY', 'There are no successful results to download.')
  }

  const names = makeUniqueNames(entries.map((entry) => sanitizeZipEntryName(entry.name)))

  try {
    // Lazy-loaded: ZIP creation only happens on explicit user action, so it
    // should not weigh down the initial bundle.
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    entries.forEach((entry, index) => {
      zip.file(names[index]!, entry.blob)
    })
    // STORE: images are already compressed; deflate wastes CPU for ~0 gain.
    return await zip.generateAsync({ type: 'blob', compression: 'STORE' })
  } catch (cause) {
    throw new ZipError(
      'BUILD_FAILED',
      cause instanceof Error ? cause.message : 'Failed to build the ZIP archive.',
    )
  }
}
