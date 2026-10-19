import type { Database as SqliteDatabase } from 'better-sqlite3'

export const migration013 = {
  version: 13,
  name: 'journal_v2_upgrade',
  up: (database: SqliteDatabase): void => {
    const tx = database.transaction(() => {
      // Add report_json column to game_journals
      try {
        database.prepare('ALTER TABLE game_journals ADD COLUMN report_json TEXT').run()
      } catch (e) { /* column may already exist */ }

      try {
        database.prepare('ALTER TABLE game_journals ADD COLUMN version INTEGER DEFAULT 1').run()
      } catch (e) { /* column may already exist */ }

      try {
        database.prepare('ALTER TABLE game_journals ADD COLUMN is_viewed INTEGER DEFAULT 1').run()
      } catch (e) { /* column may already exist */ }

      // Player DNA snapshots per month
      database.exec(`
        CREATE TABLE IF NOT EXISTS player_dna_snapshots (
          id TEXT PRIMARY KEY,
          month TEXT NOT NULL UNIQUE,
          traits_json TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )
      `)

      // Journal metadata (last checked month, etc.)
      database.exec(`
        CREATE TABLE IF NOT EXISTS journal_meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `)
    })
    tx()
  }
}
