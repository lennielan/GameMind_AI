import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipc-channels'
import { setSupabaseSession } from '../services/supabase.client'
import { logger } from '../logger/logger'

export function registerCloudIpc(): void {
  ipcMain.on(IPC_CHANNELS.CLOUD_SET_SESSION, (_event, accessToken: string, refreshToken: string) => {
    logger.info('Cloud', 'Received Supabase session from renderer')
    setSupabaseSession(accessToken, refreshToken)
  })
}
