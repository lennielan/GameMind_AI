import { logger } from '../../logger/logger'

export class TaskQueue {
  private baseDelayMs: number
  private maxBackoffMs: number

  constructor(baseDelayMs: number = 100, maxBackoffMs: number = 300000) {
    this.baseDelayMs = baseDelayMs
    this.maxBackoffMs = maxBackoffMs
  }

  async run<T>(
    items: T[],
    taskFn: (item: T, index: number) => Promise<void>,
    onProgress?: (progress: number, item: T, index: number, total: number) => void,
    onBackoff?: (backoffMs: number, item: T, index: number) => void
  ): Promise<void> {
    let backoffMs = 0

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      let success = false

      if (onProgress) {
        onProgress(Math.floor((i / items.length) * 100), item, i, items.length)
      }

      while (!success) {
        try {
          if (backoffMs > 0) {
            if (onBackoff) onBackoff(backoffMs, item, i)
            await new Promise(resolve => setTimeout(resolve, backoffMs))
          }

          await taskFn(item, i)
          
          success = true
          backoffMs = 0 // Reset backoff on success
          
          // Small delay to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, this.baseDelayMs))

        } catch (e: any) {
          if (e.message?.includes('429')) {
            // Exponential backoff: start at 30s, double each time
            backoffMs = backoffMs === 0 ? 30000 : backoffMs * 2
            logger.warn('TaskQueue', `HTTP 429 Too Many Requests. Backing off for ${backoffMs}ms`)
            
            // Cap backoff at max
            if (backoffMs > this.maxBackoffMs) {
              logger.error('TaskQueue', 'Max backoff reached, aborting task for this item')
              success = true // Skip this item
              backoffMs = 0
            }
          } else {
            logger.warn('TaskQueue', `Task failed: ${e.message}`)
            success = true // Skip this item on other errors
          }
        }
      }
    }
  }
}
