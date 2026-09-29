import { describe, expect, it } from 'vitest'

import { buildOutputFileName } from '@/services/download/downloadService'

describe('buildOutputFileName', () => {
  it('preserves the base name and appends -compressed with the right extension', () => {
    expect(buildOutputFileName('photo.jpg', 'jpeg')).toBe('photo-compressed.jpg')
    expect(buildOutputFileName('photo.png', 'webp')).toBe('photo-compressed.webp')
    expect(buildOutputFileName('photo.webp', 'png')).toBe('photo-compressed.png')
  })

  it('strips common image extensions case-insensitively', () => {
    expect(buildOutputFileName('Photo.JPEG', 'webp')).toBe('Photo-compressed.webp')
    expect(buildOutputFileName('scan.TIFF', 'jpeg')).toBe('scan-compressed.jpg')
  })

  it('keeps non-image suffixes as part of the base name', () => {
    expect(buildOutputFileName('archive.zip', 'png')).toBe('archive.zip-compressed.png')
  })

  it('handles names without any extension', () => {
    expect(buildOutputFileName('noext', 'jpeg')).toBe('noext-compressed.jpg')
  })

  it('sanitizes path separators', () => {
    expect(buildOutputFileName('a/b\\c.png', 'jpeg')).toBe('a_b_c-compressed.jpg')
  })

  it('falls back to "image" for empty base names', () => {
    expect(buildOutputFileName('.png', 'jpeg')).toBe('image-compressed.jpg')
  })

  it('uses avif extension for avif format', () => {
    expect(buildOutputFileName('x.png', 'avif')).toBe('x-compressed.avif')
  })
})
