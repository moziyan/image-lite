/**
 * Minimal 2D context surface shared by HTMLCanvasElement and OffscreenCanvas.
 */
export type Canvas2DContext = Pick<
  CanvasRenderingContext2D,
  'drawImage' | 'putImageData' | 'imageSmoothingEnabled' | 'imageSmoothingQuality'
>

/** A canvas handle that works on the main thread and inside workers. */
export interface ProcessCanvas {
  readonly width: number
  readonly height: number
  getContext(): Canvas2DContext
  toBlob(type?: string, quality?: number): Promise<Blob>
}

class DomProcessCanvas implements ProcessCanvas {
  private readonly canvas: HTMLCanvasElement

  constructor(width: number, height: number) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = width
    this.canvas.height = height
  }

  get width(): number {
    return this.canvas.width
  }

  get height(): number {
    return this.canvas.height
  }

  getContext(): Canvas2DContext {
    const ctx = this.canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to acquire 2D canvas context')
    }
    return ctx
  }

  toBlob(type?: string, quality?: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob returned null'))),
        type,
        quality,
      )
    })
  }
}

class OffscreenProcessCanvas implements ProcessCanvas {
  private readonly canvas: OffscreenCanvas

  constructor(width: number, height: number) {
    this.canvas = new OffscreenCanvas(width, height)
  }

  get width(): number {
    return this.canvas.width
  }

  get height(): number {
    return this.canvas.height
  }

  getContext(): Canvas2DContext {
    const ctx = this.canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to acquire OffscreenCanvas 2D context')
    }
    return ctx
  }

  toBlob(type?: string, quality?: number): Promise<Blob> {
    return this.canvas.convertToBlob({ type, quality })
  }
}

/**
 * Create a canvas appropriate for the current execution context
 * (worker -> OffscreenCanvas, main thread -> HTMLCanvasElement).
 */
export function createProcessCanvas(width: number, height: number): ProcessCanvas {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenProcessCanvas(width, height)
  }
  return new DomProcessCanvas(width, height)
}
