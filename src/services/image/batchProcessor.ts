/**
 * Generic bounded-concurrency batch runner.
 *
 * - at most `concurrency` tasks run at the same time
 * - a failing task never stops the others (error isolation)
 * - cancellation is cooperative: queued tasks are skipped, running tasks
 *   rely on their own cancel handling
 * - at most `concurrency` items are "in flight", so the whole batch is
 *   never loaded into memory at once
 */
export interface BatchRunOptions {
  concurrency: number
  signal?: { cancelled: boolean }
  onTaskSettled?: (settledCount: number, totalCount: number) => void
}

export interface BatchTaskResult<T> {
  id: string
  outcome: 'fulfilled' | 'rejected' | 'skipped'
  value?: T
  error?: unknown
}

export async function runBatch<T>(
  ids: readonly string[],
  task: (id: string) => Promise<T>,
  options: BatchRunOptions,
): Promise<BatchTaskResult<T>[]> {
  const { concurrency, signal, onTaskSettled } = options
  const results = new Map<string, BatchTaskResult<T>>()
  let nextIndex = 0
  let settled = 0

  async function worker(): Promise<void> {
    while (nextIndex < ids.length) {
      if (signal?.cancelled) return
      const id = ids[nextIndex]!
      nextIndex += 1
      try {
        const value = await task(id)
        results.set(id, { id, outcome: 'fulfilled', value })
      } catch (error) {
        results.set(id, { id, outcome: 'rejected', error })
      }
      settled += 1
      onTaskSettled?.(settled, ids.length)
    }
  }

  const lanes = Math.min(Math.max(1, concurrency), ids.length)
  await Promise.all(Array.from({ length: lanes }, () => worker()))

  // Preserve input order; tasks never started due to cancellation are 'skipped'.
  return ids.map((id) => results.get(id) ?? { id, outcome: 'skipped' as const })
}
