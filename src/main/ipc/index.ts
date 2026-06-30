// ============================================================
// IPC Registration — Central registration point
// ============================================================

import { registerSettingsIpc } from './settings.ipc'
import { registerAppIpc } from './app.ipc'
import { registerDbIpc } from './db.ipc'
import { registerSteamIpc } from './steam.ipc'
import { registerAiIpc } from './ai.ipc'
import { registerUpdaterIpc } from './updater.ipc'
import { registerCloudIpc } from './cloud.ipc'
import { registerFriendsIpc } from './friends.ipc'
import { logger } from '../logger/logger'

export function registerAllIpc(): void {
  logger.info('IPC', 'Registering all IPC handlers...')

  registerAppIpc()
  registerSettingsIpc()
  registerDbIpc()
  registerSteamIpc()
  registerAiIpc()
  registerUpdaterIpc()
  registerCloudIpc()
  registerFriendsIpc()

  logger.info('IPC', 'All IPC handlers registered')
}
