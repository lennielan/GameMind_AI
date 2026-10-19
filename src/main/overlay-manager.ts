import { BrowserWindow, screen, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { IPC_CHANNELS } from '../shared/constants'
import { logger } from './logger/logger'
import { configManager } from './config/config-manager'

class OverlayManager {
  private overlayWindow: BrowserWindow | null = null
  private isReady = false
  private pendingMessages: any[] = []

  constructor() {
    this.setupIpc()
  }

  private setupIpc(): void {
    ipcMain.handle(IPC_CHANNELS.OVERLAY_CLOSE, () => {
      this.hideNotification()
    })

    ipcMain.handle(IPC_CHANNELS.OVERLAY_CLICK, (_, senderId: string) => {
      this.hideNotification()
      
      const allWindows = BrowserWindow.getAllWindows()
      const mainWindow = allWindows.find(w => w !== this.overlayWindow)
      
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.show()
        mainWindow.focus()
        
        if (senderId === 'SYSTEM:RECS' || senderId === 'SYSTEM') {
          mainWindow.webContents.send(IPC_CHANNELS.APP_NAVIGATE, { path: '/recommendations' })
        } else if (senderId === 'SYSTEM:DNA') {
          mainWindow.webContents.send(IPC_CHANNELS.APP_NAVIGATE, { path: '/player-dna' })
        } else {
          mainWindow.webContents.send(IPC_CHANNELS.APP_NAVIGATE, { path: '/chats', state: { targetUserId: senderId } })
        }
      }
    })

    // Expose IPC method for renderer process to directly invoke overlay notification
    ipcMain.handle('overlay:show-notification', (_, messageData: any) => {
      this.showNotification(messageData)
    })
  }

  /**
   * Calculate the correct bottom-right position accounting for
   * multi-monitor setups and taskbar position.
   */
  private getOverlayBounds(): { x: number; y: number; width: number; height: number } {
    const primaryDisplay = screen.getPrimaryDisplay()
    const workArea = primaryDisplay.workArea // includes x, y, width, height
    const overlayWidth = 390
    const overlayHeight = 115
    const margin = 20

    return {
      x: workArea.x + workArea.width - overlayWidth - margin,
      y: workArea.y + workArea.height - overlayHeight - margin,
      width: overlayWidth,
      height: overlayHeight
    }
  }

  public initialize(): void {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) return

    const bounds = this.getOverlayBounds()

    this.overlayWindow = new BrowserWindow({
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      frame: false,
      transparent: true,
      hasShadow: false,
      backgroundColor: '#00000000',
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      resizable: false,
      show: false, // Hidden until notification arrives
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        backgroundThrottling: false
      }
    })

    this.overlayWindow.setIgnoreMouseEvents(true, { forward: true })
    this.overlayWindow.setAlwaysOnTop(true, 'screen-saver')
    this.overlayWindow.setVisibleOnAllWorkspaces(true)

    // Mark ready ONLY after the renderer has fully loaded (React mounted)
    this.overlayWindow.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        this.isReady = true
        logger.info('OverlayManager', 'Overlay window ready, flushing pending messages')
        this.flushPendingMessages()
      }, 300)
    })

    this.overlayWindow.on('closed', () => {
      this.overlayWindow = null
      this.isReady = false
    })

    // Load the overlay route
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.overlayWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/#/overlay')
    } else {
      this.overlayWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/overlay' })
    }

    logger.info('OverlayManager', 'Overlay window initialized')
  }

  /**
   * Flush any messages that were queued while the overlay was loading.
   */
  private flushPendingMessages(): void {
    if (!this.isReady || !this.overlayWindow) return

    while (this.pendingMessages.length > 0) {
      const msg = this.pendingMessages.shift()
      if (msg) {
        this.deliverNotification(msg)
      }
    }
  }

  /**
   * Send the IPC message and make the overlay visible on top of all desktop windows.
   */
  private deliverNotification(messageData: any): void {
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) return

    // Update position in case monitor resolution changed
    const bounds = this.getOverlayBounds()
    this.overlayWindow.setBounds(bounds)

    this.overlayWindow.setAlwaysOnTop(true, 'screen-saver')
    this.overlayWindow.setVisibleOnAllWorkspaces(true)
    this.overlayWindow.setIgnoreMouseEvents(false)
    this.overlayWindow.showInactive()
    this.overlayWindow.moveTop()

    const theme = configManager.get('theme') || 'dark'
    const accentColor = configManager.get('accentColor') || 'violet'

    this.overlayWindow.webContents.send(IPC_CHANNELS.SHOW_OVERLAY_MESSAGE, {
      ...messageData,
      theme,
      accentColor
    })
    logger.info('OverlayManager', `Notification delivered for sender: ${messageData?.sender_id || 'unknown'} (theme: ${theme}, accent: ${accentColor})`)
  }

  public showNotification(messageData: any): void {
    const isOverlayEnabled = configManager.get('chatOverlayEnabled') ?? true
    if (!isOverlayEnabled && !messageData.sender_id?.startsWith('SYSTEM')) {
      logger.info('OverlayManager', 'showNotification skipped because chatOverlayEnabled is false')
      return
    }

    logger.info('OverlayManager', `showNotification called, ready=${this.isReady}, window=${!!this.overlayWindow}`)

    // Ensure overlay window exists
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) {
      this.overlayWindow = null
      this.isReady = false
      this.initialize()
    }

    if (this.isReady) {
      this.deliverNotification(messageData)
    } else {
      logger.info('OverlayManager', 'Overlay not ready yet, queueing message')
      this.pendingMessages.push(messageData)
    }
  }

  public hideNotification(): void {
    if (!this.overlayWindow || this.overlayWindow.isDestroyed()) return
    this.overlayWindow.setIgnoreMouseEvents(true, { forward: true })
    this.overlayWindow.hide()
  }
}

export const overlayManager = new OverlayManager()
