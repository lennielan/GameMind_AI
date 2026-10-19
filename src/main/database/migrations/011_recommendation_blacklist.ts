import type { Database as SqliteDatabase } from 'better-sqlite3'

export const migration011 = {
  version: 11,
  name: 'recommendation_blacklist_and_history',
  up: (database: SqliteDatabase): void => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS recommendation_blacklist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        steam_id TEXT NOT NULL,
        app_id INTEGER NOT NULL,
        game_name TEXT,
        added_at INTEGER NOT NULL,
        UNIQUE(steam_id, app_id)
      )
    `)
    database.exec(`
      CREATE TABLE IF NOT EXISTS recommendation_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        steam_id TEXT NOT NULL,
        app_id INTEGER NOT NULL,
        game_name TEXT,
        recommended_at INTEGER NOT NULL
      )
    `)
    // Indexes
    database.prepare('CREATE INDEX IF NOT EXISTS idx_rec_blacklist_steam ON recommendation_blacklist(steam_id)').run()
    database.prepare('CREATE INDEX IF NOT EXISTS idx_rec_history_steam ON recommendation_history(steam_id)').run()
  }
}
