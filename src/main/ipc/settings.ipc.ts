// ============================================================
// Settings IPC Handler
// ============================================================

import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import { configManager } from '../config/config-manager'
import { logger } from '../logger/logger'
import type { IpcResult, AppSettings, SettingsKey } from '@shared/types'

export function registerSettingsIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_GET,
    async (_event, key: SettingsKey): Promise<IpcResult<unknown>> => {
      try {
        let value = configManager.get(key)
        
        const SENSITIVE_KEYS = ['steamApiKey', 'openaiApiKey', 'geminiApiKey', 'claudeApiKey', 'igdbClientSecret']
        if (SENSITIVE_KEYS.includes(key as string) && typeof value === 'string' && value.length > 0) {
          value = maskKey(value)
        }

        return { success: true, data: value, error: null }
      } catch (error) {
        logger.error('SettingsIPC', `Failed to get setting: ${key}`, error)
        return { success: false, data: null, error: String(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SET,
    async (_event, key: SettingsKey, value: unknown): Promise<IpcResult<void>> => {
      try {
        configManager.set(key, value as AppSettings[SettingsKey])
        logger.info('SettingsIPC', `Setting updated: ${key}`)
        return { success: true, data: undefined, error: null }
      } catch (error) {
        logger.error('SettingsIPC', `Failed to set setting: ${key}`, error)
        return { success: false, data: null, error: String(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_GET_ALL,
    async (): Promise<IpcResult<AppSettings>> => {
      try {
        const settings = configManager.getAll()
        // Mask sensitive keys for renderer
        const masked = { ...settings }
        if (masked.steamApiKey) masked.steamApiKey = maskKey(masked.steamApiKey)
        if (masked.openaiApiKey) masked.openaiApiKey = maskKey(masked.openaiApiKey)
        if (masked.geminiApiKey) masked.geminiApiKey = maskKey(masked.geminiApiKey)
        if (masked.claudeApiKey) masked.claudeApiKey = maskKey(masked.claudeApiKey)
        if (masked.igdbClientSecret) masked.igdbClientSecret = maskKey(masked.igdbClientSecret)
        return { success: true, data: masked, error: null }
      } catch (error) {
        logger.error('SettingsIPC', 'Failed to get all settings', error)
        return { success: false, data: null, error: String(error) }
      }
    }
  )

  logger.info('SettingsIPC', 'Settings IPC handlers registered')
}

function maskKey(key: string): string {
  if (key.length <= 8) return '••••••••'
  return key.slice(0, 4) + '••••' + key.slice(-4)
}
