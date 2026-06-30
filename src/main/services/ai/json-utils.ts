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

export function extractAndParseJSON(content: string): any {
  if (!content) return null

  const cleanedContent = content
    .replace(/^```(?:json)?\s*/gi, '')
    .replace(/\s*```$/g, '')
    .trim()

  try {
    return JSON.parse(cleanedContent)
  } catch {
    const jsonString = extractJsonSubstring(cleanedContent)
    if (!jsonString) {
      throw new Error('Failed to extract JSON')
    }

    return JSON.parse(jsonString)
  }
}
