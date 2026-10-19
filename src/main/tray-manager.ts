// ============================================================
// System Tray Manager — GameMind AI
// ============================================================

import { app, Tray, Menu, BrowserWindow, nativeImage } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { logger } from './logger/logger'
import { APP_NAME } from '@shared/constants'

class TrayManager {
  private tray: Tray | null = null
  private mainWindow: BrowserWindow | null = null
  public isQuitting = false

  public initialize(window: BrowserWindow): void {
    this.mainWindow = window

    // Determine icon path (resources/icon.png or fallback)
    const iconPath = this.getIconPath()
    logger.info('Tray', `Initializing Tray with icon path: ${iconPath}`)

    let icon = nativeImage.createFromPath(iconPath)
    if (icon.isEmpty()) {
      logger.warn('Tray', 'Native icon was empty, creating fallback image')
      icon = nativeImage.createEmpty()
    }

    try {
      this.tray = new Tray(icon)
      this.tray.setToolTip(APP_NAME)

      this.updateContextMenu()

      // Click / Double-click to toggle main window
      this.tray.on('click', () => this.toggleWindow())
      this.tray.on('double-click', () => this.showWindow())

      // Listen for window close event — hide to tray instead of quitting unless app is quitting
      this.mainWindow.on('close', (event) => {
        if (!this.isQuitting) {
          event.preventDefault()
          this.mainWindow?.hide()
          logger.info('Tray', 'Main window hidden to System Tray')
        }
      })

      logger.info('Tray', 'System Tray initialized successfully')
    } catch (error) {
      logger.error('Tray', 'Failed to create System Tray icon', error)
    }
  }

  public showWindow(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore()
      }
      this.mainWindow.show()
      this.mainWindow.focus()
      logger.info('Tray', 'Main window restored from Tray')
    }
  }

  public hideWindow(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.hide()
      logger.info('Tray', 'Main window hidden to Tray')
    }
  }

  public toggleWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return

    if (this.mainWindow.isVisible() && !this.mainWindow.isMinimized() && this.mainWindow.isFocused()) {
      this.hideWindow()
    } else {
      this.showWindow()
    }
  }

  public quitApp(): void {
    logger.info('Tray', 'Quitting application completely via Tray action...')
    this.isQuitting = true
    if (this.tray && !this.tray.isDestroyed()) {
      this.tray.destroy()
      this.tray = null
    }
    app.quit()
  }

  private updateContextMenu(): void {
    if (!this.tray) return

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Открыть GameMind AI',
        click: () => this.showWindow()
      },
      {
        label: 'Скрыть в трей',
        click: () => this.hideWindow()
      },
      { type: 'separator' },
      {
        label: 'Выйти из приложения',
        click: () => this.quitApp()
      }
    ])

    this.tray.setContextMenu(contextMenu)
  }

  private getIconPath(): string {
    // 1. Check resources/icon.png in app root
    const devPath = join(app.getAppPath(), 'resources', 'icon.png')
    if (existsSync(devPath)) return devPath

    // 2. Check unpacked resources path in production
    const prodPath = join(process.resourcesPath, 'resources', 'icon.png')
    if (existsSync(prodPath)) return prodPath

    // 3. Fallback to build/icon.png
    const buildPath = join(app.getAppPath(), 'build', 'icon.png')
    if (existsSync(buildPath)) return buildPath

    return devPath
  }

  public destroy(): void {
    if (this.tray && !this.tray.isDestroyed()) {
      this.tray.destroy()
      this.tray = null
    }
  }
}

export const trayManager = new TrayManager()
