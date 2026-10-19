import type { Database as SqliteDatabase } from 'better-sqlite3'

export const migration002 = {
  version: 2,
  name: 'player_dna_summary',
  up: (database: SqliteDatabase): void => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS player_dna_summary (
        steam_id TEXT PRIMARY KEY,
        persona TEXT NOT NULL,
        description TEXT NOT NULL,
        top_genres TEXT NOT NULL,
        playstyle TEXT NOT NULL,
        generated_at INTEGER NOT NULL,
        ai_provider TEXT
      )
    `)
  }
}
