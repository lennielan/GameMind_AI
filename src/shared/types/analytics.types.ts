// ============================================================
// Analytics Types
// ============================================================

export interface AnalyticsOverview {
  totalGames: number
  totalPlaytime: number // minutes
  gamesPlayed: number
  gamesNotPlayed: number
  averagePlaytime: number
  medianPlaytime: number
  totalAchievements: number
  unlockedAchievements: number
  completionRate: number // 0-100
  estimatedSpending: number // dollars
  mostPlayedGame: { name: string; playtime: number } | null
  recentlyPlayedCount: number
  libraryGrowthRate: number // games per month estimate
}

export interface GenreDistribution {
  genre: string
  count: number
  totalPlaytime: number
  percentage: number
}

export interface PlaytimeStats {
  daily: PlaytimeDataPoint[]
  weekly: PlaytimeDataPoint[]
  monthly: PlaytimeDataPoint[]
}

export interface PlaytimeDataPoint {
  date: string
  playtime: number
  gamesPlayed: number
}

export interface CompletionStats {
  totalWithAchievements: number
  fullyCompleted: number // 100%
  highCompletion: number // >75%
  mediumCompletion: number // 25-75%
  lowCompletion: number // <25%
  noProgress: number // 0%
  games: GameCompletionEntry[]
}

export interface GameCompletionEntry {
  appId: number
  name: string
  totalAchievements: number
  unlockedAchievements: number
  completionPercent: number
  playtime: number
}

export interface TimelineEntry {
  year: number
  month?: number
  gamesAdded: number
  gamesPlayed: number
  totalPlaytime: number
}

export interface DeveloperDistribution {
  developer: string
  count: number
  totalPlaytime: number
  averagePlaytime: number
}

export interface PublisherDistribution {
  publisher: string
  count: number
  totalPlaytime: number
}

export interface SpendingEstimate {
  totalEstimated: number
  byCurrency: Record<string, number>
  byYear: { year: number; amount: number }[]
  averagePerGame: number
  mostExpensive: { name: string; price: number } | null
  freeGames: number
}
