import { BrowserWindow } from 'electron'
import { logger } from '../../logger/logger'
import { configManager } from '../../config/config-manager'
import { steamApi } from './steam-api.client'
import { userProfileRepository } from '../../database/repositories/user-profile.repository'
import { gamesRepository } from '../../database/repositories/games.repository'
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
        
        gamesRepository.upsertGames(gamesForDb as any)
        logger.info('SyncEngine', `Saved ${games.length} games to DB`)

        // Step 2.5: Achievements (Top 50 played games to avoid rate limits)
        this.updateStatus({
          progress: 50,
          currentStep: 'Fetching achievements for top games...',
          currentStepIndex: 3
        })
        
        const topGames = games
          .filter(g => g.playtimeForever > 120 && g.hasCommunityVisibleStats)
          .sort((a, b) => b.playtimeForever - a.playtimeForever)
          .slice(0, 50)
          
        logger.info('SyncEngine', `Fetching achievements for ${topGames.length} top played games`)
        
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
              if (tags.length > 0) {
                gamesRepository.upsertGame({
                  appId: game.appId,
                  name: game.name,
                  tags: tags
                })
              }
            } else {
              successCount++
              gamesRepository.upsertGame({
                appId: game.appId,
                name: game.name,
                totalAchievements: achStats.total,
                unlockedAchievements: achStats.unlocked,
                tags: tags.length > 0 ? tags : undefined
              })
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
        
        // If ALL requests returned 403, it's a privacy issue — reset all achievement data
        if (forbiddenCount > 0 && successCount === 0) {
          logger.warn('SyncEngine', `All ${forbiddenCount} achievement requests returned 403 — profile is private. Resetting achievements.`)
          gamesRepository.resetAllAchievements()
          this.updateStatus({ privacyIssue: true })
        } else if (forbiddenCount > 0) {
          logger.warn('SyncEngine', `${forbiddenCount} achievement requests returned 403 (partial privacy)`)
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
      const localProfile = userProfileRepository.getProfile()
      const wishlist = await steamApi.getWishlist(steamId, localProfile?.profileUrl)
      if (wishlist && wishlist.length > 0) {
        wishlistRepository.upsertWishlist(steamId, wishlist)
        logger.info('SyncEngine', `Saved ${wishlist.length} wishlist items to DB`)
      }

      this.updateStatus({
        isRunning: false,
        progress: 100,
        currentStep: 'Sync completed',
        currentStepIndex: 3,
        estimatedTimeRemaining: 0
      })
      
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

  public getStatus(): SyncStatus {
    return this.status
  }
}

export const syncEngine = new SyncEngine()
