// ============================================================
// Muting Service — Manage muted users in Supabase
// ============================================================

import { supabase } from './supabase.client'

export interface MutedUser {
  id: string
  user_id: string
  muted_user_id: string
  muted_until: string | null
  created_at: string
}

export type MuteDuration = '1h' | '8h' | '24h' | 'forever'

export class MutingService {
  /**
   * Mute a user for a specified duration.
   * If the user is already muted, updates the muted_until field.
   */
  async muteUser(targetId: string, duration: MuteDuration): Promise<boolean> {
    if (!supabase) return false

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return false

    let mutedUntil: string | null = null
    if (duration !== 'forever') {
      const hours = duration === '1h' ? 1 : duration === '8h' ? 8 : 24
      mutedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
    }

    const { error } = await supabase
      .from('muted_users')
      .upsert(
        {
          user_id: session.user.id,
          muted_user_id: targetId,
          muted_until: mutedUntil
        },
        { onConflict: 'user_id,muted_user_id' }
      )

    if (error) {
      console.error('Error muting user:', error)
      return false
    }

    return true
  }

  /**
   * Unmute a user (remove from muted_users table).
   */
  async unmuteUser(targetId: string): Promise<boolean> {
    if (!supabase) return false

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return false

    const { error } = await supabase
      .from('muted_users')
      .delete()
      .eq('user_id', session.user.id)
      .eq('muted_user_id', targetId)

    if (error) {
      console.error('Error unmuting user:', error)
      return false
    }

    return true
  }

  /**
   * Check if a specific user is currently muted.
   * Accounts for expired temporary mutes.
   */
  async isMuted(targetId: string): Promise<boolean> {
    if (!supabase) return false

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return false

    const { data, error } = await supabase
      .from('muted_users')
      .select('muted_until')
      .eq('user_id', session.user.id)
      .eq('muted_user_id', targetId)
      .maybeSingle()

    if (error || !data) return false

    // null = muted forever
    if (data.muted_until === null) return true

    // Check if mute has expired
    const until = new Date(data.muted_until)
    if (until > new Date()) return true

    // Mute expired — clean it up silently
    await this.unmuteUser(targetId)
    return false
  }

  /**
   * Get all currently muted users with their profiles.
   */
  async getMutedUsers(): Promise<Array<MutedUser & { username: string }>> {
    if (!supabase) return []

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return []

    const { data, error } = await supabase
      .from('muted_users')
      .select(`
        *,
        muted_profile:users!muted_users_muted_user_id_fkey(username)
      `)
      .eq('user_id', session.user.id)

    if (error || !data) return []

    const now = new Date()

    return data
      .filter((row: any) => {
        // Filter out expired mutes
        if (row.muted_until === null) return true
        return new Date(row.muted_until) > now
      })
      .map((row: any) => ({
        ...row,
        username: row.muted_profile?.username || 'Unknown'
      }))
  }
}

export const mutingService = new MutingService()
