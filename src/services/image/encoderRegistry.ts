import type { OutputFormat } from '@/types/image'

import { JpegEncoder, PngEncoder, WebpEncoder } from './encoders'
import { ImageError } from './errors'
import type { ImageEncoder } from './interfaces'

/**
 * Registry/factory for encoders (ARCHITECTURE.md §7).
 * Components and services resolve encoders through this registry instead of
 * constructing concrete encoders directly.
 */
export class EncoderRegistry {
  private readonly encoders: ImageEncoder[]

  constructor(encoders?: ImageEncoder[]) {
    this.encoders = encoders ?? [new JpegEncoder(), new PngEncoder(), new WebpEncoder()]
  }

  register(encoder: ImageEncoder): void {
    this.encoders.push(encoder)
  }

  resolve(format: OutputFormat): ImageEncoder {
    const encoder = this.encoders.find((candidate) => candidate.supports(format))
    if (!encoder) {
      throw new ImageError('UNSUPPORTED_FORMAT', `No encoder registered for format "${format}".`)
    }
    return encoder
  }

  supportedFormats(): OutputFormat[] {
    const formats: OutputFormat[] = ['jpeg', 'png', 'webp', 'avif']
    return formats.filter((format) => this.encoders.some((encoder) => encoder.supports(format)))
  }
}

export const defaultEncoderRegistry = new EncoderRegistry()
