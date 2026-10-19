import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/constants/ipc-channels'
import { BadgesService } from '../../services/badges.service'
import { logger } from '../../logger/logger'
import type { Badge, UserBadgeWithDetails } from '../../../shared/types/badge.types'

interface IpcResult<T> {
  success: boolean
  data?: T | null
  error?: string | null
}

function success<T>(data: T): IpcResult<T> {
  return { success: true, data, error: null }
}

function error<T = null>(message: string): IpcResult<T> {
  return { success: false, data: null, error: message }
}

export function registerBadgesIpc(): void {
  ipcMain.handle(IPC_CHANNELS.BADGES_GET_ALL, async (): Promise<IpcResult<Badge[]>> => {
    try {
      const badges = BadgesService.getAllBadges()
      return success(badges)
    } catch (err: any) {
      logger.error('BadgesIPC', 'Failed to get all badges', err)
      return error(err.message)
    }
  })

  ipcMain.handle(IPC_CHANNELS.BADGES_GET_USER, async (_, steamId: string): Promise<IpcResult<UserBadgeWithDetails[]>> => {
    try {
      const badges = BadgesService.getUserBadges(steamId)
      return success(badges)
    } catch (err: any) {
      logger.error('BadgesIPC', `Failed to get badges for user ${steamId}`, err)
      return error(err.message)
    }
  })

  ipcMain.handle(IPC_CHANNELS.BADGES_GRANT, async (_, steamId: string, badgeCode: string, grantedBy?: string): Promise<IpcResult<void>> => {
    try {
      BadgesService.grantBadge(steamId, badgeCode, grantedBy)
      return success(undefined)
    } catch (err: any) {
      logger.error('BadgesIPC', 'Failed to grant badge', err)
      return error(err.message)
    }
  })

  ipcMain.handle(IPC_CHANNELS.BADGES_REVOKE, async (_, steamId: string, badgeCode: string): Promise<IpcResult<void>> => {
    try {
      BadgesService.revokeBadge(steamId, badgeCode)
      return success(undefined)
    } catch (err: any) {
      logger.error('BadgesIPC', 'Failed to revoke badge', err)
      return error(err.message)
    }
  })

  ipcMain.handle(IPC_CHANNELS.BADGES_TOGGLE_VISIBILITY, async (_, steamId: string, badgeCode: string, isHidden: boolean): Promise<IpcResult<void>> => {
    try {
      BadgesService.toggleBadgeVisibility(steamId, badgeCode, isHidden)
      return success(undefined)
    } catch (err: any) {
      logger.error('BadgesIPC', 'Failed to toggle badge visibility', err)
      return error(err.message)
    }
  })

  ipcMain.handle(IPC_CHANNELS.BADGES_UPDATE_TIER, async (_, steamId: string, badgeCode: string, newTier: number): Promise<IpcResult<void>> => {
    try {
      BadgesService.updateBadgeTier(steamId, badgeCode, newTier)
      return success(undefined)
    } catch (err: any) {
      logger.error('BadgesIPC', 'Failed to update badge tier', err)
      return error(err.message)
    }
  })

  ipcMain.handle(IPC_CHANNELS.BADGES_CHECK_AUTO, async (_, steamId: string, triggerType: string, data?: unknown): Promise<IpcResult<void>> => {
    try {
      if (steamId) {
        BadgesService.checkAutoBadges(steamId, triggerType, data)
      }
      return success(undefined)
    } catch (err: any) {
      logger.error('BadgesIPC', 'Failed to check auto badges', err)
      return error(err.message)
    }
  })
}
