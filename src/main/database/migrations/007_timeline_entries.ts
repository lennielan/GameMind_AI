import type { Database as SqliteDatabase } from 'better-sqlite3'

export const migration007 = {
  version: 7,
  name: 'timeline_entries',
  up: (database: SqliteDatabase): void => {
    const tx = database.transaction(() => {
      // Drop old table to clean up
      database.exec('DROP TABLE IF EXISTS timeline_milestones')

      // Create the new universal entries table
      database.exec(`
        CREATE TABLE IF NOT EXISTS timeline_entries (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          date INTEGER NOT NULL,
          title TEXT NOT NULL,
          facts TEXT,
          ai_interpretation TEXT,
          metadata TEXT
        )
      `)
      database.prepare('CREATE INDEX IF NOT EXISTS idx_timeline_entries_date ON timeline_entries(date DESC)').run()
    })
    tx()
  }
}
