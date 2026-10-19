import { supabase } from './supabase.client'
import { logger } from '../logger/logger'
import { userProfileRepository } from '../database/repository.factory'
import { playerDnaRepository } from '../database/repository.factory'
import { gamesRepository } from '../database/repository.factory'
import { achievementsService } from './achievements.service'

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

    const games = gamesRepository.getAllGames()
    const stats_games = games.length
    const stats_hours = Math.floor(games.reduce((acc, g) => acc + (g.playtimeForever || 0), 0) / 60)
    const stats_achievements = games.reduce((acc, g) => acc + (g.unlockedAchievements || 0), 0)

    try {
      const showcase_games = games
        .filter(g => g.playtimeForever > 0)
        .sort((a, b) => (b.playtimeForever || 0) - (a.playtimeForever || 0))
        .slice(0, 6)
        .map(g => ({
          appId: g.appId,
          name: g.name,
          imgIconUrl: g.imgIconUrl,
          playtimeForever: g.playtimeForever
        }))
      let finalAvatarUrl = profile.avatarUrl
      let finalUsername = profile.personaName
      
      // Bundle local traits with summary for cloud storage
      let finalDnaSummary: any = null
      if (dnaSummary) {
        const traits = playerDnaRepository.getTraits(profile.steamId)
        finalDnaSummary = { ...dnaSummary, _traits: traits }
      }
      
      let finalGamemindScore = profile.gamemindScore || 0
      
      try {
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('avatar_url, username, dna_summary, gamemind_score')
          .eq('id', userId)
          .maybeSingle()
          
        if (fetchError) {
          logger.warn('CloudSyncService', 'Failed to fetch existing user profile before upsert', fetchError)
          return // Abort to prevent overwriting custom data with Steam data if network is flaky
        }
          
        if (existingUser) {
          if (existingUser.avatar_url) {
            finalAvatarUrl = existingUser.avatar_url
          }
          if (existingUser.username && existingUser.username !== profile.personaName) {
            finalUsername = existingUser.username
          }

          // Restore Player DNA (summary and traits) from cloud if local is missing
          if (!dnaSummary && existingUser.dna_summary) {
            finalDnaSummary = existingUser.dna_summary
            try {
              const { _traits, ...restSummary } = existingUser.dna_summary
              const restoredDna = { ...restSummary, steamId: profile.steamId }
              playerDnaRepository.saveSummary(restoredDna)
              
              if (_traits && Array.isArray(_traits)) {
                // Ensure steamId matches current profile
                const restoredTraits = _traits.map(t => ({ ...t, steamId: profile.steamId }))
                playerDnaRepository.saveTraits(restoredTraits)
              }
              logger.info('CloudSyncService', 'Restored Player DNA (Summary & Traits) from Cloud to local database.')
            } catch (err) {
              logger.error('CloudSyncService', 'Failed to restore DNA to local DB', err)
            }
          }

          // Restore GameMind Score from cloud if local is 0
          if (!finalGamemindScore && existingUser.gamemind_score) {
            finalGamemindScore = existingUser.gamemind_score
            try {
              profile.gamemindScore = finalGamemindScore
              userProfileRepository.saveProfile(profile)
              logger.info('CloudSyncService', 'Restored GameMind Score from Cloud to local database.')
            } catch (err) {
              logger.error('CloudSyncService', 'Failed to restore GameMind Score', err)
            }
          }
        }
      } catch (e) {
        logger.warn('CloudSyncService', 'Failed to fetch existing user profile before upsert', e)
        return // Abort to prevent overwriting
      }

      const payload: any = {
        id: userId,
        steam_id: profile.steamId,
        username: finalUsername,
        avatar_url: finalAvatarUrl,
        dna_summary: finalDnaSummary,
        stats_games,
        stats_hours,
        stats_achievements,
        gamemind_score: finalGamemindScore,
        showcase_games,
        showcase_achievements: []
      }

      // Fetch showcase achievements asynchronously
      try {
        const achRecents = await achievementsService.getShowcaseAchievements()
        payload.showcase_achievements = achRecents.map(ach => ({
          appId: ach.app_id,
          apiName: ach.api_name,
          displayName: ach.display_name || ach.api_name,
          description: ach.description || '',
          icon: ach.icon || '',
          iconGray: ach.icon_gray || '',
          unlockTime: ach.unlock_time,
          gameName: ach.game_name || ''
        }))
      } catch (err) {
        logger.error('CloudSyncService', 'Failed to fetch showcase achievements for sync', err)
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
