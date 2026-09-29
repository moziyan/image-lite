import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  canEncodeFormat,
  resetCapabilityCache,
  supportedOutputFormats,
} from '@/services/image/capabilities'

describe('capabilities', () => {
  beforeEach(() => {
    resetCapabilityCache()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  function stubOffscreenCanvas(convertToBlob: (type?: string) => Promise<Blob>) {
    class MockOffscreenCanvas {
      width: number
      height: number
      constructor(width: number, height: number) {
        this.width = width
        this.height = height
      }
      getContext() {
        return { fillRect: () => {} }
      }
      convertToBlob(options?: { type?: string }) {
        return convertToBlob(options?.type)
      }
    }
    vi.stubGlobal('OffscreenCanvas', MockOffscreenCanvas)
  }

  it('reports true when the browser returns the requested MIME type', async () => {
    stubOffscreenCanvas((type) => Promise.resolve(new Blob(['x'], { type })))
    expect(await canEncodeFormat('avif')).toBe(true)
    expect(await canEncodeFormat('webp')).toBe(true)
  })

  it('reports false when the browser silently falls back to PNG', async () => {
    stubOffscreenCanvas(() => Promise.resolve(new Blob(['x'], { type: 'image/png' })))
    expect(await canEncodeFormat('avif')).toBe(false)
    expect(await canEncodeFormat('png')).toBe(true)
  })

  it('reports false when encoding throws', async () => {
    stubOffscreenCanvas(() => Promise.reject(new Error('unsupported')))
    expect(await canEncodeFormat('avif')).toBe(false)
  })

  it('caches the probe result per format', async () => {
    const probe = vi.fn((type?: string) => Promise.resolve(new Blob(['x'], { type })))
    stubOffscreenCanvas(probe)
    await canEncodeFormat('avif')
    await canEncodeFormat('avif')
    expect(probe).toHaveBeenCalledTimes(1)
  })

  it('supportedOutputFormats returns only encodable formats', async () => {
    stubOffscreenCanvas((type) =>
      type === 'image/avif'
        ? Promise.resolve(new Blob(['x'], { type: 'image/png' }))
        : Promise.resolve(new Blob(['x'], { type })),
    )
    expect(await supportedOutputFormats()).toEqual(['jpeg', 'png', 'webp'])
  })

  it('reports false when no canvas implementation exists', async () => {
    vi.stubGlobal('OffscreenCanvas', undefined)
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'canvas') {
        throw new Error('no canvas')
      }
      return originalCreateElement(tag)
    }) as typeof document.createElement)
    expect(await canEncodeFormat('jpeg')).toBe(false)
  })
})
