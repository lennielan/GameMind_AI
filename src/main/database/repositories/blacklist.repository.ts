import { supabase } from '../../services/supabase.client'

export interface BlacklistEntry {
  appId: number
  gameName: string
  addedAt: number
}

export class BlacklistRepository {
  async addToBlacklist(steamId: string, appId: number, gameName: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client is not initialized')

    const { error } = await supabase
      .from('recommendation_blacklist')
      .upsert({
        steam_id: steamId,
        app_id: appId,
        game_name: gameName,
        added_at: Date.now()
      }, { onConflict: 'steam_id,app_id' })

    if (error) {
      throw new Error(`Failed to add to blacklist: ${error.message}`)
    }
  }

  async removeFromBlacklist(steamId: string, appId: number): Promise<void> {
    if (!supabase) throw new Error('Supabase client is not initialized')

    const { error } = await supabase
      .from('recommendation_blacklist')
      .delete()
      .match({ steam_id: steamId, app_id: appId })

    if (error) {
      throw new Error(`Failed to remove from blacklist: ${error.message}`)
    }
  }

  async getBlacklist(steamId: string): Promise<BlacklistEntry[]> {
    if (!supabase) return []

    const { data, error } = await supabase
      .from('recommendation_blacklist')
      .select('app_id, game_name, added_at')
      .eq('steam_id', steamId)
      .order('added_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch blacklist:', error)
      return []
    }

    return (data || []).map(r => ({
      appId: Number(r.app_id),
      gameName: r.game_name || 'Unknown Game',
      addedAt: Number(r.added_at)
    }))
  }

  async isBlacklisted(steamId: string, appId: number): Promise<boolean> {
    if (!supabase) return false

    const { data, error } = await supabase
      .from('recommendation_blacklist')
      .select('id')
      .match({ steam_id: steamId, app_id: appId })
      .maybeSingle()

    if (error) {
      console.error('Error checking blacklist status:', error)
      return false
    }

    return data !== null
  }
}

