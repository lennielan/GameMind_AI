import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import { autoUpdaterService } from '../../services/auto-updater'

export function registerUpdaterIpc(): void {
  ipcMain.handle(IPC_CHANNELS.UPDATER_CHECK, async () => {
    try {
      await autoUpdaterService.checkForUpdates()
      return { success: true, data: null, error: null }
    } catch (error: any) {
      return { success: false, data: null, error: error.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.UPDATER_INSTALL, async () => {
    try {
      autoUpdaterService.installUpdate()
      return { success: true, data: null, error: null }
    } catch (error: any) {
      return { success: false, data: null, error: error.message }
    }
  })
}
