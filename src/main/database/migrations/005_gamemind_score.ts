import type { Database } from 'better-sqlite3'

export const migration005 = {
  version: 5,
  name: 'gamemind_score',
  up: (database: Database): void => {
    try {
      database.prepare('ALTER TABLE user_profile ADD COLUMN gamemind_score INTEGER').run()
    } catch (e) {
      // ignore if exists
    }
    try {
      database.prepare('ALTER TABLE user_profile ADD COLUMN gamemind_title TEXT').run()
    } catch (e) {
      // ignore
    }
    try {
      database.prepare('ALTER TABLE user_profile ADD COLUMN gamemind_analysis TEXT').run()
    } catch (e) {
      // ignore
    }
  }
}
