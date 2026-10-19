export function formatLastSeen(t: any, lastSeenStr?: string | null, createdAtStr?: string | null): string {
  const targetDateStr = lastSeenStr || createdAtStr
  if (!targetDateStr) return t('friends.status.onlineLongAgo', 'был(а) в сети давно')
  
  const lastSeen = new Date(targetDateStr)
  if (isNaN(lastSeen.getTime())) return t('friends.status.onlineLongAgo', 'был(а) в сети давно')
  
  const now = new Date()
  const diffMs = now.getTime() - lastSeen.getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))
  
  if (diffMinutes < 1) return t('friends.status.onlineRecently', 'в сети недавно')
  if (diffMinutes < 60) {
    return t('friends.status.minutesAgo', { count: diffMinutes, defaultValue: 'в сети {{count}} минут назад' })
  }
  
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return t('friends.status.hoursAgo', { count: diffHours, defaultValue: 'в сети {{count}} часов назад' })
  }
  
  const diffDays = Math.floor(diffHours / 24)
  return t('friends.status.daysAgo', { count: diffDays, defaultValue: 'в сети {{count}} дней назад' })
}

export function formatLastSeenUppercase(t: any, lastSeenStr?: string | null, createdAtStr?: string | null): string {
  const targetDateStr = lastSeenStr || createdAtStr
  if (!targetDateStr) return t('friends.status.onlineLongAgoUppercase', 'Был(а) в сети давно')
  
  const lastSeen = new Date(targetDateStr)
  if (isNaN(lastSeen.getTime())) return t('friends.status.onlineLongAgoUppercase', 'Был(а) в сети давно')
  
  const now = new Date()
  const diffMs = now.getTime() - lastSeen.getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))
  
  if (diffMinutes < 1) return t('friends.status.onlineRecentUppercase', 'В сети недавно')
  
  const formatted = formatLastSeen(t, lastSeenStr, createdAtStr)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}
