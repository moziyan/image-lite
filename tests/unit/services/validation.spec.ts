import { describe, expect, it } from 'vitest'

import { LIMITS } from '@/config/limits'
import {
  isSupportedImageType,
  validateImageFile,
  validateImageFiles,
} from '@/services/image/validation'

function makeFile(name: string, type: string, size = 1024): File {
  return new File([new Uint8Array(size)], name, { type })
}

describe('isSupportedImageType', () => {
  it('accepts jpeg, png, webp', () => {
    expect(isSupportedImageType('image/jpeg')).toBe(true)
    expect(isSupportedImageType('image/png')).toBe(true)
    expect(isSupportedImageType('image/webp')).toBe(true)
  })

  it('rejects other types', () => {
    expect(isSupportedImageType('image/gif')).toBe(false)
    expect(isSupportedImageType('image/avif')).toBe(false)
    expect(isSupportedImageType('application/pdf')).toBe(false)
    expect(isSupportedImageType('')).toBe(false)
  })
})

describe('validateImageFile', () => {
  it('accepts a valid jpeg file', () => {
    const result = validateImageFile(makeFile('photo.jpg', 'image/jpeg'))
    expect(result.ok).toBe(true)
  })

  it('rejects unsupported formats', () => {
    const result = validateImageFile(makeFile('anim.gif', 'image/gif'))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('UNSUPPORTED_FORMAT')
      expect(result.error.fileName).toBe('anim.gif')
    }
  })

  it('rejects files over the size limit', () => {
    const file = makeFile('big.jpg', 'image/jpeg')
    Object.defineProperty(file, 'size', { value: LIMITS.MAX_FILE_SIZE + 1 })
    const result = validateImageFile(file)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('FILE_TOO_LARGE')
    }
  })

  it('accepts files exactly at the size limit', () => {
    const file = makeFile('exact.jpg', 'image/jpeg')
    Object.defineProperty(file, 'size', { value: LIMITS.MAX_FILE_SIZE })
    expect(validateImageFile(file).ok).toBe(true)
  })
})

describe('validateImageFiles', () => {
  it('separates accepted and rejected files', () => {
    const files = [
      makeFile('a.jpg', 'image/jpeg'),
      makeFile('b.gif', 'image/gif'),
      makeFile('c.png', 'image/png'),
    ]
    const { accepted, rejected } = validateImageFiles(files)
    expect(accepted).toHaveLength(2)
    expect(rejected).toHaveLength(1)
    expect(rejected[0]?.code).toBe('UNSUPPORTED_FORMAT')
  })

  it('enforces the batch size limit', () => {
    const files = Array.from({ length: LIMITS.MAX_BATCH_SIZE + 2 }, (_, i) =>
      makeFile(`img-${i}.jpg`, 'image/jpeg'),
    )
    const { accepted, rejected } = validateImageFiles(files)
    expect(accepted).toHaveLength(LIMITS.MAX_BATCH_SIZE)
    expect(rejected).toHaveLength(2)
  })
})
