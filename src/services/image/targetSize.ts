/**
 * Target-size settings model and best-effort search (AGENT_PROMPTS §7).
 *
 * The search is pure/deterministic and framework-free: callers inject an
 * `encodeCandidate` function, so tests use a mock encoder. The search never
 * claims an exact hit — `metTarget` reports whether the result fits within
 * the target; otherwise it is the closest candidate found within the
 * attempt budget.
 */

/** Target-size configuration (7.1). */
export interface TargetSizeOptions {
  /** Desired maximum output size in bytes. */
  targetBytes: number
  /** Allow dimension reduction when the quality floor is insufficient. */
  allowResize: boolean
  /** Lower bound for quality search (0–100 UI scale). */
  minimumQuality: number
  /** Never scale below this width/height (pixels, per axis). */
  minWidth: number
  minHeight: number
}

export const TARGET_SIZE_DEFAULTS = {
  minimumQuality: 30,
  minWidth: 64,
  minHeight: 64,
} as const

/** A single encode attempt the search may evaluate. */
export interface EncodeCandidate {
  /** Scale factor relative to the requested dimensions (1 = requested). */
  scale: number
  /** Quality on the 0–100 UI scale. */
  quality: number
}

export interface CandidateResult {
  /** Actual encoded size in bytes. */
  size: number
  /** Opaque payload from the caller (e.g. the Blob). */
  blob: Blob
}

export interface TargetSizeSearchResult {
  /** The winning candidate parameters. */
  candidate: EncodeCandidate
  /** The winning encode. */
  result: CandidateResult
  /** True when size <= targetBytes — never claimed otherwise. */
  metTarget: boolean
  /** Number of encode attempts performed. */
  attempts: number
  /** Human explanation when the target could not be met (7.7). */
  note?: string
}

/** Hard budget: quality probes + dimension steps. */
export const MAX_ATTEMPTS = 20

/** Scale factors tried after the quality floor fails, largest first. */
const SCALE_STEPS = [0.85, 0.7, 0.55, 0.4, 0.3]

interface Tracked {
  candidate: EncodeCandidate
  result: CandidateResult
}

/**
 * Binary-search quality at a fixed scale.
 *
 * Assumes encoding size is monotonic non-decreasing in quality. Returns
 * `bestFit` (highest quality whose size <= target) when one exists, plus
 * `closest` (nearest to target by absolute byte distance) overall.
 */
/**
 * Linear downward quality scan at a fixed scale.
 *
 * Robust to non-monotonic encoders (noisy images can encode larger at
 * lower quality): scans quality from high to low and stops at the first
 * candidate that fits, which is the highest quality found to fit. This is
 * the dominant factor in quality preservation; dimension steps coarsen
 * the search so the scan stays within budget.
 */
