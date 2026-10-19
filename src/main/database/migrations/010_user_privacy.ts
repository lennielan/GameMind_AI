import type { Database as SqliteDatabase } from 'better-sqlite3'

export const migration010 = {
  version: 10,
  name: 'user_privacy_flags',
  up: (database: SqliteDatabase): void => {
    try {
      database.prepare('ALTER TABLE user_profile ADD COLUMN is_library_public INTEGER DEFAULT 1').run()
    } catch (_e) {
      // Column may already exist
    }
    try {
      database.prepare('ALTER TABLE user_profile ADD COLUMN is_dna_public INTEGER DEFAULT 1').run()
    } catch (_e) {
      // Column may already exist
    }
  }
}
