import type { ResizeOptions } from '@/types/image'

export interface Dimensions {
  width: number
  height: number
}

/**
 * Compute target dimensions for a resize operation.
 *
 * Semantics (PRODUCT.md §9):
 * - Default: preserve aspect ratio, do not upscale.
 * - Only width: height follows aspect ratio.
 * - Only height: width follows aspect ratio.
 * - Both + aspect ratio: treated as maximum bounds, fit inside.
 * - Both + no aspect ratio: exact resize.
 * - Zero/negative/invalid inputs fall back to the original dimension.
 *
 * Pure function — no Canvas, no DOM.
 */
export function calculateTargetDimensions(
  original: Dimensions,
  options: ResizeOptions,
): Dimensions {
  const { width: origW, height: origH } = original
  if (!isPositiveFinite(origW) || !isPositiveFinite(origH)) {
    throw new Error(`Invalid original dimensions: ${origW}x${origH}`)
  }

  const reqW = sanitize(options.width)
  const reqH = sanitize(options.height)

  // No resize requested.
  if (reqW === undefined && reqH === undefined) {
    return { width: origW, height: origH }
  }

  let targetW: number
  let targetH: number

  if (reqW !== undefined && reqH !== undefined && !options.maintainAspectRatio) {
    // Exact resize: output exactly the requested dimensions, only clamped
    // per-axis to the original size when upscaling is not allowed.
    targetW = options.allowUpscale ? reqW : Math.min(reqW, origW)
    targetH = options.allowUpscale ? reqH : Math.min(reqH, origH)
  } else {
    if (reqW !== undefined && reqH !== undefined) {
      // Fit inside the requested bounds.
      const scale = Math.min(reqW / origW, reqH / origH)
      targetW = origW * scale
      targetH = origH * scale
    } else if (reqW !== undefined) {
      targetW = reqW
      targetH = (origH * reqW) / origW
    } else {
      // reqH !== undefined
      targetH = reqH!
      targetW = (origW * reqH!) / origH
    }

    if (!options.allowUpscale) {
      const scale = Math.min(1, targetW / origW, targetH / origH)
      targetW = origW * scale
      targetH = origH * scale
    }
  }

  return {
    width: Math.max(1, Math.round(targetW)),
    height: Math.max(1, Math.round(targetH)),
  }
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

/** Returns the value if it is a positive finite number, otherwise undefined. */
function sanitize(value: number | undefined): number | undefined {
  if (value === undefined) return undefined
  if (!Number.isFinite(value) || value <= 0) return undefined
  return value
}
