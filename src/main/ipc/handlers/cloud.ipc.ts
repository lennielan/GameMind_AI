import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipc-channels'
import { setSupabaseSession } from '../../services/supabase.client'
import { realtimeService } from '../../services/realtime.service'
import { logger } from '../../logger/logger'

export function registerCloudIpc(): void {
  ipcMain.on(IPC_CHANNELS.CLOUD_SET_SESSION, async (_event, accessToken: string, refreshToken: string) => {
    logger.info('Cloud', 'Received Supabase session from renderer')
    await setSupabaseSession(accessToken, refreshToken)
    realtimeService.initialize().catch(e => logger.error('Cloud', 'Failed to init realtime service', e))
  })
}
