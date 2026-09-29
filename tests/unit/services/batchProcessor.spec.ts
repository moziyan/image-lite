import { describe, expect, it, vi } from 'vitest'

import { runBatch } from '@/services/image/batchProcessor'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('runBatch', () => {
  it('runs all tasks and preserves input order', async () => {
    const results = await runBatch(['a', 'b', 'c'], (id) => Promise.resolve(id.toUpperCase()), {
      concurrency: 2,
    })
    expect(results.map((r) => r.value)).toEqual(['A', 'B', 'C'])
    expect(results.every((r) => r.outcome === 'fulfilled')).toBe(true)
  })

  it('never exceeds the concurrency limit', async () => {
    let running = 0
    let peak = 0
    const ids = ['1', '2', '3', '4', '5']
    await runBatch(
      ids,
      async () => {
        running += 1
        peak = Math.max(peak, running)
        await new Promise((resolve) => setTimeout(resolve, 10))
        running -= 1
      },
      { concurrency: 2 },
    )
    expect(peak).toBe(2)
  })

  it('clamps concurrency to at least 1', async () => {
    let running = 0
    let peak = 0
    await runBatch(
      ['1', '2'],
      async () => {
        running += 1
        peak = Math.max(peak, running)
        await Promise.resolve()
        running -= 1
      },
      { concurrency: 0 },
    )
    expect(peak).toBe(1)
  })

  it('isolates failures: a rejected task does not stop the others', async () => {
    const results = await runBatch(
      ['a', 'boom', 'c'],
      (id) => (id === 'boom' ? Promise.reject(new Error('nope')) : Promise.resolve(id)),
      { concurrency: 2 },
    )
    expect(results[0]).toMatchObject({ outcome: 'fulfilled', value: 'a' })
    expect(results[1]).toMatchObject({ outcome: 'rejected' })
    expect((results[1]!.error as Error).message).toBe('nope')
    expect(results[2]).toMatchObject({ outcome: 'fulfilled', value: 'c' })
  })

  it('marks unstarted tasks as skipped after cancellation', async () => {
    const signal = { cancelled: false }
    const gate = deferred<void>()
    let started = 0

    const promise = runBatch(
      ['a', 'b', 'c', 'd'],
      async (id) => {
        started += 1
        await gate.promise
        return id
      },
      { concurrency: 2, signal },
    )

    // Let the first two tasks start, then cancel before they finish.
    await vi.waitFor(() => expect(started).toBe(2))
    signal.cancelled = true
    gate.resolve()

    const results = await promise
    expect(results.filter((r) => r.outcome === 'fulfilled')).toHaveLength(2)
    expect(results.filter((r) => r.outcome === 'skipped')).toHaveLength(2)
    expect(results.map((r) => r.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('reports settled counts in order', async () => {
    const settled: Array<[number, number]> = []
    await runBatch(['a', 'b', 'c'], (id) => Promise.resolve(id), {
      concurrency: 2,
      onTaskSettled: (done, total) => settled.push([done, total]),
    })
    expect(settled).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ])
  })

  it('handles an empty id list', async () => {
    const results = await runBatch([], () => Promise.resolve(1), { concurrency: 2 })
    expect(results).toEqual([])
  })
})
