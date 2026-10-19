import { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels'
import { logger } from '../../logger/logger'
import type { AiChatRequest, AiChatResponse } from '../../../shared/types/ai.types'

export interface AIQueueItemDetails {
  id: string
  status: 'queued' | 'processing' | 'retrying' | 'completed' | 'failed'
  position: number
  estimatedWaitMs: number
  retryCount: number
  estimatedTokens: number
  enqueuedAt: number
  error?: string
}

export interface AIQueueStatus {
  pendingCount: number
  activeCount: number
  completedCount: number
  failedCount: number
  retryCount: number
  tokensUsedLastMinute: number
  tpmLimit: number
  items?: AIQueueItemDetails[]
}

export interface AIQueueItemTask<T = AiChatResponse> {
  id: string
  request: AiChatRequest
  overrideProvider?: string
  estimatedTokens: number
  enqueuedAt: number
  execute: () => Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: any) => void
  retryCount: number
  status: 'queued' | 'processing' | 'retrying' | 'completed' | 'failed'
  error?: string
}

export interface AIQueueOptions {
  tpmLimit?: number // default 100,000 tokens per minute (optimized for Gemini Flash 1M TPM)
  maxConcurrency?: number // default 3 concurrent requests
  maxRetries?: number // default 2 retries for 429/503
  baseDelayMs?: number // default 800ms base backoff
  maxDelayMs?: number // default 4000ms max backoff
  minRequestSpacingMs?: number // default 200ms pacing delay between request dispatches
}

export class AIQueueService {
  private queue: AIQueueItemTask[] = []
  private activeCount = 0
  private completedCount = 0
  private failedCount = 0
  private retryCount = 0

  private tpmLimit: number
  private maxConcurrency: number
  private maxRetries: number
  private baseDelayMs: number
  private maxDelayMs: number
  private minRequestSpacingMs: number

  // Sliding window token log: entries of { timestamp: number, tokens: number }
  private tokenWindow: Array<{ timestamp: number; tokens: number }> = []

  private isProcessing = false
  private lastDispatchTime = 0

  constructor(options?: AIQueueOptions) {
    this.tpmLimit = options?.tpmLimit ?? 100000
    this.maxConcurrency = options?.maxConcurrency ?? 3
    this.maxRetries = options?.maxRetries ?? 2
    this.baseDelayMs = options?.baseDelayMs ?? 800
    this.maxDelayMs = options?.maxDelayMs ?? 4000
    this.minRequestSpacingMs = options?.minRequestSpacingMs ?? 200
  }

  /**
   * Estimate token footprint for an AI Chat Request.
   * Heuristic: ~4 chars per prompt token + maxTokens allowance.
   */
  public estimateTokens(request: AiChatRequest): number {
    const promptText = request.messages.map(m => m.content).join(' ')
    const promptTokens = Math.ceil(promptText.length / 4)
    const maxTokens = request.maxTokens ?? 1000
    return promptTokens + maxTokens
  }

  /**
   * Calculate total tokens used in the last 60 seconds (sliding window).
   */
  public getTokensUsedLastMinute(): number {
    const now = Date.now()
    const windowStart = now - 60000
    this.tokenWindow = this.tokenWindow.filter(entry => entry.timestamp > windowStart)
    return this.tokenWindow.reduce((acc, entry) => acc + entry.tokens, 0)
  }

  /**
   * Record token consumption into the sliding window.
   */
  public recordTokenUsage(tokens: number): void {
    this.tokenWindow.push({ timestamp: Date.now(), tokens })
  }

  /**
   * Get overall queue metrics and active pending items with wait time estimates.
   */
  public getQueueStatus(): AIQueueStatus {
    const pendingCount = this.queue.length
    const tokensUsedLastMinute = this.getTokensUsedLastMinute()
    
    // Estimate wait times for queue items
    let accumulatedTokens = tokensUsedLastMinute
    let accumulatedTimeMs = 0

    const items: AIQueueItemDetails[] = this.queue.map((item, index) => {
      accumulatedTokens += item.estimatedTokens
      if (accumulatedTokens > this.tpmLimit) {
        const oldestEntry = this.tokenWindow[0]
        const resetMs = oldestEntry ? Math.max(500, (oldestEntry.timestamp + 60000) - Date.now()) : 5000
        accumulatedTimeMs += resetMs
      } else {
        accumulatedTimeMs += (index + 1) * this.minRequestSpacingMs
      }

      return {
        id: item.id,
        status: item.status,
        position: index + 1,
        estimatedWaitMs: accumulatedTimeMs,
        retryCount: item.retryCount,
        estimatedTokens: item.estimatedTokens,
        enqueuedAt: item.enqueuedAt,
        error: item.error
      }
    })

    return {
      pendingCount,
      activeCount: this.activeCount,
      completedCount: this.completedCount,
      failedCount: this.failedCount,
      retryCount: this.retryCount,
      tokensUsedLastMinute,
      tpmLimit: this.tpmLimit,
      items
    }
  }

  public setTpmLimit(limit: number): void {
    this.tpmLimit = limit
  }

  public setMaxConcurrency(concurrency: number): void {
    this.maxConcurrency = concurrency
  }

