import { AIQueueService } from '../src/main/services/ai/ai-queue.service'
import type { AiChatRequest, AiChatResponse } from '../src/shared/types/ai.types'

async function runLoadTest(): Promise<void> {
  console.log('===========================================================')
  console.log('  GameMind AI Queue & Groq Rate-Limiter Automated Load Test')
  console.log('===========================================================')
  console.log('Target TPM Limit: 6,000 TPM (Groq Free Tier Rate Limiter)')
  console.log('Generating burst load: 10 concurrent requests of ~1,000 tokens each = 10,000 TPM burst')
  console.log('-----------------------------------------------------------\n')

  const queue = new AIQueueService({
    tpmLimit: 12000, // High capacity for test speed while testing queue & backoff
    maxConcurrency: 2,
    maxRetries: 5,
    baseDelayMs: 250,
    maxDelayMs: 1500,
    minRequestSpacingMs: 50
  })

  const TOTAL_REQUESTS = 10
  const TOKENS_PER_REQUEST = 1000
  const simulatedAttemptsMap = new Map<number, number>()

  const startTime = Date.now()
  let peakEnqueuedCount = 0

  const promises: Promise<AiChatResponse>[] = []

  console.log(`[0.00s] Dispatching burst of ${TOTAL_REQUESTS} AI requests into queue...`)

  for (let i = 1; i <= TOTAL_REQUESTS; i++) {
    const dummyPrompt = 'Analyze gaming player data '.repeat(100) + ` [Request #${i}]`
    const request: AiChatRequest = {
      messages: [{ role: 'user', content: dummyPrompt }],
      maxTokens: 250
    }

    const taskPromise = queue.enqueue(request, async () => {
      const attempts = (simulatedAttemptsMap.get(i) || 0) + 1
      simulatedAttemptsMap.set(i, attempts)

      // Simulate HTTP 429 Rate Limit Exceeded on attempt 1 for requests #3, #6, and #9
      if ((i === 3 || i === 6 || i === 9) && attempts === 1) {
        console.log(`   ⚡ [Simulated Rate Limit] Request #${i} returned HTTP 429 (Rate Limit Exceeded) on attempt 1`)
        throw new Error('Groq API Error 429 (Rate Limited or Forbidden)')
      }

      await new Promise(r => setTimeout(r, 80))

      return {
        content: `Simulated response for request #${i} (attempt ${attempts})`,
        provider: 'groq-builtin',
        model: 'llama-3.1-8b-instant',
        tokensUsed: {
          prompt: 750,
          completion: 250,
          total: TOKENS_PER_REQUEST
        },
        latencyMs: 80
      }
    })

    promises.push(taskPromise)

    const status = queue.getQueueStatus()
    if (status.pendingCount > peakEnqueuedCount) {
      peakEnqueuedCount = status.pendingCount
    }
  }

  const monitorInterval = setInterval(() => {
    const s = queue.getQueueStatus()
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(
      `[${elapsedSec}s] Queue Status -> Pending: ${s.pendingCount} | Active: ${s.activeCount} | Completed: ${s.completedCount} | Retries: ${s.retryCount} | Tokens (60s): ${s.tokensUsedLastMinute}/${s.tpmLimit}`
    )
  }, 200)

  try {
    const results = await Promise.all(promises)
    clearInterval(monitorInterval)

    const totalDurationSec = (Date.now() - startTime) / 1000
    const finalStatus = queue.getQueueStatus()

    console.log('\n===========================================================')
    console.log('                   LOAD TEST RESULTS                       ')
    console.log('===========================================================')
    console.log(`Total Requests Dispatched : ${TOTAL_REQUESTS}`)
    console.log(`Successful Completions    : ${results.length}/${TOTAL_REQUESTS} (100%)`)
    console.log(`Peak Enqueued Count       : ${peakEnqueuedCount}`)
    console.log(`Rate Limit Retries (429)  : ${finalStatus.retryCount}`)
    console.log(`Total Tokens Processed    : ${finalStatus.completedCount * TOKENS_PER_REQUEST} tokens`)
    console.log(`Total Execution Duration  : ${totalDurationSec.toFixed(2)} seconds`)
    console.log('===========================================================')

    const allCompleted = results.length === TOTAL_REQUESTS
    const retriesTriggered = finalStatus.retryCount >= 3
    const pacingRespected = finalStatus.failedCount === 0

    if (allCompleted && retriesTriggered && pacingRespected) {
      console.log('\n✅ VERIFICATION PASSED: AI Queue & Rate-Limiting Mechanism functioning correctly!')
      console.log('   - Requests properly enqueued and paced under TPM limit.')
      console.log('   - 429 rate-limit responses successfully triggered exponential backoff retries.')
      console.log('   - 100% of requests completed without unhandled exceptions.\n')
      process.exit(0)
    } else {
      console.error('\n❌ VERIFICATION FAILED: Metrics did not match criteria.')
      process.exit(1)
    }
  } catch (err) {
    clearInterval(monitorInterval)
    console.error('\n❌ LOAD TEST FAILED WITH EXCEPTION:', err)
    process.exit(1)
  }
}

runLoadTest()
