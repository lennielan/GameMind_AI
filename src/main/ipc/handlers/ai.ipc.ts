import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import { dnaEngine } from '../../services/ai/dna-engine'
import { logger } from '../../logger/logger'
import type { IpcResult } from '@shared/types'
import { timelineAiService } from '../../services/ai/timeline-ai.service'
import { z } from 'zod'
import { configManager } from '../../config/config-manager'
import { aiUsageLimits, AiUsageLimitError } from '../../services/ai/ai-usage-limits.service'

const friendDnaSchema = z.record(z.any())
const friendsSchema = z.array(z.record(z.any()))
const semanticSearchSchema = z.string().min(1).max(200)

export function registerAiIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.AI_GENERATE_DNA,
    async (): Promise<IpcResult<void>> => {
      try {
        const release = await aiUsageLimits.reserve('player-dna')
        
        BrowserWindow.getAllWindows().forEach(win => {
          win.webContents.send(IPC_CHANNELS.DNA_STARTED)
        })

      // Start generation in background — don't block the renderer
      dnaEngine.generateDna()
        .then(() => {
          logger.info('AiIPC', 'Background DNA generation completed successfully')
          
          // Notify all renderer windows that DNA has been updated
          BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send(IPC_CHANNELS.DNA_UPDATED)
          })

        })
        .catch(error => {
          release()
          logger.error('AiIPC', 'Background DNA generation failed', error)
          BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send(IPC_CHANNELS.DNA_GENERATION_FAILED, error.message || 'Unknown error')
          })
        })

      // Immediately return success (generation is running in background)
      return { success: true, data: undefined, error: null }
      } catch (error) {
        return { success: false, data: undefined, error: toAiLimitMessage(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.DB_GET_PLAYER_DNA,
    async (): Promise<IpcResult<any>> => {
      try {
        const dna = dnaEngine.getDna()
        return { success: true, data: dna, error: null }
      } catch (error) {
        logger.error('AiIPC', 'Failed to get DNA', error)
        return { success: false, data: null, error: String(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.AI_GET_RECOMMENDATIONS,
    async (_event, mood?: string): Promise<IpcResult<void>> => {
      let release: (() => void) | undefined
      try {
        release = await aiUsageLimits.reserve('recommendations')
        const { recommendationsEngine } = await import('../../services/ai/recommendations-engine')
        
        // Notify all windows that generation has started
        BrowserWindow.getAllWindows().forEach(win => {
          win.webContents.send(IPC_CHANNELS.RECOMMENDATIONS_STARTED)
        })

        // Background generation
        recommendationsEngine.generateRecommendations(mood)
          .then(() => {
            logger.info('AiIPC', 'Background Recommendations generation completed successfully')
            BrowserWindow.getAllWindows().forEach(win => {
              win.webContents.send(IPC_CHANNELS.RECOMMENDATIONS_UPDATED)
            })
          })
          .catch(error => {
            logger.error('AiIPC', 'Background Recommendations generation failed', error)
            BrowserWindow.getAllWindows().forEach(win => {
              win.webContents.send(IPC_CHANNELS.RECOMMENDATIONS_FAILED, error.message || 'Unknown error')
            })
          })
          .finally(() => {
            if (release) release()
          })

        return { success: true, data: undefined, error: null }
      } catch (error) {
        if (release) release()
        logger.error('AiIPC', 'Failed to start recommendations generation', error)
        return { success: false, data: undefined, error: toAiLimitMessage(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.DB_GET_RECOMMENDATIONS,
    async (): Promise<IpcResult<any>> => {
      try {
        const { recommendationsEngine } = await import('../../services/ai/recommendations-engine')
        const recs = await recommendationsEngine.getRecommendations()
        return { success: true, data: recs, error: null }
      } catch (error) {
        logger.error('AiIPC', 'Failed to get recommendations', error)
        return { success: false, data: null, error: String(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.AI_GENERATE_REASONING,
    async (_event, appId: number, gameName: string): Promise<IpcResult<any>> => {
      try {
        const { recommendationsEngine } = await import('../../services/ai/recommendations-engine')
        const language = configManager.get('language') || 'en'
        const data = await recommendationsEngine.generateReasoning(appId, gameName, language)
        return { success: true, data, error: null }
      } catch (error) {
        logger.error('AiIPC', 'Failed to generate reasoning', error)
        return { success: false, data: null, error: String(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.AI_BLACKLIST_ADD,
    async (_event, appId: number, gameName: string): Promise<IpcResult<void>> => {
      try {
        const { userProfileRepository, blacklistRepository, favoritesRepository } = await import('../../database/repository.factory')
        const profile = userProfileRepository.getProfile()
        if (!profile) throw new Error('No active profile')
        await blacklistRepository.addToBlacklist(profile.steamId, appId, gameName)
        await favoritesRepository.removeFromFavorites(profile.steamId, gameName)
        return { success: true, data: undefined, error: null }
      } catch (error) {
        logger.error('AiIPC', 'Failed to add to blacklist', error)
        return { success: false, data: undefined, error: String(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.AI_BLACKLIST_REMOVE,
    async (_event, appId: number): Promise<IpcResult<void>> => {
      try {
        const { userProfileRepository, blacklistRepository } = await import('../../database/repository.factory')
        const profile = userProfileRepository.getProfile()
        if (!profile) throw new Error('No active profile')
        await blacklistRepository.removeFromBlacklist(profile.steamId, appId)
        return { success: true, data: undefined, error: null }
      } catch (error) {
        logger.error('AiIPC', 'Failed to remove from blacklist', error)
        return { success: false, data: undefined, error: String(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.AI_BLACKLIST_GET,
    async (): Promise<IpcResult<any[]>> => {
      try {
        const { userProfileRepository, blacklistRepository } = await import('../../database/repository.factory')
        const profile = userProfileRepository.getProfile()
        if (!profile) throw new Error('No active profile')
        const list = await blacklistRepository.getBlacklist(profile.steamId)
        return { success: true, data: list, error: null }
      } catch (error) {
        logger.error('AiIPC', 'Failed to get blacklist', error)
        return { success: false, data: [], error: String(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.AI_GET_INSIGHTS,
    async (): Promise<IpcResult<string>> => {
      try {
        const { analyticsEngine } = await import('../../services/ai/analytics-engine')
        const insights = await analyticsEngine.getQuickInsights()
        return { success: true, data: insights, error: null }
      } catch (error) {
        logger.error('AiIPC', 'Failed to generate insights', error)
        return { success: false, data: null, error: error instanceof Error ? error.message : String(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.AI_GENERATE_COOP,
    async (_event, friendDna: any): Promise<any> => {
      try {
        const validFriendDna = friendDnaSchema.parse(friendDna)
        const { aiService } = await import('../../services/ai/ai.service')
        const myDna = dnaEngine.getDna()
        const result = await aiService.generateCoopRecommendation(myDna, validFriendDna)
        return { success: true, data: result, error: null }
      } catch (error) {
        logger.error('AiIPC', 'Failed to generate coop recommendations', error)
        return { success: false, data: null, error: error instanceof Error ? error.message : String(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.AI_GENERATE_GROUP_MATCH,
    async (_event, friends: any[]): Promise<any> => {
      try {
        const validFriends = friendsSchema.parse(friends) as any[]
        const { groupMatchEngine } = await import('../../services/ai/group-match.engine')
        const { groupMatchAiService } = await import('../../services/ai/group-match-ai.service')
        const matchResult = await groupMatchEngine.computeMatch(validFriends)
        const aiResult = await groupMatchAiService.generateExplanations(validFriends, matchResult)
        
        return { 
          success: true, 
          data: {
            groupProfile: matchResult.groupProfile,
            candidates: aiResult
          }, 
          error: null 
        }
      } catch (error) {
        logger.error('AiIPC', 'Failed to generate group match', error)
        return { success: false, data: null, error: error instanceof Error ? error.message : String(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.AI_GENERATE_TIMELINE,
    async (): Promise<IpcResult<boolean>> => {
      let release: (() => void) | undefined
      try {
        release = await aiUsageLimits.reserve('timeline')
        await timelineAiService.generateTimelineNarratives()
        return { success: true, data: true, error: null }
      } catch (error) {
        logger.error('AiIPC', 'Failed to generate timeline narrative', error)
        return { success: false, data: false, error: toAiLimitMessage(error) }
      } finally {
        if (release) release()
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.AI_SEMANTIC_SEARCH,
    async (_event, query: string): Promise<IpcResult<any>> => {
      let release: (() => void) | undefined
      try {
        const validQuery = semanticSearchSchema.parse(query)
        release = await aiUsageLimits.reserve('semantic-search')
        const { semanticSearchEngine } = await import('../../services/ai/semantic-search.engine')
        const results = await semanticSearchEngine.search(validQuery)
        return { success: true, data: results, error: null }
      } catch (error) {
        logger.error('AiIPC', 'Failed to perform semantic search', error)
        return { success: false, data: null, error: toAiLimitMessage(error) }
      } finally {
        if (release) release()
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.AI_GET_USAGE,
    async (): Promise<IpcResult<any>> => ({ success: true, data: await aiUsageLimits.getAll(), error: null })
  )

  ipcMain.handle(
    IPC_CHANNELS.AI_GENERATE_SCORE,
    async (): Promise<IpcResult<boolean>> => {
      try {
        const { scoreEngine } = await import('../../services/ai/score-engine')
        const success = await scoreEngine.generateGameMindScore()
        return { success, data: success, error: null }
      } catch (error) {
        logger.error('AiIPC', 'Failed to generate GameMind Score', error)
        return { success: false, data: false, error: error instanceof Error ? error.message : String(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.AI_GET_QUEUE_STATUS,
    async (): Promise<IpcResult<any>> => {
      try {
        const { aiQueueService } = await import('../../services/ai/ai-queue.service')
        return { success: true, data: aiQueueService.getQueueStatus(), error: null }
      } catch (error) {
        logger.error('AiIPC', 'Failed to get AI queue status', error)
        return { success: false, data: null, error: error instanceof Error ? error.message : String(error) }
      }
    }
  )

  logger.info('AiIPC', 'AI IPC handlers registered')
}

function toAiLimitMessage(error: unknown): string {
  if (error instanceof AiUsageLimitError) return error.message
  return error instanceof Error ? error.message : String(error)
}
