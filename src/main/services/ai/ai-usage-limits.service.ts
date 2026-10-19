import { configManager } from '../../config/config-manager'
import type { AiFeatureId, AiFeatureUsageStatus } from '@shared/types'
import { userProfileRepository } from '../../database/repository.factory'
import { supabase } from '../supabase.client'

type Period = 'day' | 'week' | 'month'

const LIMITS: Record<AiFeatureId, { limit: number; period: Period }> = {
  recommendations: { limit: 3, period: 'day' },
  'semantic-search': { limit: 5, period: 'day' },
  timeline: { limit: 1, period: 'month' },
  'player-dna': { limit: 1, period: 'week' }
}

export class AiUsageLimitError extends Error {
  constructor(public readonly status: AiFeatureUsageStatus) {
    super('AI_USAGE_LIMIT_REACHED')
  }
}

class AiUsageLimitsService {
  async getAll(): Promise<AiFeatureUsageStatus[]> {
    const statuses = await Promise.all(
      (Object.keys(LIMITS) as AiFeatureId[]).map(feature => this.getStatus(feature))
    )
    return statuses
  }

  async getStatus(feature: AiFeatureId): Promise<AiFeatureUsageStatus> {
    const { limit, period } = LIMITS[feature]
    if (this.hasPersonalProvider() || this.isAdmin()) {
      return { feature, limit, used: 0, remaining: null, period, resetAt: null, unlimited: true }
    }

    if (!supabase) {
      return { feature, limit, used: 0, remaining: limit, period, resetAt: null, unlimited: false }
    }

    try {
      const { data, error } = await supabase.rpc('get_ai_usage_status', { p_feature: feature })
      if (error) throw error

      const used = data?.used || 0
      const remaining = Math.max(0, limit - used)

      return { 
        feature, 
        limit, 
        used, 
        remaining, 
        period, 
        resetAt: this.nextPeriodStart(period, Date.now()), 
        unlimited: false 
      }
    } catch (e) {
      console.error(`Failed to get usage status for ${feature}:`, e)
      return { feature, limit, used: 0, remaining: limit, period, resetAt: null, unlimited: false }
    }
  }

  async reserve(feature: AiFeatureId): Promise<() => void> {
    if (this.hasPersonalProvider() || this.isAdmin()) {
      return () => undefined
    }

    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { data: allowed, error } = await supabase.rpc('check_and_reserve_ai_usage', { p_feature: feature })
    
    if (error) {
      console.error(`Failed to reserve AI usage for ${feature}:`, error)
      throw new Error('Failed to check AI usage limits on server')
    }

    if (!allowed) {
      const status = await this.getStatus(feature)
      throw new AiUsageLimitError(status)
    }

    return () => {
      if (supabase) {
        supabase.rpc('rollback_ai_usage', { p_feature: feature }).then(({ error }) => {
          if (error) console.error(`Failed to rollback AI usage for ${feature}:`, error)
        })
      }
    }
  }

  private hasPersonalProvider(): boolean {
    const provider = configManager.get('aiProvider')
    if (provider === 'gemini') return Boolean(configManager.get('geminiApiKey'))
    if (provider === 'groq') return Boolean(configManager.get('groqApiKey'))
    if (provider === 'ollama' || provider === 'lmstudio') return true
    if (provider === 'openai') return Boolean(configManager.get('openaiApiKey'))
    if (provider === 'claude') return Boolean(configManager.get('claudeApiKey'))
    if (provider === 'openrouter') return Boolean(configManager.get('openrouterApiKey'))
    return false
  }

  private isAdmin(): boolean {
    try {
      const profile = userProfileRepository.getProfile()
      const adminSteamId = process.env.ADMIN_STEAM_ID || process.env.VITE_ADMIN_STEAM_ID
      return Boolean(adminSteamId && profile?.steamId === adminSteamId)
    } catch (e) {
      return false
    }
  }

  private periodStart(period: Period, now: number): number {
    const date = new Date(now)
    if (period === 'day') date.setHours(0, 0, 0, 0)
    if (period === 'week') {
      const day = date.getDay() || 7
      date.setDate(date.getDate() - day + 1)
      date.setHours(0, 0, 0, 0)
    }
    if (period === 'month') { date.setDate(1); date.setHours(0, 0, 0, 0) }
    return date.getTime()
  }

  private nextPeriodStart(period: Period, now: number): number {
    const date = new Date(this.periodStart(period, now))
    if (period === 'day') date.setDate(date.getDate() + 1)
    if (period === 'week') date.setDate(date.getDate() + 7)
    if (period === 'month') date.setMonth(date.getMonth() + 1)
    return date.getTime()
  }
}

export const aiUsageLimits = new AiUsageLimitsService()
