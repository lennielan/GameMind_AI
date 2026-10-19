// ============================================================
// Avatar IPC — File selection, cropping and storage
// ============================================================

import { ipcMain, dialog, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipc-channels'
import { logger } from '../../logger/logger'
import type { IpcResult } from '@shared/types'
import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'

function getAvatarDir(): string {
  const dir = path.join(app.getPath('userData'), 'avatars')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

export function registerAvatarIpc(): void {
  // Open file dialog and return base64 data of the selected image
  ipcMain.handle(
    IPC_CHANNELS.AVATAR_SELECT_FILE,
    async (): Promise<IpcResult<string>> => {
      try {
        const win = BrowserWindow.getFocusedWindow()
        const result = await dialog.showOpenDialog(win!, {
          title: 'Выберите изображение для аватарки',
          properties: ['openFile'],
          filters: [
            { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }
          ]
        })

        if (result.canceled || result.filePaths.length === 0) {
          return { success: false, data: null, error: 'cancelled' }
        }

        const filePath = result.filePaths[0]
        const buffer = fs.readFileSync(filePath)
        const ext = path.extname(filePath).toLowerCase().replace('.', '')
        const mimeType = ext === 'jpg' ? 'jpeg' : ext
        const base64 = `data:image/${mimeType};base64,${buffer.toString('base64')}`

        return { success: true, data: base64, error: null }
      } catch (error) {
        logger.error('AvatarIPC', 'Failed to select file', error)
        return { success: false, data: null, error: String(error) }
      }
    }
  )

  // Save cropped avatar (receives base64 data URL)
  ipcMain.handle(
    IPC_CHANNELS.AVATAR_SAVE,
    async (_event, base64DataUrl: string): Promise<IpcResult<string>> => {
      try {
        if (!base64DataUrl || !base64DataUrl.startsWith('data:image/')) {
          return { success: false, data: null, error: 'Invalid image data' }
        }

        const avatarDir = getAvatarDir()
        const filename = `avatar_${Date.now()}.png`
        const filePath = path.join(avatarDir, filename)

        // Strip data URL prefix
        const base64Data = base64DataUrl.replace(/^data:image\/\w+;base64,/, '')
        const buffer = Buffer.from(base64Data, 'base64')

        fs.writeFileSync(filePath, buffer)

        // Clean up old avatars (keep only the latest)
        const files = fs.readdirSync(avatarDir)
          .filter(f => f.startsWith('avatar_') && f !== filename)
        for (const old of files) {
          try {
            fs.unlinkSync(path.join(avatarDir, old))
          } catch {
            // ignore cleanup errors
          }
        }

        // Return the file:// URL that the renderer can use
        const fileUrl = `file://${filePath.replace(/\\/g, '/')}`
        return { success: true, data: fileUrl, error: null }
      } catch (error) {
        logger.error('AvatarIPC', 'Failed to save avatar', error)
        return { success: false, data: null, error: String(error) }
      }
    }
  )

  // Get current avatar path
  ipcMain.handle(
    IPC_CHANNELS.AVATAR_GET_PATH,
    async (): Promise<IpcResult<string | null>> => {
      try {
        const avatarDir = getAvatarDir()
        const files = fs.readdirSync(avatarDir)
          .filter(f => f.startsWith('avatar_'))
          .sort()
          .reverse()

        if (files.length === 0) {
          return { success: true, data: null, error: null }
        }

        const filePath = path.join(avatarDir, files[0])
        const fileUrl = `file://${filePath.replace(/\\/g, '/')}`
        return { success: true, data: fileUrl, error: null }
      } catch (error) {
        logger.error('AvatarIPC', 'Failed to get avatar path', error)
        return { success: false, data: null, error: String(error) }
      }
    }
  )

  logger.info('AvatarIPC', 'Avatar IPC handlers registered')
}
