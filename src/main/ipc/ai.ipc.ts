import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import { dnaEngine } from '../services/ai/dna-engine'
import { logger } from '../logger/logger'
import type { IpcResult } from '@shared/types'

export function registerAiIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.AI_GENERATE_DNA,
    async (): Promise<IpcResult<void>> => {
      try {
        await dnaEngine.generateDna()
        return { success: true, data: undefined, error: null }
      } catch (error) {
        logger.error('AiIPC', 'Failed to generate DNA', error)
        return { success: false, data: undefined, error: error instanceof Error ? error.message : String(error) }
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
    IPC_CHANNELS.AI_GET_RECOMMENDATIONS, // This will be used to generate
    async (): Promise<IpcResult<void>> => {
      try {
        const { recommendationsEngine } = await import('../services/ai/recommendations-engine')
        await recommendationsEngine.generateRecommendations()
        return { success: true, data: undefined, error: null }
      } catch (error) {
        logger.error('AiIPC', 'Failed to generate recommendations', error)
        return { success: false, data: undefined, error: error instanceof Error ? error.message : String(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.DB_GET_RECOMMENDATIONS,
    async (): Promise<IpcResult<any>> => {
      try {
        const { recommendationsEngine } = await import('../services/ai/recommendations-engine')
        const recs = recommendationsEngine.getRecommendations()
        return { success: true, data: recs, error: null }
      } catch (error) {
        logger.error('AiIPC', 'Failed to get recommendations', error)
        return { success: false, data: null, error: String(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.AI_GET_INSIGHTS,
    async (): Promise<IpcResult<string>> => {
      try {
        const { analyticsEngine } = await import('../services/ai/analytics-engine')
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
        const { aiService } = await import('../services/ai/ai.service')
        const myDna = dnaEngine.getDna()
        const result = await aiService.generateCoopRecommendation(myDna, friendDna)
        return { success: true, data: result, error: null }
      } catch (error) {
        logger.error('AiIPC', 'Failed to generate coop recommendations', error)
        return { success: false, data: null, error: error instanceof Error ? error.message : String(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.AI_SEMANTIC_SEARCH,
    async (_event, query: string): Promise<IpcResult<any>> => {
      try {
        const { semanticSearchEngine } = await import('../services/ai/semantic-search.engine')
        const results = await semanticSearchEngine.search(query)
        return { success: true, data: results, error: null }
      } catch (error) {
        logger.error('AiIPC', 'Failed to perform semantic search', error)
        return { success: false, data: null, error: error instanceof Error ? error.message : String(error) }
      }
    }
  )

  logger.info('AiIPC', 'AI IPC handlers registered')
}
