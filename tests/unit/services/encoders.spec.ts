import { beforeEach, describe, expect, it, vi } from 'vitest'

import { defaultEncoderRegistry, EncoderRegistry } from '@/services/image/encoderRegistry'
import { JpegEncoder, normalizeQuality, PngEncoder, WebpEncoder } from '@/services/image/encoders'
import type { ImageEncoder } from '@/services/image/interfaces'

describe('normalizeQuality', () => {
  it('converts 0-100 to 0-1', () => {
    expect(normalizeQuality(0, 0.85)).toBe(0)
    expect(normalizeQuality(50, 0.85)).toBe(0.5)
    expect(normalizeQuality(100, 0.85)).toBe(1)
  })

  it('clamps out-of-range values', () => {
    expect(normalizeQuality(-10, 0.85)).toBe(0)
    expect(normalizeQuality(150, 0.85)).toBe(1)
  })

  it('uses fallback when quality is undefined or invalid', () => {
    expect(normalizeQuality(undefined, 0.8)).toBe(0.8)
    expect(normalizeQuality(Number.NaN, 0.8)).toBe(0.8)
  })
})

describe('EncoderRegistry', () => {
  it('resolves the default MVP encoders', () => {
    const registry = new EncoderRegistry()
    expect(registry.resolve('jpeg')).toBeInstanceOf(JpegEncoder)
    expect(registry.resolve('png')).toBeInstanceOf(PngEncoder)
    expect(registry.resolve('webp')).toBeInstanceOf(WebpEncoder)
  })

  it('throws a typed error for unregistered formats', () => {
    const registry = new EncoderRegistry()
    expect(() => registry.resolve('avif')).toThrowError(/avif/)
  })

  it('supports custom encoder registration', () => {
    const fakeAvif: ImageEncoder = {
      supports: (format) => format === 'avif',
      encode: () => Promise.resolve(new Blob(['x'], { type: 'image/avif' })),
    }
    const registry = new EncoderRegistry()
    registry.register(fakeAvif)
    expect(registry.resolve('avif')).toBe(fakeAvif)
  })

  it('lists supported formats', () => {
    expect(defaultEncoderRegistry.supportedFormats()).toEqual(['jpeg', 'png', 'webp'])
  })
})

describe('encoders (mocked canvas)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  function mockCanvasToBlob(captured: { mimeType?: string; quality?: number }): void {
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
      this: HTMLCanvasElement,
      callback: BlobCallback,
      type?: string,
      quality?: number,
    ) {
      captured.mimeType = type
      captured.quality = quality
      callback(new Blob(['fake'], { type }))
    })
  }

  it('JPEG encoder passes normalized quality and jpeg mime type', async () => {
    const captured: { mimeType?: string; quality?: number } = {}
    mockCanvasToBlob(captured)

    const canvas = document.createElement('canvas')
    canvas.width = 10
    canvas.height = 10

    const blob = await new JpegEncoder().encode(canvas, { format: 'jpeg', quality: 75 })
    expect(captured.mimeType).toBe('image/jpeg')
    expect(captured.quality).toBe(0.75)
    expect(blob.type).toBe('image/jpeg')
  })

  it('PNG encoder ignores the quality option entirely', async () => {
    const captured: { mimeType?: string; quality?: number } = {}
    mockCanvasToBlob(captured)

    const canvas = document.createElement('canvas')
    canvas.width = 10
    canvas.height = 10

    await new PngEncoder().encode(canvas, { format: 'png', quality: 10 })
    expect(captured.mimeType).toBe('image/png')
    expect(captured.quality).toBeUndefined()
  })

  it('WebP encoder uses webp mime type with quality', async () => {
    const captured: { mimeType?: string; quality?: number } = {}
    mockCanvasToBlob(captured)

    const canvas = document.createElement('canvas')
    canvas.width = 10
    canvas.height = 10

    await new WebpEncoder().encode(canvas, { format: 'webp', quality: 60 })
    expect(captured.mimeType).toBe('image/webp')
    expect(captured.quality).toBe(0.6)
  })

  it('encoders declare support correctly', () => {
    expect(new JpegEncoder().supports('jpeg')).toBe(true)
    expect(new JpegEncoder().supports('png')).toBe(false)
    expect(new PngEncoder().supports('png')).toBe(true)
    expect(new WebpEncoder().supports('webp')).toBe(true)
    expect(new WebpEncoder().supports('avif')).toBe(false)
  })
})
