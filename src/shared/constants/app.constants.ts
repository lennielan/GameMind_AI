// ============================================================
// Application Constants
// ============================================================

export const APP_NAME = 'GameMind AI'
export const APP_VERSION = '0.1.0'

export const WINDOW_CONFIG = {
  MIN_WIDTH: 1024,
  MIN_HEIGHT: 700,
  DEFAULT_WIDTH: 1440,
  DEFAULT_HEIGHT: 900
} as const

export const CACHE_TTL = {
  STEAM_PROFILE: 1000 * 60 * 30, // 30 minutes
  STEAM_GAMES: 1000 * 60 * 60, // 1 hour
  STEAM_ACHIEVEMENTS: 1000 * 60 * 60 * 6, // 6 hours
  GAME_DETAILS: 1000 * 60 * 60 * 24, // 24 hours
  EXTERNAL_API: 1000 * 60 * 60 * 12, // 12 hours
  AI_RESPONSE: 1000 * 60 * 60 * 24 * 7 // 7 days
} as const

export const SYNC_INTERVALS = {
  BACKGROUND_SYNC: 1000 * 60 * 15, // 15 minutes
  ACHIEVEMENT_BATCH_SIZE: 10, // games per batch
  API_REQUEST_DELAY: 1500 // ms between API calls
} as const
