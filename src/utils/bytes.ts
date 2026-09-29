/**
 * Format a byte count as a human-readable string.
 */
export function formatBytes(bytes: number, fractionDigits = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '0 B'
  }
  if (bytes < 1024) {
    return `${bytes} B`
  }
  const units = ['KB', 'MB', 'GB'] as const
  let value = bytes
  let unitIndex = -1
  do {
    value /= 1024
    unitIndex += 1
  } while (value >= 1024 && unitIndex < units.length - 1)

  const rounded = value.toFixed(fractionDigits)
  // Trim trailing zeros: "1.0" -> "1", "1.50" -> "1.5"
  const trimmed = rounded.replace(/\.?0+$/, '')
  return `${trimmed} ${units[unitIndex]}`
}
