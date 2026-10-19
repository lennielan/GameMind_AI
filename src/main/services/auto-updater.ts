import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels'
import { logger } from '../logger/logger'

export class AutoUpdaterService {
  private mainWindow: BrowserWindow | null = null

  constructor() {
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.logger = {
      info: (msg) => logger.info('Updater', msg),
      warn: (msg) => logger.warn('Updater', msg),
      error: (msg) => logger.error('Updater', msg),
      debug: (msg) => logger.debug('Updater', msg)
    }

    this.registerListeners()
  }

  public initialize(window: BrowserWindow): void {
    this.mainWindow = window
    logger.info('Updater', 'AutoUpdaterService initialized with main window')

    // Периодическая проверка обновлений: каждые 2 часа (7200000 мс)
    setInterval(() => {
      this.checkForUpdates().catch((err) => {
        logger.error('Updater', 'Periodic update check failed', err)
      })
    }, 2 * 60 * 60 * 1000)
  }

  public async checkForUpdates(): Promise<void> {
    try {
      logger.info('Updater', 'Checking for updates...')
      await autoUpdater.checkForUpdates()
    } catch (error) {
      logger.error('Updater', 'Failed to check for updates', error)
      this.sendEvent(IPC_CHANNELS.UPDATER_ERROR, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  public installUpdate(): void {
    logger.info('Updater', 'Quitting and installing update...')
    
    // Destroy all windows to hide UI and speed up quit process
    BrowserWindow.getAllWindows().forEach(w => {
      if (!w.isDestroyed()) w.destroy()
    })
    
    autoUpdater.quitAndInstall(true, true)
  }

  private registerListeners(): void {
    autoUpdater.on('checking-for-update', () => {
      logger.info('Updater', 'Checking for update...')
    })

    autoUpdater.on('update-available', (info) => {
      logger.info('Updater', `Update available: ${info.version}`)
      this.sendEvent(IPC_CHANNELS.UPDATER_UPDATE_AVAILABLE, info)
    })

    autoUpdater.on('update-not-available', (info) => {
      logger.info('Updater', `Update not available: ${info.version}`)
    })

    autoUpdater.on('error', (err) => {
      logger.error('Updater', 'Error in auto-updater', err)
      this.sendEvent(IPC_CHANNELS.UPDATER_ERROR, err.message)
    })

    autoUpdater.on('download-progress', (progressObj) => {
      logger.info('Updater', `Download progress: ${progressObj.percent.toFixed(2)}%`)
      this.sendEvent(IPC_CHANNELS.UPDATER_DOWNLOAD_PROGRESS, {
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total,
        bytesPerSecond: progressObj.bytesPerSecond
      })
    })

    autoUpdater.on('update-downloaded', (info) => {
      logger.info('Updater', `Update downloaded: ${info.version}`)
      this.sendEvent(IPC_CHANNELS.UPDATER_READY, info)
    })
  }

  private sendEvent(channel: string, payload?: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, payload)
    }
  }
}

export const autoUpdaterService = new AutoUpdaterService()
