/**
 * Centralized application limits.
 *
 * These are configuration values, not constants scattered through components.
 * See PRODUCT.md §14.
 */
export const LIMITS = {
  /** Maximum accepted input file size in bytes. */
  MAX_FILE_SIZE: 100 * 1024 * 1024,
  /** Maximum accepted total pixel count (width * height). */
  MAX_PIXELS: 100_000_000,
  /** Maximum number of images in a single batch. */
  MAX_BATCH_SIZE: 100,
} as const
