import type { OutputFormat } from '@/types/image'

/**
 * Encoder capability detection.
 *
 * Canvas-based encoding support varies by browser: JPEG/PNG are universal,
 * WebP is near-universal, AVIF encoding via canvas is only available in
 * some browsers (Chrome 130+ at the time of writing). Detection is done by
 * actually attempting a 1×1 encode — never by UA sniffing.
 */

const cache = new Map<OutputFormat, Promise<boolean>>()

const MIME_TYPES: Record<OutputFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
}

async function probe(mimeType: string): Promise<boolean> {
  try {
    let blob: Blob | null = null
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(1, 1)
      const ctx = canvas.getContext('2d')
      if (!ctx) return false
      ctx.fillRect(0, 0, 1, 1)
      blob = await canvas.convertToBlob({ type: mimeType })
    } else if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType))
    } else {
      return false
    }
    // Some browsers silently fall back to PNG instead of throwing.
    return blob !== null && blob.type === mimeType
  } catch {
    return false
  }
}

/** Detect (once, cached) whether canvas encoding works for the format. */
export function canEncodeFormat(format: OutputFormat): Promise<boolean> {
  let pending = cache.get(format)
  if (!pending) {
    pending = probe(MIME_TYPES[format])
    cache.set(format, pending)
  }
  return pending
}

/** All MVP output formats that this browser can actually encode. */
export async function supportedOutputFormats(): Promise<OutputFormat[]> {
  const formats: OutputFormat[] = ['jpeg', 'png', 'webp', 'avif']
  const results = await Promise.all(formats.map((format) => canEncodeFormat(format)))
  return formats.filter((_, index) => results[index])
}

/** Test hook: clear the detection cache. */
export function resetCapabilityCache(): void {
  cache.clear()
}
