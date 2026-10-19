// ============================================================
// IPC Registration — Central registration point
// ============================================================

import { logger } from '../logger/logger'

export function registerAllIpc(): void {
  logger.info('IPC', 'Registering all IPC handlers...')

  // Automatically register all IPC handlers in the handlers directory
  const handlers = import.meta.glob('./handlers/*.ts', { eager: true })
  
  for (const path in handlers) {
    const module = handlers[path] as Record<string, any>
    for (const key of Object.keys(module)) {
      if (typeof module[key] === 'function' && key.startsWith('register')) {
        module[key]()
      }
    }
  }

  logger.info('IPC', 'All IPC handlers registered')
}
