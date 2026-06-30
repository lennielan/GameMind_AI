// ============================================================
// Database IPC Handler
// ============================================================

import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import { gamesRepository } from '../database/repositories/games.repository'
import { logger } from '../logger/logger'
import type { IpcResult, Game, GameFilter } from '@shared/types'

export function registerDbIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.DB_GET_GAMES,
    async (_event, filter?: GameFilter): Promise<IpcResult<Game[]>> => {
      try {
        const games = filter
          ? gamesRepository.getFilteredGames(filter)
          : gamesRepository.getAllGames()
        return { success: true, data: games, error: null }
      } catch (error) {
        logger.error('DbIPC', 'Failed to get games', error)
        return { success: false, data: null, error: String(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.DB_GET_GAME,
    async (_event, appId: number): Promise<IpcResult<Game | null>> => {
      try {
        const game = gamesRepository.getGameByAppId(appId)
        return { success: true, data: game, error: null }
      } catch (error) {
        logger.error('DbIPC', `Failed to get game ${appId}`, error)
        return { success: false, data: null, error: String(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.DB_GET_STATS,
    async (): Promise<IpcResult<any>> => {
      try {
        const totalGames = gamesRepository.getGameCount()
        const playedGames = gamesRepository.getPlayedGameCount()
        const totalPlaytime = gamesRepository.getTotalPlaytime()
        const achStats = gamesRepository.getAchievementStats()
        
        return { 
          success: true, 
          data: { 
            totalGames, 
            playedGames, 
            totalPlaytime,
            totalAchievements: achStats.unlocked, // the dashboard usually says "unlocked" as the main number
            completionRate: achStats.completionRate
          }, 
          error: null 
        }
      } catch (error) {
        logger.error('DbIPC', 'Failed to get stats', error)
        return { success: false, data: null, error: String(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.DB_GET_RECENT_GAMES,
    async (_event, limit: number = 10): Promise<IpcResult<Game[]>> => {
      try {
        const games = gamesRepository.getRecentGames(limit)
        return { success: true, data: games, error: null }
      } catch (error) {
        logger.error('DbIPC', 'Failed to get recent games', error)
        return { success: false, data: null, error: String(error) }
      }
    }
  )

  logger.info('DbIPC', 'Database IPC handlers registered')
}
