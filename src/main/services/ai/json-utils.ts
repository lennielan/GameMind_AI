import { z } from 'zod'
import { logger } from '../../logger/logger'
import { jsonrepair } from 'jsonrepair'

export function extractJsonSubstring(content: string): string | null {
  if (!content) return null

  const cleanedContent = content
    .replace(/^```(?:json)?\s*/gi, '')
    .replace(/\s*```$/g, '')
    .trim()

  const candidates = [
    { open: '{', close: '}' },
    { open: '[', close: ']' }
  ]

  let bestStart = -1
  let bestEnd = -1

  for (const candidate of candidates) {
    const start = cleanedContent.indexOf(candidate.open)
    const end = cleanedContent.lastIndexOf(candidate.close)

    if (start !== -1 && end !== -1 && start < end) {
      const isBetterCandidate = bestStart === -1 || start < bestStart || (start === bestStart && end > bestEnd)
      if (isBetterCandidate) {
        bestStart = start
        bestEnd = end
      }
    }
  }

  if (bestStart === -1 || bestEnd === -1 || bestStart >= bestEnd) {
    return null
  }

  return cleanedContent.substring(bestStart, bestEnd + 1)
}

export function extractAndParseJSON(content: any): any {
  if (!content) return null
  
  if (typeof content === 'object') return content;

  const cleanedContent = String(content)
    .replace(/^```(?:json)?\s*/gi, '')
    .replace(/\s*```$/g, '')
    .trim()

  try {
    return JSON.parse(cleanedContent)
  } catch {
    let jsonString = extractJsonSubstring(cleanedContent)
    if (!jsonString) {
      logger.error('JsonUtils', `Failed to extract JSON. Raw content: ${cleanedContent}`)
      throw new Error('Failed to extract JSON')
    }

    try {
      return JSON.parse(jsonString)
    } catch (e) {
      // Third try: Use jsonrepair library to fix truncated or malformed JSON
      try {
        const repaired = jsonrepair(jsonString)
        logger.warn('JsonUtils', `Repaired malformed JSON using jsonrepair. Original: ${jsonString}, Repaired: ${repaired}`)
        return JSON.parse(repaired)
      } catch (err) {
        logger.error('JsonUtils', `Final JSON parse failed after jsonrepair. Content: ${jsonString}`, err)
        throw err
      }
    }
  }
}

export function safeParseJsonWithSchema<T>(content: any, schema: z.ZodType<T>, fallback: T): T {
  try {
    const rawJson = extractAndParseJSON(content)
    return schema.parse(rawJson)
  } catch (error) {
    logger.error('JsonUtils', `Failed to parse or validate AI JSON response. Raw content: ${content}`, error)
    return fallback
  }
}
