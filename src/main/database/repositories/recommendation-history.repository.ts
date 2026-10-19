import { supabase } from '../../services/supabase.client'

export interface HistoryEntry {
  appId: number
  gameName: string
  recommendedAt: number
}

export class RecommendationHistoryRepository {
  async addToHistory(steamId: string, appId: number, gameName: string): Promise<void> {
    if (!supabase) return

    // Remove existing entry for this app if it exists (simulate upsert without constraint)
    await supabase
      .from('recommendation_history')
      .delete()
      .eq('steam_id', steamId)
      .eq('app_id', appId)

    const { error } = await supabase
      .from('recommendation_history')
      .insert({
        steam_id: steamId,
        app_id: appId,
        game_name: gameName,
        recommended_at: Date.now()
      })

    if (error) {
      console.error('Failed to add to history in Supabase:', error)
    }

    // Prune history to avoid storing too many items
    const { data } = await supabase
      .from('recommendation_history')
      .select('id')
      .eq('steam_id', steamId)
      .order('recommended_at', { ascending: false })

    if (data && data.length > 50) {
      const idsToDelete = data.slice(50).map(row => row.id)
      await supabase
        .from('recommendation_history')
        .delete()
        .in('id', idsToDelete)
    }
  }

  async getHistory(steamId: string): Promise<HistoryEntry[]> {
    if (!supabase) return []

    const { data, error } = await supabase
      .from('recommendation_history')
      .select('app_id, game_name, recommended_at')
      .eq('steam_id', steamId)
      .order('recommended_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch recommendation history:', error)
      return []
    }

    return (data || []).map(r => ({
      appId: Number(r.app_id),
      gameName: r.game_name || 'Unknown Game',
      recommendedAt: Number(r.recommended_at)
    }))
  }

  async clearHistory(steamId: string): Promise<void> {
    if (!supabase) return
    await supabase
      .from('recommendation_history')
      .delete()
      .eq('steam_id', steamId)
  }
}

