import { describe, expect, it } from 'vitest'

import { calculateTargetDimensions } from '@/services/image/resizeCalculator'
import type { ResizeOptions } from '@/types/image'

const ORIGINAL = { width: 1000, height: 500 }

function opts(partial: Partial<ResizeOptions>): ResizeOptions {
  return {
    maintainAspectRatio: true,
    allowUpscale: false,
    ...partial,
  }
}

describe('calculateTargetDimensions', () => {
  describe('no resize', () => {
    it('returns original dimensions when neither width nor height is given', () => {
      expect(calculateTargetDimensions(ORIGINAL, opts({}))).toEqual({ width: 1000, height: 500 })
    })

    it('ignores zero and negative values', () => {
      expect(calculateTargetDimensions(ORIGINAL, opts({ width: 0, height: -10 }))).toEqual({
        width: 1000,
        height: 500,
      })
    })

    it('ignores NaN and Infinity', () => {
      expect(
        calculateTargetDimensions(
          ORIGINAL,
          opts({ width: Number.NaN, height: Number.POSITIVE_INFINITY }),
        ),
      ).toEqual({ width: 1000, height: 500 })
    })
  })

  describe('width only', () => {
    it('scales height proportionally', () => {
      expect(calculateTargetDimensions(ORIGINAL, opts({ width: 500 }))).toEqual({
        width: 500,
        height: 250,
      })
    })

    it('rounds fractional results', () => {
      expect(calculateTargetDimensions({ width: 1000, height: 333 }, opts({ width: 300 }))).toEqual(
        {
          width: 300,
          height: 100,
        },
      )
    })

    it('does not upscale by default', () => {
      expect(calculateTargetDimensions(ORIGINAL, opts({ width: 2000 }))).toEqual({
        width: 1000,
        height: 500,
      })
    })

    it('upscales when allowed', () => {
      expect(
        calculateTargetDimensions(ORIGINAL, opts({ width: 2000, allowUpscale: true })),
      ).toEqual({
        width: 2000,
        height: 1000,
      })
    })
  })

  describe('height only', () => {
    it('scales width proportionally', () => {
      expect(calculateTargetDimensions(ORIGINAL, opts({ height: 250 }))).toEqual({
        width: 500,
        height: 250,
      })
    })

    it('does not upscale by default', () => {
      expect(calculateTargetDimensions(ORIGINAL, opts({ height: 1000 }))).toEqual({
        width: 1000,
        height: 500,
      })
    })
  })

  describe('both dimensions with aspect ratio (max bounds)', () => {
    it('fits inside the bounds when width is the constraint', () => {
      expect(calculateTargetDimensions(ORIGINAL, opts({ width: 400, height: 400 }))).toEqual({
        width: 400,
        height: 200,
      })
    })

    it('fits inside the bounds when height is the constraint', () => {
      expect(calculateTargetDimensions(ORIGINAL, opts({ width: 900, height: 100 }))).toEqual({
        width: 200,
        height: 100,
      })
    })

    it('keeps original size when bounds are larger and upscale is off', () => {
      expect(calculateTargetDimensions(ORIGINAL, opts({ width: 2000, height: 2000 }))).toEqual({
        width: 1000,
        height: 500,
      })
    })

    it('fits inside bounds when upscaling is allowed', () => {
      expect(
        calculateTargetDimensions(
          ORIGINAL,
          opts({ width: 2000, height: 2000, allowUpscale: true }),
        ),
      ).toEqual({ width: 2000, height: 1000 })
    })
  })

  describe('both dimensions without aspect ratio (exact)', () => {
    it('resizes exactly to the requested dimensions', () => {
      expect(
        calculateTargetDimensions(
          ORIGINAL,
          opts({ width: 300, height: 300, maintainAspectRatio: false }),
        ),
      ).toEqual({ width: 300, height: 300 })
    })

    it('clamps each axis to the original size when upscale is off', () => {
      expect(
        calculateTargetDimensions(
          ORIGINAL,
          opts({ width: 2000, height: 300, maintainAspectRatio: false }),
        ),
      ).toEqual({ width: 1000, height: 300 })
    })
  })

  describe('invalid input', () => {
    it('throws on invalid original dimensions', () => {
      expect(() =>
        calculateTargetDimensions({ width: 0, height: 100 }, opts({ width: 50 })),
      ).toThrow()
      expect(() =>
        calculateTargetDimensions({ width: -5, height: 100 }, opts({ width: 50 })),
      ).toThrow()
    })

    it('never returns zero dimensions for extreme aspect ratios', () => {
      const result = calculateTargetDimensions({ width: 10000, height: 1 }, opts({ width: 100 }))
      expect(result.width).toBeGreaterThanOrEqual(1)
      expect(result.height).toBeGreaterThanOrEqual(1)
    })
  })
})
