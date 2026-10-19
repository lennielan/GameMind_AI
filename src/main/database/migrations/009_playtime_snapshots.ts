import type { Database as SqliteDatabase } from 'better-sqlite3'

export const migration009 = {
  version: 9,
  name: 'playtime_snapshots',
  up: (database: SqliteDatabase): void => {
    const tx = database.transaction(() => {
      database.exec(`
        CREATE TABLE IF NOT EXISTS playtime_snapshots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          app_id INTEGER NOT NULL,
          timestamp INTEGER NOT NULL,
          playtime_forever INTEGER NOT NULL
        )
      `)
      database.prepare('CREATE INDEX IF NOT EXISTS idx_playtime_snapshots_app_id ON playtime_snapshots(app_id)').run()
      database.prepare('CREATE INDEX IF NOT EXISTS idx_playtime_snapshots_timestamp ON playtime_snapshots(timestamp)').run()
      
      // Seed initial snapshots for all current games so we have a baseline
      database.exec(`
        INSERT INTO playtime_snapshots (app_id, timestamp, playtime_forever)
        SELECT app_id, strftime('%s', 'now'), playtime_forever 
        FROM games 
        WHERE playtime_forever > 0
      `)
    })
    tx()
  }
}
