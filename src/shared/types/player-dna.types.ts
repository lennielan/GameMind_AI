// ============================================================
// Player DNA Types
// ============================================================

export interface PlayerDnaTrait {
  name: PlayerDnaTraitName
  value: number // 0-100
  confidence: number // 0-100
  reasoning: string
}

export type PlayerDnaTraitName =
  | 'gameplay_loops'
  | 'progression_systems'
  | 'pacing_preference'
  | 'difficulty_preference'
  | 'exploration_interest'
  | 'storytelling_interest'
  | 'realism_interest'
  | 'sandbox_interest'
  | 'multiplayer_interest'
  | 'competitive_interest'
  | 'grinding_tolerance'
  | 'completionist_behavior'
  | 'preferred_game_length'
  | 'art_style_preference'
  | 'control_complexity'
  | 'learning_curve_tolerance'

export interface PlayerDna {
  steamId: string
  traits: PlayerDnaTrait[]
  favoriteGenres: string[]
  favoriteDevelopers: string[]
  favoritePublishers: string[]
  favoriteReleasePeriods: string[]
  favoriteArtStyles: string[]
  generatedAt: number
  aiProvider: string
  version: number
}

export interface PlayerDnaHistory {
  snapshots: PlayerDna[]
  evolution: DnaEvolution[]
}

export interface DnaEvolution {
  traitName: PlayerDnaTraitName
  previousValue: number
  currentValue: number
  changeDate: number
  possibleReason: string
}
