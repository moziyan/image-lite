import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ImageError } from '@/services/image/errors'
import { ImageProcessor } from '@/services/image/processor'
import type { ImageProcessInput } from '@/types/image'

function makeJpegFile(name = 'photo.jpg', size = 2048): File {
  return new File([new Uint8Array(size)], name, { type: 'image/jpeg' })
}

function makeInput(overrides: Partial<ImageProcessInput> = {}): ImageProcessInput {
  return {
    file: makeJpegFile(),
    resize: { width: 400, height: undefined, maintainAspectRatio: true, allowUpscale: false },
    output: { format: 'jpeg', quality: 80 },
    metadata: { preserveExif: false },
    ...overrides,
  }
}

/** Stub browser decode/encode APIs not implemented by happy-dom. */
function stubBrowserApis(bitmapWidth = 1000, bitmapHeight = 500): void {
  const close = vi.fn()
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ width: bitmapWidth, height: bitmapHeight, close })),
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
  ) {
    return {
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
      drawImage: vi.fn(),
      putImageData: vi.fn(),
      canvas: this,
    } as unknown as CanvasRenderingContext2D
  })
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
    callback: BlobCallback,
    type?: string,
  ) {
    callback(new Blob([new Uint8Array(500)], { type }))
  })
}

describe('ImageProcessor', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('processes a file through validate -> decode -> resize -> encode', async () => {
    stubBrowserApis(1000, 500)
    const processor = new ImageProcessor()

    const result = await processor.process(makeInput())

    expect(result.width).toBe(400)
    expect(result.height).toBe(200) // aspect ratio preserved
    expect(result.format).toBe('jpeg')
    expect(result.size).toBe(500)
    expect(result.originalSize).toBe(2048)
    expect(result.compressionRatio).toBeCloseTo(500 / 2048)
    expect(result.processingTime).toBeGreaterThanOrEqual(0)
    expect(result.blob).toBeInstanceOf(Blob)
  })

  it('rejects unsupported input files before decoding', async () => {
    const createImageBitmapSpy = vi.fn()
    vi.stubGlobal('createImageBitmap', createImageBitmapSpy)
    const processor = new ImageProcessor()

    const input = makeInput({ file: new File(['x'], 'anim.gif', { type: 'image/gif' }) })
    await expect(processor.process(input)).rejects.toMatchObject({
      code: 'UNSUPPORTED_FORMAT',
    })
    expect(createImageBitmapSpy).not.toHaveBeenCalled()
  })

  it('maps decode failures to a typed DECODE_FAILED error', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => {
        throw new Error('corrupt data')
      }),
    )
    const processor = new ImageProcessor()

    await expect(processor.process(makeInput())).rejects.toMatchObject({
      code: 'DECODE_FAILED',
    })
  })

  it('closes the decoded bitmap after resizing', async () => {
    const close = vi.fn()
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 1000, height: 500, close })),
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
      putImageData: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb: BlobCallback, type) => {
      cb(new Blob(['x'], { type }))
    })

    const processor = new ImageProcessor()
    await processor.process(makeInput())
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('releases the bitmap when encoding fails', async () => {
    const close = vi.fn()
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 1000, height: 500, close })),
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
      putImageData: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb: BlobCallback) => {
      cb(null) // encode failure
    })

    const processor = new ImageProcessor()
    await expect(processor.process(makeInput())).rejects.toBeInstanceOf(ImageError)
    expect(close).toHaveBeenCalledTimes(1)
  })
})
