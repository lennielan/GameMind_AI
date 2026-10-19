import { supabase } from '../../services/supabase.client'
import { logger } from '../../logger/logger'

export interface FavoriteEntry {
  appId: number | null
  gameName: string
  headerImage: string | null
  score: number
  reasoning: string | null
  hardwareEvaluation: string | null
  context: string | null
  aiReview: string | null
  addedAt: number
}

export class FavoritesRepository {
  async addToFavorites(steamId: string, data: {
    appId: number | null
    gameName: string
    headerImage: string | null
    score: number
    reasoning: string | null
    hardwareEvaluation: string | null
    context: string | null
  }): Promise<void> {
    if (!supabase) throw new Error('Supabase client is not initialized')

    const { error } = await supabase
      .from('favorites')
      .upsert({
        steam_id: steamId,
        app_id: data.appId,
        game_name: data.gameName,
        header_image: data.headerImage,
        score: data.score,
        reasoning: data.reasoning,
        hardware_evaluation: data.hardwareEvaluation,
        context: data.context,
        added_at: Date.now()
      }, { onConflict: 'steam_id, game_name' })

    if (error) {
      logger.error('FavoritesRepository', 'Failed to add to favorites', error)
      throw error
    }
  }

  async removeFromFavorites(steamId: string, gameName: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client is not initialized')

    const { error } = await supabase
      .from('favorites')
      .delete()
      .match({ steam_id: steamId, game_name: gameName })

    if (error) {
      logger.error('FavoritesRepository', 'Failed to remove from favorites', error)
      throw error
    }
  }

  async getFavorites(steamId: string): Promise<FavoriteEntry[]> {
    if (!supabase) {
      logger.warn('FavoritesRepository', 'Supabase client is not initialized, returning empty favorites list')
      return []
    }

    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('steam_id', steamId)
      .order('added_at', { ascending: false })

    if (error) {
      if (error.message && error.message.includes('fetch failed')) {
        logger.warn('FavoritesRepository', 'Failed to get favorites (network error), returning empty list')
      } else {
        logger.error('FavoritesRepository', 'Failed to get favorites', error)
      }
      return []
    }

    return (data || []).map(row => ({
      appId: row.app_id,
      gameName: row.game_name,
      headerImage: row.header_image,
      score: row.score,
      reasoning: row.reasoning,
      hardwareEvaluation: row.hardware_evaluation,
      context: row.context,
      aiReview: row.ai_review,
      addedAt: row.added_at
    }))
  }

  async isFavorite(steamId: string, gameName: string): Promise<boolean> {
    if (!supabase) return false

    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .match({ steam_id: steamId, game_name: gameName })
      .maybeSingle()

    if (error) {
      logger.error('FavoritesRepository', 'Failed to check favorite status', error)
      throw error
    }

    return !!data
  }

  async updateAiReview(steamId: string, gameName: string, review: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client is not initialized')

    const { error } = await supabase
      .from('favorites')
      .update({ ai_review: review })
      .match({ steam_id: steamId, game_name: gameName })

    if (error) {
      logger.error('FavoritesRepository', 'Failed to update AI review', error)
      throw error
    }
  }

  async getAiReview(steamId: string, gameName: string): Promise<string | null> {
    if (!supabase) return null

    const { data, error } = await supabase
      .from('favorites')
      .select('ai_review')
      .match({ steam_id: steamId, game_name: gameName })
      .maybeSingle()

    if (error) {
      logger.error('FavoritesRepository', 'Failed to get AI review', error)
      throw error
    }

    return data?.ai_review || null
  }
}

