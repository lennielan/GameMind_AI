import { BrowserWindow, net } from 'electron'
import { logger } from '../../logger/logger'
import { configManager } from '../../config/config-manager'
import { steamApi } from './steam-api.client'
import { userProfileRepository } from '../../database/repository.factory'
import { gamesRepository } from '../../database/repository.factory'
import { achievementsRepository } from '../../database/repository.factory'
import { queryOne } from '../../database/database'
import { TaskQueue } from './task-queue'
import type { SyncStatus } from '@shared/types/ipc.types'
import { IPC_CHANNELS } from '@shared/constants/ipc-channels'

export class SyncEngine {
  private isRunning = false
  private status: SyncStatus = {
    isRunning: false,
    progress: 0,
    currentStep: 'Idle',
    totalSteps: 0,
    currentStepIndex: 0,
    error: null,
    startedAt: null,
    estimatedTimeRemaining: null
  }

  private broadcastStatus() {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach((win) => {
      win.webContents.send(IPC_CHANNELS.STEAM_SYNC_STATUS, this.status)
    })
  }

  private updateStatus(updates: Partial<SyncStatus>) {
    this.status = { ...this.status, ...updates }
    this.broadcastStatus()
  }

  public async startSync(): Promise<void> {
    if (this.isRunning) {
      logger.warn('SyncEngine', 'Sync is already running')
      return
    }

    const apiKey = configManager.get('steamApiKey') as string
    const steamId = configManager.get('steamId') as string

    if (!apiKey || !steamId) {
      this.updateStatus({ error: 'Steam API Key or Steam ID is missing', isRunning: false })
      throw new Error('Steam API Key or Steam ID is missing')
    }

    if (!net.isOnline()) {
      logger.warn('SyncEngine', 'Offline mode detected, sync paused')
      this.updateStatus({ error: 'Offline mode detected', isRunning: false })
      return
    }

    // Detect account switch: if the stored profile has a different steamId, wipe user-specific data
    const currentProfile = userProfileRepository.getProfile()
    if (currentProfile && currentProfile.steamId !== steamId) {
      logger.info('SyncEngine', `Steam ID changed: ${currentProfile.steamId} -> ${steamId}. Clearing old user data...`)
      this.clearUserData()
      configManager.set('lastSyncTimestamp', 0)
    }

    this.isRunning = true
    steamApi.setApiKey(apiKey)

    this.updateStatus({
      isRunning: true,
      progress: 0,
      currentStep: 'Starting sync...',
      totalSteps: 2,
      currentStepIndex: 0,
      error: null,
      startedAt: Date.now()
    })

    try {
      // Step 1: Profile
      this.updateStatus({
        progress: 10,
        currentStep: 'Fetching player profile...',
        currentStepIndex: 1
      })
      logger.info('SyncEngine', `Fetching profile for ${steamId}`)
      
      const profile = await steamApi.getPlayerSummaries(steamId)
      if (profile) {
        userProfileRepository.upsertProfile(profile)
        logger.info('SyncEngine', 'Profile saved to DB')
      } else {
        logger.warn('SyncEngine', 'Profile not found or private')
      }

      // Step 2: Games
      this.updateStatus({
        progress: 30,
        currentStep: 'Fetching owned games...',
        currentStepIndex: 2,
        totalSteps: 4
      })
      logger.info('SyncEngine', `Fetching games for ${steamId}`)
      
      const games = await steamApi.getOwnedGames(steamId)
      if (games && games.length > 0) {
        // Here we map SteamGame to Partial<Game> required by the repo
        const gamesForDb = games.map(g => ({
          appId: g.appId,
          name: g.name,
          playtimeForever: g.playtimeForever,
          playtime2Weeks: g.playtime2Weeks,
          imgIconUrl: g.imgIconUrl ? `http://media.steampowered.com/steamcommunity/public/images/apps/${g.appId}/${g.imgIconUrl}.jpg` : null,
          hasCommunityVisibleStats: g.hasCommunityVisibleStats,
          lastPlayedAt: g.lastPlayedAt || null
        }))
        
        const lastSyncTimestamp = (configManager.get('lastSyncTimestamp') as number) || 0
        const existingGames = gamesRepository.getAllGames()
        const existingGamesMap = new Map(existingGames.map(g => [g.appId, g]))

        gamesRepository.upsertGames(gamesForDb as any)
        logger.info('SyncEngine', `Saved ${games.length} games to DB`)

        // Step 2.5: Achievements (Delta Optimization)
        this.updateStatus({
          progress: 50,
          currentStep: 'Fetching achievements for changed games...',
          currentStepIndex: 3
        })
        
        games.filter(g => {
          const existing = existingGamesMap.get(g.appId)
          if (!existing) return true
          if (g.playtimeForever > existing.playtimeForever) return true
          if (g.lastPlayedAt && g.lastPlayedAt > lastSyncTimestamp) return true
          return false
        })
        
        // Record playtime snapshots for any games where playtime increased
        const now = Math.floor(Date.now() / 1000)
        const { getDatabase } = await import('../../database/database')
        const db = getDatabase()
        const snapshotInsert = db.prepare('INSERT INTO playtime_snapshots (app_id, timestamp, playtime_forever) VALUES (?, ?, ?)')
        
        db.transaction(() => {
          for (const g of games) {
            const existing = existingGamesMap.get(g.appId)
            // If it's a new game with playtime, or existing game whose playtime increased
            if (g.playtimeForever > 0 && (!existing || g.playtimeForever > existing.playtimeForever)) {
              snapshotInsert.run(g.appId, now, g.playtimeForever)
            }
          }
        })()
        
        const topGames = games
          .filter(g => {
            if (g.playtimeForever === 0) return false
            const existing = existingGamesMap.get(g.appId)
            if (!existing) return true
            if (g.playtimeForever > existing.playtimeForever) return true
            
            // If it has unlocked achievements in Steam, but we don't have them in the DB yet
            // (e.g. migrating from older version where achievements table wasn't populated)
            if (existing.unlockedAchievements > 0) {
              const achCount = queryOne<{count: number}>('SELECT COUNT(*) as count FROM achievements WHERE app_id = ?', [g.appId])?.count || 0
              if (achCount === 0) return true
            }
            // Sync games that have never been checked for achievements
            if (!existing.achievementsSyncedAt) return true
            
            return false
          })
          .sort((a, b) => b.playtimeForever - a.playtimeForever)
          .slice(0, 100)
          
        logger.info('SyncEngine', `Fetching achievements for ${topGames.length} changed top played games`)
        
        let forbiddenCount = 0
        let successCount = 0
        
        const taskQueue = new TaskQueue(100, 300000)
        
        await taskQueue.run(
          topGames,
          async (game, _index) => {
            const [achStats, tags] = await Promise.all([
              steamApi.getPlayerAchievements(steamId, game.appId),
              steamApi.getGameTagsFromSteamSpy(game.appId)
            ])
            
            if (achStats.forbidden) {
              forbiddenCount++
              gamesRepository.upsertGame({
                appId: game.appId,
                name: game.name,
                totalAchievements: 0,
                unlockedAchievements: 0,
                achievementsSyncedAt: Date.now(),
                tags: tags.length > 0 ? tags : undefined
              })
            } else {
              successCount++
              gamesRepository.upsertGame({
                appId: game.appId,
                name: game.name,
                totalAchievements: achStats.total,
                unlockedAchievements: achStats.unlocked,
                achievementsSyncedAt: Date.now(),
                tags: tags.length > 0 ? tags : undefined
              })

              if (achStats.achievements && achStats.achievements.length > 0) {
                achievementsRepository.upsertAchievements(game.appId, achStats.achievements)
              }
            }
          },
          (_progress, game, index, total) => {
            this.updateStatus({
              progress: 50 + Math.floor((index / total) * 30),
              currentStep: `Achievements: ${game.name} (${index+1}/${total})`,
              currentStepIndex: 3
            })
          },
          (backoffMs, _game, index) => {
            this.updateStatus({
              currentStep: `Rate limit hit. Waiting ${backoffMs / 1000}s... (Game ${index+1}/${topGames.length})`
            })
          }
        )
        
        if (forbiddenCount > 0) {
          logger.warn('SyncEngine', `${forbiddenCount} achievement requests returned 403 (profile or game details might be private)`)
        }
      }

      // Step 3: Wishlist
      this.updateStatus({
        progress: 80,
        currentStep: 'Fetching wishlist...',
        currentStepIndex: 3
      })
      logger.info('SyncEngine', `Fetching wishlist for ${steamId}`)
      
      const { wishlistRepository } = await import('../../database/repositories/wishlist.repository')
      const wishlist = await steamApi.getWishlist(steamId, profile?.profileUrl)
      if (wishlist && wishlist.length > 0) {
        wishlistRepository.upsertWishlist(steamId, wishlist)
        logger.info('SyncEngine', `Saved ${wishlist.length} wishlist items to DB`)
      }

      configManager.set('lastSyncTimestamp', Math.floor(Date.now() / 1000))

      this.updateStatus({
        isRunning: false,
        progress: 100,
        currentStep: 'Sync completed',
        currentStepIndex: 3,
        estimatedTimeRemaining: 0
      })
      
      // Автоматический пересчет числового счёта после синхронизации
      try {
        const { scoreEngine } = await import('../ai/score-engine')
        const localScore = scoreEngine.calculateLocalScore()
        const profile = userProfileRepository.getProfile()
        if (profile) {
          userProfileRepository.updateLocalScoreOnly(profile.steamId, localScore)
          logger.info('SyncEngine', `Local GameMind Score updated to: ${localScore}`)
        }
      } catch (scoreError) {
        logger.error('SyncEngine', 'Failed to update local GameMind score on sync', scoreError)
      }
      
      try {
        const { cloudSyncService } = await import('../cloud-sync.service')
        await cloudSyncService.upsertProfile()
      } catch (cloudError) {
        logger.warn('SyncEngine', 'Cloud sync failed, continuing locally', cloudError)
      }
      
      logger.info('SyncEngine', 'Sync completed successfully')
    } catch (error: any) {
      logger.error('SyncEngine', 'Sync failed', error)
      this.updateStatus({
        isRunning: false,
        error: error.message || 'Unknown error occurred during sync'
      })
      throw error
    } finally {
      this.isRunning = false
    }
  }

