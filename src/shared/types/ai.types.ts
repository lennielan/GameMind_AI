// ============================================================
// AI Provider Types
// ============================================================

export type AiProviderType = 'openai' | 'gemini' | 'claude' | 'ollama' | 'openrouter' | 'groq' | 'lmstudio'

export interface AiProviderConfig {
  type: AiProviderType
  name: string
  apiKey: string
  model: string
  baseUrl?: string // for Ollama or custom endpoints
  maxTokens: number
  temperature: number
  enabled: boolean
}

export interface AiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AiChatRequest {
  messages: AiMessage[]
  maxTokens?: number
  temperature?: number
  responseFormat?: 'text' | 'json'
  timeoutMs?: number
  cacheFeature?: string
}

export interface AiChatResponse {
  content: string
  provider: AiProviderType
  model: string
  tokensUsed: {
    prompt: number
    completion: number
    total: number
  }
  latencyMs: number
}

export interface AiRecommendation {
  id: number
  gameName: string
  appId: number | null
  reasoning: string
  matchScore: number // 0-100
  tags: string[]
  generatedAt: number
  userFeedback: 'liked' | 'disliked' | null
}

export interface AiInsight {
  id: number
  category: InsightCategory
  title: string
  description: string
  severity: 'info' | 'interesting' | 'notable' | 'surprising'
  data: Record<string, unknown> | null
  generatedAt: number
  dismissed: boolean
}

export type InsightCategory =
  | 'playtime'
  | 'genres'
  | 'completion'
  | 'spending'
  | 'trends'
  | 'social'
  | 'behavior'
  | 'discovery'
