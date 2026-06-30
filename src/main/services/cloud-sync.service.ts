import { supabase } from './supabase.client'
import { logger } from '../logger/logger'
import { userProfileRepository } from '../database/repositories/user-profile.repository'
import { playerDnaRepository } from '../database/repositories/player-dna.repository'

export class CloudSyncService {
  public async upsertProfile(): Promise<void> {
    if (!supabase) return

    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData?.session?.user) {
      logger.info('CloudSyncService', 'No active Supabase session, skipping cloud sync')
      return
    }

    const userId = sessionData.session.user.id
    const profile = userProfileRepository.getProfile()
    if (!profile) return

    const dnaSummary = playerDnaRepository.getSummary(profile.steamId)

    try {
      const payload: any = {
        id: userId,
        steam_id: profile.steamId,
        username: profile.personaName,
        avatar_url: profile.avatarUrl,
        dna_summary: dnaSummary || null
      }

      const { error } = await supabase
        .from('users')
        .upsert(payload)

      if (error) {
        logger.error('CloudSyncService', 'Failed to upsert profile to Supabase', error)
      } else {
        logger.info('CloudSyncService', 'Successfully synced profile to Cloud')
      }
    } catch (error) {
      logger.error('CloudSyncService', 'Exception during cloud sync', error)
    }
  }
}

export const cloudSyncService = new CloudSyncService()
