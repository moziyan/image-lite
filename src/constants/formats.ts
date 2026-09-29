import type { OutputFormat } from '@/types/image'

/** Accepted input MIME types (PRODUCT.md §3). */
export const ACCEPTED_INPUT_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

/** File extension to use for each output format. */
export const OUTPUT_FORMAT_EXTENSIONS: Record<OutputFormat, string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
  avif: 'avif',
}

/** MIME type to use for each output format. */
export const OUTPUT_FORMAT_MIME_TYPES: Record<OutputFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
}
