import { ipcMain, BrowserWindow, session } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import { syncEngine } from '../../services/steam/sync-engine'
import { userProfileRepository } from '../../database/repository.factory'
import { logger } from '../../logger/logger'
import { configManager } from '../../config/config-manager'
import { steamApi } from '../../services/steam/steam-api.client'

export function registerSteamIpc(): void {
  // ---- Steam Store Auth (cookie-based) ----
  ipcMain.handle(IPC_CHANNELS.STEAM_CHECK_AUTH, async () => {
    try {
      const cookies = await session.defaultSession.cookies.get({ url: 'https://store.steampowered.com' })
      const hasAuth = cookies.some(c => c.name === 'steamLoginSecure')
      return { success: true, data: hasAuth, error: null }
    } catch (error: any) {
      logger.error('SteamIPC', 'Failed to check Steam auth cookies', error)
      return { success: false, data: false, error: error.message }
    }
  })

  // Steam Login (Unified: Store Cookies + SteamID extraction)
  ipcMain.handle(IPC_CHANNELS.STEAM_LOGIN, async (event) => {
    return new Promise((resolve) => {
      const parentWindow = BrowserWindow.fromWebContents(event.sender) || undefined

      const loginWin = new BrowserWindow({
        width: 500,
        height: 700,
        parent: parentWindow,
        modal: true,
        autoHideMenuBar: true,
        alwaysOnTop: true,
        title: 'Steam Login',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      let resolved = false

      const checkLoginSuccess = async (url: string): Promise<void> => {
        // Only treat it as success if we are navigating AWAY from /login
        // AND the steamLoginSecure cookie actually exists (proves real login)
        if (
          url.startsWith('https://store.steampowered.com') &&
          !url.includes('/login')
        ) {
          // Double-check: does the cookie actually exist?
          const cookies = await session.defaultSession.cookies.get({
            url: 'https://store.steampowered.com',
            name: 'steamLoginSecure'
          })

          if (cookies.length === 0) {
            // Not actually logged in — Steam just redirected. Ignore.
            logger.debug('SteamIPC', `Ignoring redirect to ${url} (no auth cookie yet)`)
            return
          }

          if (!resolved) {
            resolved = true
            logger.info('SteamIPC', 'Steam Store login successful (cookie auth)')

            let steamId: string | null = null
            try {
              const cookieVal = decodeURIComponent(cookies[0].value)
              steamId = cookieVal.split('||')[0]
              if (steamId) {
                configManager.set('steamId', steamId)
              }
            } catch { /* ignore parse errors */ }

            setTimeout(() => {
              if (!loginWin.isDestroyed()) loginWin.close()
            }, 500)
            resolve({ success: true, data: steamId, error: null })
          }
        }
      }

      // Only start monitoring navigation AFTER the initial page finishes loading
      loginWin.webContents.once('did-finish-load', () => {
        logger.debug('SteamIPC', 'Steam login page loaded, now monitoring navigation...')
        loginWin.webContents.on('did-navigate', (_e, url) => checkLoginSuccess(url))
        loginWin.webContents.on('did-redirect-navigation', (_e, url) => checkLoginSuccess(url))
      })

      loginWin.on('closed', () => {
        if (!resolved) {
          resolved = true
          resolve({ success: false, data: null, error: 'Window closed by user' })
        }
      })

      loginWin.loadURL('https://store.steampowered.com/login/')
    })
  })
  // Запуск синхронизации
  ipcMain.handle(IPC_CHANNELS.STEAM_SYNC, async () => {
    try {
      // Запускаем асинхронно, не дожидаясь полного завершения для возврата ответа, 
      // чтобы UI не блокировался. Прогресс будет транслироваться через steam:sync-progress.
      // Возвращаем начальный статус.
      
      // Запуск без await, catch обработает ошибки на уровне движка и пошлет ивент
      syncEngine.startSync().catch(err => {
        logger.error('SteamIPC', 'Error in background sync', err)
      })
      
      return {
        success: true,
        data: syncEngine.getStatus(),
        error: null
      }
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message
      }
    }
  })

  // Получение текущего статуса
  ipcMain.handle(IPC_CHANNELS.STEAM_SYNC_STATUS, async () => {
    try {
      return {
        success: true,
        data: syncEngine.getStatus(),
        error: null
      }
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message
      }
    }
  })

  // Получение свежего профиля/суммари из Steam API (включая текущую игру gameExtraInfo)
  ipcMain.handle(IPC_CHANNELS.STEAM_GET_PLAYER_SUMMARIES, async (_event, steamId?: string) => {
    try {
      const apiKey = configManager.get('steamApiKey') as string
      if (apiKey) {
        steamApi.setApiKey(apiKey)
      }
      const targetSteamId = steamId || (configManager.get('steamId') as string)
      if (!targetSteamId) {
        return { success: false, data: null, error: 'Steam ID not configured' }
      }
      const summary = await steamApi.getPlayerSummaries(targetSteamId)
      return { success: true, data: summary, error: null }
    } catch (error: any) {
      logger.error('SteamIPC', `Failed to get player summary for ${steamId}`, error)
      return { success: false, data: null, error: error.message }
    }
  })

  // Получение профиля из БД
  ipcMain.handle(IPC_CHANNELS.STEAM_GET_PROFILE, async () => {
    try {
      const profile = userProfileRepository.getProfile()
      return {
        success: true,
        data: profile,
        error: null
      }
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message
      }
    }
  })
}
