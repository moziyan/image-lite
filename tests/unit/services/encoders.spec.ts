import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
    const registry = new EncoderRegistry([]) // empty registry: nothing registered
    expect(() => registry.resolve('avif')).toThrowError(/avif/)
  })

  it('supports custom encoder registration', () => {
    const fakeAvif: ImageEncoder = {
      supports: (format) => format === 'avif',
      encode: () => Promise.resolve(new Blob(['x'], { type: 'image/avif' })),
    }
    const registry = new EncoderRegistry([])
    registry.register(fakeAvif)
    expect(registry.resolve('avif')).toBe(fakeAvif)
  })

  it('lists supported formats', () => {
    expect(defaultEncoderRegistry.supportedFormats()).toEqual(['jpeg', 'png', 'webp', 'avif'])
  })
})

describe('encoders (mocked canvas)', () => {
  const originalOffscreenCanvas = globalThis.OffscreenCanvas

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    if (originalOffscreenCanvas) {
      Object.defineProperty(globalThis, 'OffscreenCanvas', {
        value: originalOffscreenCanvas,
        writable: true,
        configurable: true,
      })
    }
  })

  /** happy-dom lacks canvas 2D contexts — stub the bits encoders rely on. */
  function stubCanvas(captured: { mimeType?: string; quality?: number }): void {
    // happy-dom defines OffscreenCanvas but its 2D context is null, so the
    // production code must fall back to DOM canvases in tests. stubGlobal
    // does not affect `typeof`, hence Reflect.deleteProperty.
    Reflect.deleteProperty(globalThis, 'OffscreenCanvas')
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
      putImageData: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
      callback: BlobCallback,
      type?: string,
      quality?: number,
    ) {
      captured.mimeType = type
      captured.quality = quality
      // happy-dom's Blob requires a string type option; build it explicitly.
      callback(new Blob(['fake'], type ? { type } : undefined))
    })
  }

  function makeCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = 10
    canvas.height = 10
    return canvas
  }

  it('JPEG encoder passes normalized quality and jpeg mime type', async () => {
    const captured: { mimeType?: string; quality?: number } = {}
    stubCanvas(captured)

    const blob = await new JpegEncoder().encode(makeCanvas(), { format: 'jpeg', quality: 75 })
    expect(captured.mimeType).toBe('image/jpeg')
    expect(captured.quality).toBe(0.75)
    expect(blob.type).toBe('image/jpeg')
  })

  it('PNG encoder ignores the quality option entirely', async () => {
    const captured: { mimeType?: string; quality?: number } = {}
    stubCanvas(captured)

    await new PngEncoder().encode(makeCanvas(), { format: 'png', quality: 10 })
    expect(captured.mimeType).toBe('image/png')
    expect(captured.quality).toBeUndefined()
  })

  it('WebP encoder uses webp mime type with quality', async () => {
    const captured: { mimeType?: string; quality?: number } = {}
    stubCanvas(captured)

    await new WebpEncoder().encode(makeCanvas(), { format: 'webp', quality: 60 })
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

describe('AvifEncoder', () => {
  it('is registered in the default registry', async () => {
    const { AvifEncoder } = await import('@/services/image/encoders')
    expect(defaultEncoderRegistry.resolve('avif')).toBeInstanceOf(AvifEncoder)
    expect(defaultEncoderRegistry.supportedFormats()).toEqual(['jpeg', 'png', 'webp', 'avif'])
  })

  it('declares support for avif only', async () => {
    const { AvifEncoder } = await import('@/services/image/encoders')
    const encoder = new AvifEncoder()
    expect(encoder.supports('avif')).toBe(true)
    expect(encoder.supports('webp')).toBe(false)
  })

  it('throws ENCODE_FAILED when the browser cannot encode AVIF', async () => {
    const { AvifEncoder } = await import('@/services/image/encoders')
    // Canvas that always returns PNG (silent fallback) must be detected.
    vi.restoreAllMocks()
    Reflect.deleteProperty(globalThis, 'OffscreenCanvas')
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
      putImageData: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback: BlobCallback) => {
      callback(new Blob(['fake'], { type: 'image/png' }))
    })
    const canvas = document.createElement('canvas')
    canvas.width = 10
    canvas.height = 10
    await expect(new AvifEncoder().encode(canvas, { format: 'avif' })).rejects.toMatchObject({
      name: 'ImageError',
      code: 'ENCODE_FAILED',
    })
  })
})
