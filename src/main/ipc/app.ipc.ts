// ============================================================
// App IPC Handler — Window controls and app info
// ============================================================

import { ipcMain, app, BrowserWindow, nativeTheme, shell } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import { configManager } from '../config/config-manager'
import { logger } from '../logger/logger'
import type { IpcResult } from '@shared/types'

export function validateExternalUrl(url: string): URL {
  if (typeof url !== 'string' || !url.trim()) {
    throw new Error('Only HTTP and HTTPS protocols are allowed')
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new Error('Only HTTP and HTTPS protocols are allowed')
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS protocols are allowed')
  }

  return parsedUrl
}

export function registerAppIpc(): void {
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, async (): Promise<IpcResult<string>> => {
    return { success: true, data: app.getVersion(), error: null }
  })

  ipcMain.handle(IPC_CHANNELS.APP_GET_PLATFORM, async (): Promise<IpcResult<string>> => {
    return { success: true, data: process.platform, error: null }
  })

  ipcMain.handle(IPC_CHANNELS.APP_MINIMIZE, async (event): Promise<void> => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.minimize()
  })

  ipcMain.handle(IPC_CHANNELS.APP_MAXIMIZE, async (event): Promise<void> => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })

  ipcMain.handle(IPC_CHANNELS.APP_CLOSE, async (event): Promise<void> => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.close()
  })

  ipcMain.handle(IPC_CHANNELS.APP_IS_MAXIMIZED, async (event): Promise<IpcResult<boolean>> => {
    const win = BrowserWindow.fromWebContents(event.sender)
    return { success: true, data: win?.isMaximized() ?? false, error: null }
  })

  ipcMain.handle(IPC_CHANNELS.APP_OPEN_EXTERNAL, async (_event, url: string): Promise<IpcResult<void>> => {
    try {
      const parsedUrl = validateExternalUrl(url)
      await shell.openExternal(parsedUrl.href)
      return { success: true, data: undefined, error: null }
    } catch (error: any) {
      logger.error('AppIPC', 'Failed to open external url', error)
      return { success: false, data: undefined, error: error.message }
    }
  })

  // Theme
  ipcMain.handle(IPC_CHANNELS.THEME_GET, async (): Promise<IpcResult<string>> => {
    const theme = configManager.get('theme')
    return { success: true, data: theme, error: null }
  })

  ipcMain.handle(
    IPC_CHANNELS.THEME_SET,
    async (_event, theme: 'dark' | 'light' | 'system'): Promise<IpcResult<void>> => {
      configManager.set('theme', theme)
      nativeTheme.themeSource = theme
      logger.info('AppIPC', `Theme set to: ${theme}`)
      return { success: true, data: undefined, error: null }
    }
  )

  logger.info('AppIPC', 'App IPC handlers registered')
}
