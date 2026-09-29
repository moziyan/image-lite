import { describe, expect, it, vi } from 'vitest'

import {
  MAX_ATTEMPTS,
  TARGET_SIZE_DEFAULTS,
  searchTargetSize,
  type EncodeCandidate,
} from '@/services/image/targetSize'

const BASE = {
  targetBytes: 10_000,
  allowResize: false,
  minimumQuality: 30,
  minWidth: 64,
  minHeight: 64,
}

function makeEncoder(sizeFor: (candidate: EncodeCandidate) => number) {
  return vi.fn(async (candidate: EncodeCandidate) => ({
    size: sizeFor(candidate),
    blob: new Blob(['x']),
  }))
}

describe('searchTargetSize (mock encoder, deterministic)', () => {
  it('finds a fitting quality via binary search (no resize needed)', async () => {
    // size = quality * 200 at scale 1 -> quality 50 gives exactly 10_000.
    const encode = makeEncoder((c) => Math.round(c.quality * 200 * c.scale))
    const result = await searchTargetSize(BASE, 1000, 1000, encode)

    expect(result.metTarget).toBe(true)
    expect(result.result.size).toBeLessThanOrEqual(10_000)
    expect(result.candidate.scale).toBe(1)
    expect(encode).toHaveBeenCalled()
    expect(result.attempts).toBeLessThanOrEqual(MAX_ATTEMPTS)
  })

  it('prefers the highest quality that still fits', async () => {
    const encode = makeEncoder((c) => Math.round(c.quality * 100)) // q100 = 10_000 fits exactly
    const result = await searchTargetSize(BASE, 1000, 1000, encode)

    expect(result.metTarget).toBe(true)
    expect(result.candidate.quality).toBe(100)
  })

  it('returns best effort with a note when the quality floor overshoots (resize off)', async () => {
    // Even quality 30 -> 15_000 bytes > target.
    const encode = makeEncoder((c) => Math.round(c.quality * 500))
    const result = await searchTargetSize(BASE, 1000, 1000, encode)

    expect(result.metTarget).toBe(false)
    expect(result.note).toMatch(/not reachable/i)
    expect(result.note).toMatch(/allow resize/i)
    expect(result.result.size).toBeGreaterThan(10_000)
    // Closest should be the smallest encode seen: quality floor at scale 1.
    expect(result.candidate.quality).toBe(30)
    expect(result.candidate.scale).toBe(1)
  })

  it('falls back to smaller dimensions when the quality floor is insufficient', async () => {
    // size = quality * 400 * scale^2 -> q30 @ scale1 = 12_000 (overshoot);
    // q100 @ scale 0.85 = 7_225 fits.
    const encode = makeEncoder((c) => Math.round(c.quality * 400 * c.scale * c.scale))
    const result = await searchTargetSize({ ...BASE, allowResize: true }, 1000, 1000, encode)

    expect(result.metTarget).toBe(true)
    expect(result.candidate.scale).toBe(0.85)
    expect(result.result.size).toBeLessThanOrEqual(10_000)
  })

  it('respects the min-width/min-height floor and reports when unreachable', async () => {
    // Tiny target that nothing can reach; floor 64px on a 100px request
    // -> minScale 0.64, so only scale 0.85 is permitted.
    const encode = makeEncoder(() => 50_000)
    const result = await searchTargetSize(
      { ...BASE, allowResize: true, targetBytes: 100 },
      100,
      100,
      encode,
    )

    expect(result.metTarget).toBe(false)
    expect(result.note).toMatch(/not reachable/i)
    // Every candidate must respect the 64px floor (scale >= 0.64).
    for (const call of encode.mock.calls) {
      expect(call[0].scale).toBeGreaterThanOrEqual(0.64)
    }
  })

  it('stays within the attempt budget on hard targets', async () => {
    const encode = makeEncoder(() => 999_999)
    const result = await searchTargetSize(
      { ...BASE, allowResize: true, targetBytes: 1 },
      100_000,
      100_000,
      encode,
    )

    expect(result.attempts).toBeLessThanOrEqual(MAX_ATTEMPTS)
    expect(encode.mock.calls.length).toBe(result.attempts)
    expect(result.metTarget).toBe(false)
  })

  it('clamps the quality floor to a sane range', async () => {
    const encode = makeEncoder((c) => Math.round(c.quality * 10)) // everything fits
    const result = await searchTargetSize(
      { ...BASE, minimumQuality: 250, targetBytes: 5000 },
      1000,
      1000,
      encode,
    )
    expect(result.metTarget).toBe(true)
    for (const call of encode.mock.calls) {
      expect(call[0].quality).toBeLessThanOrEqual(100)
      expect(call[0].quality).toBeGreaterThanOrEqual(1)
    }
  })

  it('rejects non-positive targets', async () => {
    const encode = makeEncoder(() => 0)
    await expect(searchTargetSize({ ...BASE, targetBytes: 0 }, 100, 100, encode)).rejects.toThrow(
      /positive/,
    )
    expect(encode).not.toHaveBeenCalled()
  })

  it('keeps stepping dimensions when size is non-monotonic in quality', async () => {
    // Model the real browser run: noisy PNG -> WebP. Size is NOT strictly
    // monotonic in quality (low-quality noisy images can encode larger),
    // but smaller dimensions always shrink it. The search must keep
    // stepping down and eventually fit at scale 0.3.
    const encode = makeEncoder((c) => {
      // Non-monotonic wiggle: mid qualities are not perfectly ordered.
      const wiggle = c.quality % 7 === 0 ? 1.6 : 1
      return Math.round(
        1_559_464 * (c.quality / 32) * ((c.scale * c.scale) / (0.85 * 0.85)) * wiggle,
      )
    })
    const result = await searchTargetSize(
      { ...BASE, allowResize: true, targetBytes: 307_200 },
      3000,
      2000,
      encode,
    )

    expect(result.metTarget).toBe(true)
    expect(result.candidate.scale).toBeLessThan(1)
    expect(result.result.size).toBeLessThanOrEqual(307_200)
  })

  it('exports sane defaults', () => {
    expect(TARGET_SIZE_DEFAULTS.minimumQuality).toBe(30)
    expect(TARGET_SIZE_DEFAULTS.minWidth).toBe(64)
    expect(TARGET_SIZE_DEFAULTS.minHeight).toBe(64)
  })
})
