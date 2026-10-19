// ============================================================
// Timeline Types - "Story of the Gamer"
// ============================================================

export type TimelineEntryType = 
  | 'era_summary'
  | 'yearly_chapter'
  | 'defining_game'
  | 'alternate_history'
  | 'milestone'
  | 'legacy_conclusion'
  | 'future_prediction'

export interface TimelineEntry {
  id: string
  type: TimelineEntryType
  date: number // MS timestamp for chronological sorting
  title: string
  
  // Objective, verifiable data
  facts?: {
    gamesCount?: number
    hoursPlayed?: number
    achievementsEarned?: number
    dominantGenres?: string[]
    topGames?: Array<{ name: string, appId: number, hours: number, headerImage?: string }>
    favoriteDeveloper?: string
    globalPercent?: number
  }

  // AI Generated narratives and hypotheses
  aiInterpretation?: {
    narrative?: string
    alternateHistoryHypothesis?: string // For "What If" scenarios
    futurePrediction?: string
    confidence?: 'low' | 'medium' | 'high'
  }

  // UI Context
  metadata?: {
    appId?: number
    gameName?: string
    headerImage?: string
    achievementName?: string
    achievementIcon?: string
    eraName?: string
    startDate?: number
    endDate?: number
    games?: any[]
    shards?: Array<{ name: string; icon?: string }>
    companionName?: string
    companionAvatar?: string
  }
}
