// ============================================================
// Game Data Types (enriched from multiple sources)
// ============================================================

export interface Game {
  appId: number
  name: string
  playtimeForever: number // minutes
  playtime2Weeks: number // minutes
  imgIconUrl: string
  headerImage: string | null
  hasCommunityVisibleStats: boolean
  lastPlayedAt: number | null
  lastSessionPlaytime?: number | null // minutes of last recorded session
  addedAt: number | null

  // Enriched metadata
  genres: string[]
  tags: string[]
  developers: string[]
  publishers: string[]
  releaseDate: string | null
  metacriticScore: number | null
  description: string | null
  shortDescription: string | null
  screenshots: string[]
  platforms: string[]
  categories: string[]
  priceInitial: number | null
  priceFinal: number | null

  // External data
  hltbMain: number | null // hours
  hltbExtra: number | null
  hltbCompletionist: number | null
  engine: string | null
  franchise: string | null

  // Achievements summary
  totalAchievements: number
  unlockedAchievements: number
  achievementsSyncedAt?: number | null

  updatedAt: number | null
}

export interface GameWithAchievements extends Game {
  achievements: GameAchievement[]
  achievementCompletionPercent: number
}

export interface GameAchievement {
  apiName: string
  displayName: string
  description: string
  icon: string
  iconGray: string
  achieved: boolean
  unlockTime: number | null
  globalPercent: number | null
}

export type GameSortField =
  | 'name'
  | 'playtime'
  | 'lastPlayed'
  | 'metacritic'
  | 'releaseDate'
  | 'achievements'

export type GameSortOrder = 'asc' | 'desc'

export interface GameFilter {
  search: string
  genres: string[]
  tags: string[]
  minPlaytime: number | null
  maxPlaytime: number | null
  hasAchievements: boolean | null
  isPlayed: boolean | null
  sortBy: GameSortField
  sortOrder: GameSortOrder
}
