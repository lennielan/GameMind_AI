import type { Database } from 'better-sqlite3'

export const migration017 = {
  version: 17,
  name: 'restore_achievements_sync',
  up: (database: Database): void => {
    try {
      // Сбрасываем флаг синхронизации для игр с 0 достижений,
      // так как предыдущая ошибка с 403 очистила БД, но не очистила флаг
      database.prepare('UPDATE games SET achievements_synced_at = NULL WHERE total_achievements = 0').run()
    } catch (e) {
      // ignore
    }
  }
}
