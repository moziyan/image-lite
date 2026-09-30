import { LIMITS } from '@/config/limits'

import { ImageError } from './errors'

export interface DecodedImage {
  bitmap: ImageBitmap
  width: number
  height: number
}

/**
 * Decode a File into an ImageBitmap using browser-native APIs.
 *
 * EXIF orientation is applied via `imageOrientation: 'from-image'`, so the
 * returned bitmap is in visual orientation (a 90°-rotated photo decodes
 * with swapped width/height). Browsers that don't support the option
 * ignore it; images without EXIF orientation are never rotated.
 *
 * The caller owns the returned ImageBitmap and must call `bitmap.close()`
 * when done.
 */
export async function decodeImage(file: File): Promise<DecodedImage> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch (cause) {
    throw new ImageError(
      'DECODE_FAILED',
      `"${file.name}" could not be decoded. The file may be corrupted or not a real image.`,
      cause instanceof Error ? cause.message : String(cause),
      { name: file.name },
    )
  }

  const { width, height } = bitmap
  if (width <= 0 || height <= 0) {
    bitmap.close()
    throw new ImageError('INVALID_IMAGE', `"${file.name}" has invalid dimensions.`, undefined, {
      name: file.name,
    })
  }

  if (width * height > LIMITS.MAX_PIXELS) {
    bitmap.close()
    throw new ImageError(
      'PIXEL_LIMIT_EXCEEDED',
      `"${file.name}" exceeds the maximum supported resolution.`,
      `${width}x${height} > ${LIMITS.MAX_PIXELS} pixels`,
      { name: file.name },
    )
  }

  return { bitmap, width, height }
}
