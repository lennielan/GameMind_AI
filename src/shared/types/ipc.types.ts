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

export interface AppSettings {
  // Steam
  steamApiKey: string
  steamId: string

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
  lmstudioUrl: string
  lmstudioModel: string

  // External APIs
  rawgApiKey: string
  igdbClientId: string
  igdbClientSecret: string

  // App
  theme: 'dark' | 'light' | 'system'
  language: string
  autoSync: boolean
  syncInterval: number // minutes
  cacheEnabled: boolean
  cacheTtl: number // hours

  // Privacy
  analyticsEnabled: boolean
}

export type SettingsKey = keyof AppSettings