  /**
   * Enqueue an AI request to be processed under TPM rate limits & concurrency limits.
   */
  public enqueue<T = AiChatResponse>(
    request: AiChatRequest,
    executeFn: () => Promise<T>,
    overrideProvider?: string
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const estimatedTokens = this.estimateTokens(request)
      const task: AIQueueItemTask<T> = {
        id: `ai_task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        request,
        overrideProvider,
        estimatedTokens,
        enqueuedAt: Date.now(),
        execute: executeFn,
        resolve: resolve as any,
        reject,
        retryCount: 0,
        status: 'queued'
      }

      this.queue.push(task as any)
      logger.info('AIQueueService', `Task ${task.id} enqueued (estimated tokens: ${estimatedTokens}). Queue length: ${this.queue.length}`)
      
      this.broadcastQueueStatus()
      this.processQueue()
    })
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return
    this.isProcessing = true

    try {
      while (this.queue.length > 0 && this.activeCount < this.maxConcurrency) {
        const now = Date.now()
        const tokensUsed = this.getTokensUsedLastMinute()
        const nextTask = this.queue[0]

        if (!nextTask) break

        // Rate-limiting check: delay if executing nextTask exceeds TPM limit
        if (tokensUsed + nextTask.estimatedTokens > this.tpmLimit && tokensUsed > 0) {
          const oldestEntry = this.tokenWindow[0]
          const waitMs = oldestEntry ? Math.max(200, (oldestEntry.timestamp + 60000) - now + 50) : 1000
          
          logger.info(
            'AIQueueService',
            `TPM limit check: ${tokensUsed}/${this.tpmLimit} tokens used in last 60s. Pacing task ${nextTask.id} by ${waitMs}ms`
          )
          this.broadcastQueueStatus()
          await new Promise(resolve => setTimeout(resolve, waitMs))
          continue
        }

        // Pacing delay: enforce minimum spacing between request dispatches
        const timeSinceLastDispatch = now - this.lastDispatchTime
        if (timeSinceLastDispatch < this.minRequestSpacingMs) {
          await new Promise(resolve => setTimeout(resolve, this.minRequestSpacingMs - timeSinceLastDispatch))
        }

        const task = this.queue.shift()!
        task.status = 'processing'
        this.activeCount++
        this.lastDispatchTime = Date.now()

        // Track initial estimated tokens in sliding window
        this.recordTokenUsage(task.estimatedTokens)

        this.broadcastQueueStatus()

        // Execute task asynchronously
        this.executeTask(task)
      }
    } finally {
      this.isProcessing = false
    }
  }

  private async executeTask(task: AIQueueItemTask): Promise<void> {
    try {
      const response = (await task.execute()) as AiChatResponse

      // If response reports actual token usage, adjust token window entry
      if (response && response.tokensUsed && typeof response.tokensUsed.total === 'number') {
        const actual = response.tokensUsed.total
        const diff = actual - task.estimatedTokens
        if (diff !== 0 && this.tokenWindow.length > 0) {
          const lastEntry = this.tokenWindow[this.tokenWindow.length - 1]
          if (lastEntry) {
            lastEntry.tokens = Math.max(0, lastEntry.tokens + diff)
          }
        }
      }

      task.status = 'completed'
      this.activeCount--
      this.completedCount++
      logger.info('AIQueueService', `Task ${task.id} completed successfully. Active: ${this.activeCount}`)
      
      task.resolve(response)
    } catch (error: any) {
      const errMsg = (error?.message || '').toLowerCase()
      const isRateLimit =
        errMsg.includes('429') ||
        errMsg.includes('503') ||
        errMsg.includes('rate limit') ||
        errMsg.includes('tpm') ||
        errMsg.includes('tokens per minute') ||
        errMsg.includes('too many requests') ||
        errMsg.includes('service unavailable')

      if (isRateLimit && task.retryCount < this.maxRetries) {
        task.retryCount++
        this.retryCount++
        task.status = 'retrying'
        task.error = error?.message || 'Rate Limit Exceeded'
        
        // Calculate exponential backoff delay with jitter: 1s, 2s, 4s, 8s, 16s + jitter [0..500ms]
        const jitter = Math.floor(Math.random() * 500)
        const backoffMs = Math.min(
          this.maxDelayMs,
          Math.pow(2, task.retryCount - 1) * this.baseDelayMs + jitter
        )

        logger.warn(
          'AIQueueService',
          `Task ${task.id} rate limited (429/503). Exponential backoff retry ${task.retryCount}/${this.maxRetries} in ${backoffMs}ms...`
        )

        this.broadcastQueueStatus()

        // Re-enqueue task after exponential backoff delay
        setTimeout(() => {
          this.activeCount--
          task.status = 'queued'
          // Put back at front of queue for priority processing
          this.queue.unshift(task)
          this.broadcastQueueStatus()
          this.processQueue()
        }, backoffMs)

        return
      }

      task.status = 'failed'
      task.error = error?.message || String(error)
      this.activeCount--
      this.failedCount++
      logger.error('AIQueueService', `Task ${task.id} failed after ${task.retryCount} retries`, error)
      task.reject(error)
    } finally {
      this.broadcastQueueStatus()
      setImmediate(() => this.processQueue())
    }
  }

  private broadcastQueueStatus(): void {
    try {
      const status = this.getQueueStatus()
      if (typeof BrowserWindow !== 'undefined' && BrowserWindow?.getAllWindows) {
        BrowserWindow.getAllWindows().forEach(win => {
          if (!win.isDestroyed()) {
            win.webContents.send(IPC_CHANNELS.AI_QUEUE_STATUS_UPDATE, status)
          }
        })
      }
    } catch {
      // Ignore IPC broadcast errors when running in non-Electron environment
    }
  }

  /**
   * Reset internal queue state & counters (for testing and reset).
   */
  public resetStats(): void {
    this.queue = []
    this.activeCount = 0
    this.completedCount = 0
    this.failedCount = 0
    this.retryCount = 0
    this.tokenWindow = []
    this.isProcessing = false
    this.lastDispatchTime = 0
  }
}

export const aiQueueService = new AIQueueService()
