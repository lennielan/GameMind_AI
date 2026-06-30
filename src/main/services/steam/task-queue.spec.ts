import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../logger/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

import { TaskQueue } from './task-queue'

describe('TaskQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('should process all items with a base delay between them', async () => {
    const queue = new TaskQueue(100, 1000)
    const items = [1, 2, 3]
    const processed: number[] = []

    const taskFn = async (item: number) => {
      processed.push(item)
    }

    const promise = queue.run(items, taskFn)
    
    // First item runs immediately
    await vi.advanceTimersByTimeAsync(0)
    expect(processed).toEqual([1])
    
    // Second item runs after 100ms
    await vi.advanceTimersByTimeAsync(100)
    expect(processed).toEqual([1, 2])
    
    // Third item runs after another 100ms
    await vi.advanceTimersByTimeAsync(100)
    expect(processed).toEqual([1, 2, 3])
    
    await vi.runAllTimersAsync()
    await promise
  })

  it('should implement exponential backoff on 429 error and retry', async () => {
    const queue = new TaskQueue(100, 300000)
    const items = [1]
    
    let attempts = 0
    const taskFn = async (_item: number) => {
      attempts++
      if (attempts === 1) {
        throw new Error('HTTP 429 Too Many Requests')
      }
    }

    const backoffs: number[] = []
    const onBackoff = (ms: number) => {
      backoffs.push(ms)
    }

    const promise = queue.run(items, taskFn, undefined, onBackoff)
    
    // First attempt fails, triggers 30s backoff
    await vi.advanceTimersByTimeAsync(0)
    expect(attempts).toBe(1)
    
    // Waiting for backoff (30000ms)
    await vi.advanceTimersByTimeAsync(30000)
    
    // Second attempt succeeds
    expect(attempts).toBe(2)
    
    await vi.runAllTimersAsync()
    await promise
    
    expect(backoffs).toEqual([30000])
  })

  it('should cap backoff at maxBackoffMs and skip item if exceeded', async () => {
    const queue = new TaskQueue(100, 50000) // max backoff 50s
    const items = [1, 2]
    
    let item1Attempts = 0
    const taskFn = async (item: number) => {
      if (item === 1) {
        item1Attempts++
        throw new Error('HTTP 429')
      }
      // Item 2 succeeds immediately
    }

    const promise = queue.run(items, taskFn)
    
    // Item 1: attempt 1 (fails, backoff 30s)
    await vi.advanceTimersByTimeAsync(0)
    
    // Item 1: attempt 2 after 30s (fails, backoff 60s, but max is 50s so it aborts)
    await vi.advanceTimersByTimeAsync(30000)
    
    // Item 2 should now be processed since Item 1 aborted
    await vi.advanceTimersByTimeAsync(100)
    
    await vi.runAllTimersAsync()
    await promise
    
    expect(item1Attempts).toBe(2)
  })
})
