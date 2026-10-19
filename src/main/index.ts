// ============================================================
// Main Process Entry Point — GameMind AI
// ============================================================

import 'dotenv/config'
import { app, BrowserWindow, shell, nativeTheme } from 'electron'

// Prevent Windows native occlusion tracking from freezing background rendering / overlay
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion')
// Fix electron-updater ERR_HTTP2_SERVER_REFUSED_STREAM when downloading from GitHub Releases
app.commandLine.appendSwitch('disable-http2')

import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { registerAllIpc } from './ipc'
import { initDatabase, closeDatabase } from './database/database'
import { configManager } from './config/config-manager'
import { BadgesService } from './services/badges.service'
import { logger } from './logger/logger'
import { autoUpdaterService } from './services/auto-updater'
import { syncEngine } from './services/steam/sync-engine'
import { overlayManager } from './overlay-manager'
import { trayManager } from './tray-manager'
import { realtimeService } from './services/realtime.service'
import { WINDOW_CONFIG, APP_NAME } from '@shared/constants'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  logger.info('App', 'Creating main window...')

  const iconPath = join(app.getAppPath(), 'resources', 'icon.png')

  mainWindow = new BrowserWindow({
    width: WINDOW_CONFIG.DEFAULT_WIDTH,
    height: WINDOW_CONFIG.DEFAULT_HEIGHT,
    minWidth: WINDOW_CONFIG.MIN_WIDTH,
    minHeight: WINDOW_CONFIG.MIN_HEIGHT,
    show: false,
    frame: false, // Custom titlebar
    titleBarStyle: 'hidden',
    title: APP_NAME,
    icon: iconPath,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      backgroundThrottling: false
    }
  })

  const showWindow = () => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show()
      mainWindow.focus()
      logger.info('App', 'Main window shown')
    }
  }

  // Show when ready — no white flash
  mainWindow.once('ready-to-show', showWindow)

  // Fallback: guarantee window is shown even if ready-to-show event is missed or delayed
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(showWindow, 300)
  })
  setTimeout(showWindow, 1500)

  // Open external links safely
  mainWindow.webContents.setWindowOpenHandler((details) => {
    try {
      const parsedUrl = new URL(details.url)
      const isSteam = parsedUrl.protocol === 'steam:'
      const isHttp = parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
      
      // Whitelist of allowed domain suffixes for http/https
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

      const isAllowedHttp = isHttp && allowedDomainSuffixes.some(
        (domain) => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
      )

      if (isSteam || isAllowedHttp) {
        shell.openExternal(details.url)
      } else {
        logger.warn('Security', `Blocked opening untrusted URL: ${details.url}`)
      }
    } catch (err) {
      logger.error('Security', `Invalid URL format blocked: ${details.url}`)
    }
    return { action: 'deny' }
  })

  // Load renderer
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Dev tools in development
  if (is.dev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ============================================================
// App Lifecycle
// ============================================================

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    trayManager.showWindow()
  })

  app.whenReady().then(async () => {
    logger.info('App', `${APP_NAME} starting...`)

    // Apply saved theme
    try {
      const theme = configManager.get('theme')
      nativeTheme.themeSource = theme === 'midnight' ? 'dark' : theme
    } catch (err) {
      logger.error('App', 'Failed to load theme config', err)
    }

    // Initialize database
    try {
      await initDatabase()
      logger.info('App', 'Database initialized')

      BadgesService.seedBadges()
      const steamId = configManager.get('steamId')
      if (steamId) {
        BadgesService.checkAutoBadges(steamId, 'startup')
      }
    } catch (error) {
      logger.error('App', 'Failed to initialize database', error)
    }

    // Initialize Auto-Launch feature
    try {
      const isDev = !app.isPackaged
      const getAutoLaunchSettings = (open: boolean) => 
        isDev ? { openAtLogin: open, path: process.execPath, args: [app.getAppPath()] } : { openAtLogin: open }

      if (!configManager.get('autoLaunchInitialized')) {
        app.setLoginItemSettings(getAutoLaunchSettings(true))
        configManager.set('launchOnStartup', true)
        configManager.set('autoLaunchInitialized', true)
        logger.info('App', 'Enabled auto-launch on startup for the first time after update')
      } else {
        app.setLoginItemSettings(getAutoLaunchSettings(configManager.get('launchOnStartup')))
      }
    } catch (error) {
      logger.error('App', 'Failed to initialize auto-launch settings', error)
    }

    // Register IPC handlers
    try {
      registerAllIpc()
    } catch (error) {
      logger.error('App', 'Failed to register IPC handlers', error)
    }

    // Create main window
    try {
      createWindow()
    } catch (error) {
      logger.error('App', 'Failed to create main window', error)
    }

    // Initialize System Tray
    if (mainWindow) {
      try {
        trayManager.initialize(mainWindow)
      } catch (error) {
        logger.error('App', 'Failed to initialize TrayManager', error)
      }
    }

    // Initialize overlay manager
    try {
      overlayManager.initialize()
    } catch (error) {
      logger.error('App', 'Failed to initialize overlay manager', error)
    }

    // Initialize and check for updates
    if (mainWindow) {
      try {
        autoUpdaterService.initialize(mainWindow)
        autoUpdaterService.checkForUpdates()
      } catch (error) {
        logger.error('App', 'AutoUpdater initialization error', error)
      }
    }

    // Auto-start background sync
    syncEngine.startSync().catch(err => {
      logger.warn('App', 'Initial background sync failed or paused', err)
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
        if (mainWindow) trayManager.initialize(mainWindow)
        overlayManager.initialize()
      } else {
        trayManager.showWindow()
      }
    })

    app.on('browser-window-focus', (_event, window) => {
      if (!window.isAlwaysOnTop()) {
        realtimeService.setAppFocused(true)
      }
    })

    app.on('browser-window-blur', (_event, window) => {
      if (!window.isAlwaysOnTop()) {
        const isAnyFocused = BrowserWindow.getAllWindows().some(w => !w.isAlwaysOnTop() && w.isFocused())
        if (!isAnyFocused) {
          realtimeService.setAppFocused(false)
        }
      }
    })

    logger.info('App', `${APP_NAME} started successfully`)
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' && trayManager.isQuitting) {
      closeDatabase()
      logger.info('App', 'All windows closed, quitting')
      app.quit()
    }
  })

  app.on('before-quit', () => {
    trayManager.isQuitting = true
    trayManager.destroy()
    closeDatabase()
  })

  // Security: prevent navigation in main window only (allow child windows like Steam login)
  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-navigate', (event, _url) => {
      // Only block navigation in the main window — child windows (Steam login) need it
      const win = BrowserWindow.fromWebContents(contents)
      if (win === mainWindow) {
        event.preventDefault()
      }
    })
  })
}
