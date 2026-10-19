import type { Database as SqliteDatabase } from 'better-sqlite3'

export const migration008 = {
  version: 8,
  name: 'create_game_journals_table',
  up: (database: SqliteDatabase): void => {
    const tx = database.transaction(() => {
      database.exec(`
        CREATE TABLE IF NOT EXISTS game_journals (
          id TEXT PRIMARY KEY,
          month TEXT NOT NULL UNIQUE,
          stats_json TEXT NOT NULL,
          narrative_json TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )
      `)
    })
    tx()
  }
}
