// ============================================================
// App IPC Handler — Window controls and app info
// ============================================================

import { ipcMain, app, BrowserWindow, nativeTheme, shell } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import { configManager } from '../../config/config-manager'
import { logger } from '../../logger/logger'
import { realtimeService } from '../../services/realtime.service'
import type { IpcResult, BaseTheme } from '@shared/types'

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

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'steam:') {
    throw new Error('Only HTTP, HTTPS, and STEAM protocols are allowed')
  }

  const allowedDomainSuffixes = [
    'steampowered.com',
    'steamcommunity.com',
    'github.com',
    'google.com',
    'google.dev',
    'openai.com',
    'anthropic.com',
    'openrouter.ai',
    'groq.com',
    'ollama.com',
    'lmstudio.ai',
    't.me',
    'telegram.me'
  ]

  if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
    const isAllowed = allowedDomainSuffixes.some(
      (domain) => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
    )
    if (!isAllowed) {
      throw new Error(`Domain ${parsedUrl.hostname} is not allowed. Only trusted domains can be opened.`)
    }
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

  ipcMain.on(IPC_CHANNELS.APP_SET_FOCUS, (_event, focused: boolean) => {
    realtimeService.setAppFocused(focused)
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

  ipcMain.handle(IPC_CHANNELS.STEAM_PROTOCOL_ACTION, async (_event, action: 'run' | 'store' | 'community' | 'achievements', appId: number): Promise<IpcResult<void>> => {
    try {
      if (typeof appId !== 'number' || isNaN(appId)) {
        throw new Error('Invalid AppID')
      }
      
      let url = ''
      switch (action) {
        case 'run':
          url = `steam://run/${appId}`
          break
        case 'store':
          url = `steam://store/${appId}`
          break
        case 'community':
          url = `steam://url/GameHub/${appId}`
          break
        case 'achievements': {
          const steamId = configManager.get('steamId')
          if (steamId) {
            url = `https://steamcommunity.com/profiles/${steamId}/stats/${appId}/achievements/`
          } else {
            url = `https://steamcommunity.com/app/${appId}/achievements/`
          }
          break
        }
        default:
          throw new Error('Invalid steam protocol action')
      }
      
      await shell.openExternal(url)
      return { success: true, data: undefined, error: null }
    } catch (error: any) {
      logger.error('AppIPC', `Failed to execute steam protocol action: ${action}`, error)
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
    async (_event, theme: BaseTheme): Promise<IpcResult<void>> => {
      configManager.set('theme', theme)
      nativeTheme.themeSource = theme === 'midnight' ? 'dark' : theme
      logger.info('AppIPC', `Theme set to: ${theme}`)
      return { success: true, data: undefined, error: null }
    }
  )

  logger.info('AppIPC', 'App IPC handlers registered')
}
