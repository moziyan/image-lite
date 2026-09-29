/**
 * Minimal EXIF orientation parser (JPEG APP1 only).
 *
 * Isolated from Vue and from the rest of the processing pipeline: it reads
 * the file header directly and never touches the DOM. Only the orientation
 * tag (0x0112) is extracted — no other metadata is interpreted.
 */

export type ExifOrientation = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

const JPEG_SOI = 0xffd8
const APP1_MARKER = 0xffe1
const EXIF_HEADER = 0x45786966 // "Exif"
const TAG_ORIENTATION = 0x0112
const TYPE_SHORT = 3

/**
 * Read the EXIF orientation of a JPEG file.
 *
 * Returns null when the file is not a JPEG, has no EXIF APP1 segment, has
 * no orientation tag, or the tag is malformed. Orientation 1 means
 * "normal" (no transform needed).
 */
export async function readExifOrientation(file: Blob): Promise<ExifOrientation | null> {
  // APP1 appears right after SOI; orientation is always within the first
  // chunk of the file. Read a bounded slice only.
  const header = new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer())
  if (header.length < 4) return null

  const view = new DataView(header.buffer, header.byteOffset, header.byteLength)
  if (view.getUint16(0) !== JPEG_SOI) return null

  let offset = 2
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset)
    const segmentLength = view.getUint16(offset + 2)
    if (segmentLength < 2 || offset + 2 + segmentLength > view.byteLength) return null

    if (marker === APP1_MARKER) {
      return parseApp1(view, offset + 4, segmentLength - 2)
    }
    // SOS (0xFFDA) means image data starts — no more metadata segments.
    if (marker === 0xffda) return null
    offset += 2 + segmentLength
  }
  return null
}

function parseApp1(view: DataView, start: number, length: number): ExifOrientation | null {
  if (length < 8) return null
  // "Exif\0\0"
  if (view.getUint32(start) !== EXIF_HEADER || view.getUint16(start + 4) !== 0) return null

  const tiffStart = start + 6
  if (tiffStart + 8 > start + length) return null

  const littleEndian = view.getUint16(tiffStart) === 0x4949 // "II"
  if (!littleEndian && view.getUint16(tiffStart) !== 0x4d4d) return null // "MM"
  if (view.getUint16(tiffStart + 2, littleEndian) !== 42) return null

  const ifdOffset = view.getUint32(tiffStart + 4, littleEndian)
  const ifdStart = tiffStart + ifdOffset
  if (ifdStart + 2 > start + length) return null

  const entryCount = view.getUint16(ifdStart, littleEndian)
  for (let i = 0; i < entryCount; i++) {
    const entry = ifdStart + 2 + i * 12
    if (entry + 12 > start + length) return null
    if (view.getUint16(entry, littleEndian) !== TAG_ORIENTATION) continue
    if (view.getUint16(entry + 2, littleEndian) !== TYPE_SHORT) return null
    const value = view.getUint16(entry + 8, littleEndian)
    return value >= 1 && value <= 8 ? (value as ExifOrientation) : null
  }
  return null
}

/** True when the orientation requires a 90°/270° rotation (dims swap). */
export function isTransposed(orientation: ExifOrientation): boolean {
  return orientation >= 5
}
