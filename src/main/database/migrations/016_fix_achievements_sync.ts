import type { Database } from 'better-sqlite3'

export const migration016 = {
  version: 16,
  name: 'fix_achievements_sync',
  up: (database: Database): void => {
    try {
      // Сбрасываем флаг синхронизации для игр с 0 достижений,
      // чтобы движок перепроверил их с новой логикой Steam API
      database.prepare('UPDATE games SET achievements_synced_at = NULL WHERE total_achievements = 0').run()
    } catch (e) {
      // ignore
    }
  }
}
