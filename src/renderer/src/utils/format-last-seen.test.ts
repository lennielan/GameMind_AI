import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatLastSeen, formatLastSeenUppercase } from './format-last-seen'

const t = (_key: string, fallbackOrOptions?: any): string => {
  if (typeof fallbackOrOptions === 'string') return fallbackOrOptions
  return fallbackOrOptions?.defaultValue?.replace('{{count}}', String(fallbackOrOptions.count)) || ''
}

describe('formatLastSeen', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses created_at as a recent fallback for newly registered users', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-26T00:00:30.000Z'))

    expect(formatLastSeen(t, null, '2026-08-26T00:00:00.000Z')).toBe('в сети недавно')
    expect(formatLastSeenUppercase(t, null, '2026-08-26T00:00:00.000Z')).toBe('В сети недавно')
  })

  it('still shows the long-ago fallback when both timestamps are missing or invalid', () => {
    expect(formatLastSeen(t, null, null)).toBe('был(а) в сети давно')
    expect(formatLastSeenUppercase(t, 'not-a-date', null)).toBe('Был(а) в сети давно')
  })
})
