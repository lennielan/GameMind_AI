// ============================================================
// Main Process Entry Point — GameMind AI
// ============================================================

import { app, BrowserWindow, shell, nativeTheme } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { registerAllIpc } from './ipc'
import { initDatabase, closeDatabase } from './database/database'
import { configManager } from './config/config-manager'
import { logger } from './logger/logger'
import { autoUpdaterService } from './services/auto-updater'
import { WINDOW_CONFIG, APP_NAME } from '@shared/constants'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
// ... existing createWindow code ...
  logger.info('App', 'Creating main window...')

  mainWindow = new BrowserWindow({
    width: WINDOW_CONFIG.DEFAULT_WIDTH,
    height: WINDOW_CONFIG.DEFAULT_HEIGHT,
    minWidth: WINDOW_CONFIG.MIN_WIDTH,
    minHeight: WINDOW_CONFIG.MIN_HEIGHT,
    show: false,
    frame: false, // Custom titlebar
    titleBarStyle: 'hidden',
    title: APP_NAME,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  // Show when ready — no white flash
  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    logger.info('App', 'Main window shown')
  })

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
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

app.whenReady().then(async () => {
  logger.info('App', `${APP_NAME} starting...`)

  // Apply saved theme
  const theme = configManager.get('theme')
  nativeTheme.themeSource = theme

  // Initialize database
  try {
    await initDatabase()
    logger.info('App', 'Database initialized')
  } catch (error) {
    logger.error('App', 'Failed to initialize database', error)
  }

  // Register IPC handlers
  registerAllIpc()

  // Create window
  createWindow()

  // Initialize and check for updates
  if (mainWindow) {
    autoUpdaterService.initialize(mainWindow)
    autoUpdaterService.checkForUpdates()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  logger.info('App', `${APP_NAME} started successfully`)
})

app.on('window-all-closed', () => {
  closeDatabase()
  logger.info('App', 'All windows closed, quitting')
  app.quit()
})

app.on('before-quit', () => {
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
