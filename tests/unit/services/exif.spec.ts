import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { isTransposed, readExifOrientation } from '@/services/image/exif'

const FIXTURES = join(__dirname, '..', '..', 'fixtures')

function fixtureFile(name: string): File {
  const buffer = readFileSync(join(FIXTURES, name))
  return new File([buffer], name, { type: 'image/jpeg' })
}

describe('readExifOrientation (fixture-based)', () => {
  it('reads orientation 6 (rotate 90° CW)', async () => {
    expect(await readExifOrientation(fixtureFile('exif-orientation-6.jpg'))).toBe(6)
  })

  it('reads orientation 1 (normal)', async () => {
    expect(await readExifOrientation(fixtureFile('exif-orientation-1.jpg'))).toBe(1)
  })

  it('reads orientation 3 (180°)', async () => {
    expect(await readExifOrientation(fixtureFile('exif-orientation-3.jpg'))).toBe(3)
  })

  it('returns null for a JPEG without EXIF', async () => {
    expect(await readExifOrientation(fixtureFile('no-exif.jpg'))).toBeNull()
  })

  it('returns null for non-JPEG content', async () => {
    const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'a.png', {
      type: 'image/png',
    })
    expect(await readExifOrientation(png)).toBeNull()
  })

  it('returns null for truncated files', async () => {
    const file = fixtureFile('exif-orientation-6.jpg')
    const truncated = new File([await file.slice(0, 10).arrayBuffer()], 't.jpg', {
      type: 'image/jpeg',
    })
    expect(await readExifOrientation(truncated)).toBeNull()
  })

  it('handles big-endian TIFF headers', async () => {
    // Craft a minimal big-endian EXIF JPEG with orientation 6.
    const tiff = new Uint8Array([
      0x4d,
      0x4d, // "MM"
      0x00,
      0x2a, // magic 42
      0x00,
      0x00,
      0x00,
      0x08, // IFD0 offset
      0x00,
      0x01, // 1 entry
      0x01,
      0x12, // tag orientation
      0x00,
      0x03, // type SHORT
      0x00,
      0x00,
      0x00,
      0x01, // count 1
      0x00,
      0x06,
      0x00,
      0x00, // value 6
      0x00,
      0x00,
      0x00,
      0x00, // next IFD
    ])
    const exifBody = new Uint8Array(6 + tiff.length)
    exifBody.set([0x45, 0x78, 0x69, 0x66, 0x00, 0x00], 0) // "Exif\0\0"
    exifBody.set(tiff, 6)
    const segment = new Uint8Array(4 + exifBody.length)
    const view = new DataView(segment.buffer)
    view.setUint16(0, 0xffe1)
    view.setUint16(2, exifBody.length + 2)
    segment.set(exifBody, 4)
    const jpeg = new Uint8Array(2 + segment.length)
    jpeg.set([0xff, 0xd8], 0)
    jpeg.set(segment, 2)

    const file = new File([jpeg], 'be.jpg', { type: 'image/jpeg' })
    expect(await readExifOrientation(file)).toBe(6)
  })

  it('rejects out-of-range orientation values', async () => {
    // Orientation 9 is invalid — must not be returned.
    const tiff = new Uint8Array([
      0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x12, 0x01, 0x03, 0x00, 0x01,
      0x00, 0x00, 0x00, 0x09, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ])
    const exifBody = new Uint8Array(6 + tiff.length)
    exifBody.set([0x45, 0x78, 0x69, 0x66, 0x00, 0x00], 0)
    exifBody.set(tiff, 6)
    const segment = new Uint8Array(4 + exifBody.length)
    const view = new DataView(segment.buffer)
    view.setUint16(0, 0xffe1)
    view.setUint16(2, exifBody.length + 2)
    segment.set(exifBody, 4)
    const jpeg = new Uint8Array(2 + segment.length)
    jpeg.set([0xff, 0xd8], 0)
    jpeg.set(segment, 2)

    const file = new File([jpeg], 'bad.jpg', { type: 'image/jpeg' })
    expect(await readExifOrientation(file)).toBeNull()
  })
})

describe('isTransposed', () => {
  it('orientations 5-8 swap width and height', () => {
    expect(isTransposed(5)).toBe(true)
    expect(isTransposed(6)).toBe(true)
    expect(isTransposed(7)).toBe(true)
    expect(isTransposed(8)).toBe(true)
  })

  it('orientations 1-4 keep width and height', () => {
    expect(isTransposed(1)).toBe(false)
    expect(isTransposed(2)).toBe(false)
    expect(isTransposed(3)).toBe(false)
    expect(isTransposed(4)).toBe(false)
  })
})
