// ============================================================
// IPC Communication Types
// ============================================================

export interface IpcResult<T> {
  success: boolean
  data: T | null
  error: string | null
}

export interface SyncStatus {
  isRunning: boolean
  progress: number // 0-100
  currentStep: string
  totalSteps: number
  currentStepIndex: number
  error: string | null
  startedAt: number | null
  estimatedTimeRemaining: number | null // seconds
  privacyIssue?: boolean // true if Steam profile privacy blocks achievements/wishlist
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export type BaseTheme = 'dark' | 'light' | 'midnight' | 'system'
export type AccentColor = 'violet' | 'crimson' | 'emerald' | 'azure'

export interface AppSettings {
  // Steam
  steamApiKey: string
  steamId: string
  lastSyncTimestamp: number

  // AI
  aiProvider: string
  openaiApiKey: string
  openaiModel: string
  geminiApiKey: string
  geminiModel: string
  claudeApiKey: string
  claudeModel: string
  ollamaUrl: string
  ollamaModel: string
  openrouterApiKey: string
  openrouterModel: string
  groqApiKey: string
  groqModel: string
  aiFeatureUsage: Record<string, number[]>
  lmstudioUrl: string
  lmstudioModel: string

  // External APIs
  rawgApiKey: string
  igdbClientId: string
  igdbClientSecret: string

  // App
  theme: BaseTheme
  accentColor: AccentColor
  language: string
  autoSync: boolean
  syncInterval: number // minutes
  cacheEnabled: boolean
  cacheTtl: number // hours
  chatOverlayEnabled: boolean // New setting for global chat overlay

  // Privacy
  analyticsEnabled: boolean
  
  // System
  launchOnStartup: boolean
  autoLaunchInitialized: boolean
  hasCompletedOnboarding?: boolean
}

export type AiFeatureId = 'recommendations' | 'semantic-search' | 'timeline' | 'player-dna'

export interface AiFeatureUsageStatus {
  feature: AiFeatureId
  limit: number
  used: number
  remaining: number | null
  period: 'day' | 'week' | 'month'
  resetAt: number | null
  unlimited: boolean
}

export type SettingsKey = keyof AppSettings