  /**
   * Clears all user-specific local data when switching Steam accounts.
   * Wipes games, achievements, profile, wishlist, player DNA, insights,
   * recommendations, playtime snapshots, timeline entries, and journals.
   */
  private clearUserData(): void {
    try {
      const { getDatabase } = require('../../database/database')
      const db = getDatabase()
      
      db.transaction(() => {
        db.prepare('DELETE FROM achievements').run()
        db.prepare('DELETE FROM games').run()
        db.prepare('DELETE FROM user_profile').run()
        db.prepare('DELETE FROM wishlist').run()
        db.prepare('DELETE FROM player_dna').run()
        db.prepare('DELETE FROM insights').run()
        db.prepare('DELETE FROM recommendations').run()
        db.prepare('DELETE FROM api_cache').run()
        
        // Clear optional tables (may not exist in older DB versions)
        try { db.prepare('DELETE FROM playtime_snapshots').run() } catch { /* table may not exist */ }
        try { db.prepare('DELETE FROM timeline_entries').run() } catch { /* table may not exist */ }
        try { db.prepare('DELETE FROM game_journals').run() } catch { /* table may not exist */ }
        try { db.prepare('DELETE FROM sync_log').run() } catch { /* table may not exist */ }
      })()
      
      logger.info('SyncEngine', 'All user-specific data cleared for account switch')
    } catch (err) {
      logger.error('SyncEngine', 'Failed to clear user data during account switch', err)
    }
  }

  public getStatus(): SyncStatus {
    return this.status
  }
}

export const syncEngine = new SyncEngine()