async function searchQuality(
  scale: number,
  options: TargetSizeOptions,
  encode: (candidate: EncodeCandidate) => Promise<CandidateResult>,
  budget: { remaining: number },
): Promise<{ bestFit: Tracked | null; closest: Tracked }> {
  const floor = Math.min(100, Math.max(1, Math.round(options.minimumQuality)))
  let bestFit: Tracked | null = null
  let closest: Tracked | null = null

  const consider = (entry: Tracked) => {
    if (
      !closest ||
      Math.abs(entry.result.size - options.targetBytes) <
        Math.abs(closest.result.size - options.targetBytes)
    ) {
      closest = entry
    }
  }

  // Probe the floor first: if even the cheapest quality overshoots, this
  // scale cannot work — bail out cheaply so the caller can step dimensions
  // down. Otherwise scan upward to find the best fitting quality.
  const floorEntry: Tracked = {
    candidate: { scale, quality: floor },
    result: await encode({ scale, quality: floor }),
  }
  budget.remaining -= 1
  consider(floorEntry)
  if (floorEntry.result.size > options.targetBytes) {
    return { bestFit: null, closest: closest! }
  }

  // The floor fits. Refine upward in coarse steps to recover quality,
  // stopping at the first overshoot (best fit is the last fitting one).
  bestFit = floorEntry
  const STEP = 20
  for (let q = floor + STEP; q <= 100 && budget.remaining > 1; q += STEP) {
    const entry: Tracked = {
      candidate: { scale, quality: q },
      result: await encode({ scale, quality: q }),
    }
    budget.remaining -= 1
    consider(entry)
    if (entry.result.size <= options.targetBytes) {
      bestFit = entry
    } else {
      break // non-monotonic safe: we already hold a fitting candidate
    }
  }

  // Probe the ceiling once so we don't under-deliver when the top quality
  // also fits (the coarse STEP may have skipped it).
  if (bestFit.candidate.quality < 100 && budget.remaining > 0) {
    const top: Tracked = {
      candidate: { scale, quality: 100 },
      result: await encode({ scale, quality: 100 }),
    }
    budget.remaining -= 1
    consider(top)
    if (top.result.size <= options.targetBytes) bestFit = top
  }

  return { bestFit, closest: closest! }
}

/**
 * Best-effort target-size search (7.2–7.5).
 *
 * Strategy:
 * 1. Binary-search quality at the requested dimensions.
 * 2. If nothing fits and allowResize is on, step dimensions down and
 *    re-search quality at each step.
 * 3. Stop after a bounded number of attempts; return the closest result
 *    with an honest note when the target is unreachable.
 */
export async function searchTargetSize(
  options: TargetSizeOptions,
  requestedWidth: number,
  requestedHeight: number,
  encode: (candidate: EncodeCandidate) => Promise<CandidateResult>,
): Promise<TargetSizeSearchResult> {
  if (!Number.isFinite(options.targetBytes) || options.targetBytes <= 0) {
    throw new RangeError('targetBytes must be positive')
  }

  const budget = { remaining: MAX_ATTEMPTS }
  const minScale = Math.max(options.minWidth / requestedWidth, options.minHeight / requestedHeight)

  let closest: Tracked | null = null
  const track = (entry: Tracked) => {
    if (
      !closest ||
      Math.abs(entry.result.size - options.targetBytes) <
        Math.abs(closest.result.size - options.targetBytes)
    ) {
      closest = entry
    }
  }

  // 1. Quality search at requested dimensions.
  const first = await searchQuality(1, options, encode, budget)
  track(first.closest)
  if (first.bestFit) {
    return done(first.bestFit, true, budget)
  }

  // 2. Dimension fallback: re-search quality at progressively smaller scales.
  if (options.allowResize) {
    for (const step of SCALE_STEPS) {
      if (budget.remaining <= 0) break
      if (step < minScale) break // would go below the configured floor
      const entry = await searchQuality(step, options, encode, budget)
      track(entry.closest)
      if (entry.bestFit) {
        return done(entry.bestFit, true, budget)
      }
    }
  }

  // 3. Best effort: closest candidate, honestly reported (7.7).
  const winner = closest!
  const note = options.allowResize
    ? `Target ${options.targetBytes} bytes is not reachable within quality ≥ ${options.minimumQuality} and the size floor. Closest: ${winner.result.size} bytes at ${Math.round(winner.candidate.scale * 100)}% dimensions, quality ${winner.candidate.quality}.`
    : `Target ${options.targetBytes} bytes is not reachable at quality ≥ ${options.minimumQuality} without resizing. Closest: ${winner.result.size} bytes. Enable "allow resize" to go smaller.`
  return { ...done(winner, false, budget), note }
}

function done(
  winner: Tracked,
  metTarget: boolean,
  budget: { remaining: number },
): TargetSizeSearchResult {
  return {
    candidate: winner.candidate,
    result: winner.result,
    metTarget,
    attempts: MAX_ATTEMPTS - budget.remaining,
  }
}
