import type { Database as SqliteDatabase } from 'better-sqlite3'

export const migration006 = {
  version: 6,
  name: 'timeline_milestones',
  up: (database: SqliteDatabase): void => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS timeline_milestones (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        date INTEGER NOT NULL,
        title TEXT NOT NULL,
        ai_narrative TEXT,
        metadata TEXT
      )
    `)
    database.prepare('CREATE INDEX IF NOT EXISTS idx_timeline_date ON timeline_milestones(date DESC)').run()
  }
}
