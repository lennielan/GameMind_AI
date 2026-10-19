import type { Database as SqliteDatabase } from 'better-sqlite3'

export const migration012 = {
  version: 12,
  name: 'badges_system',
  up: (database: SqliteDatabase): void => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS badges (
        id TEXT PRIMARY KEY,
        code_name TEXT UNIQUE NOT NULL,
        name_key TEXT NOT NULL,
        desc_key TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        acquisition_type TEXT NOT NULL,
        category TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `)

    database.exec(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        steam_id TEXT NOT NULL,
        badge_code TEXT NOT NULL,
        is_hidden INTEGER DEFAULT 0,
        granted_by TEXT,
        granted_at INTEGER NOT NULL,
        UNIQUE(steam_id, badge_code),
        FOREIGN KEY (badge_code) REFERENCES badges(code_name) ON DELETE CASCADE
      )
    `)

    database.prepare('CREATE INDEX IF NOT EXISTS idx_user_badges_steam_id ON user_badges(steam_id)').run()

    try {
      database.exec(`ALTER TABLE user_badges ADD COLUMN current_tier INTEGER DEFAULT 1`)
    } catch {}
  }
}
