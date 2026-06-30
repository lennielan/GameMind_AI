// ============================================================
// SQLite Database — sql.js (WASM-based, zero native deps)
// ============================================================

import Database from 'better-sqlite3'
import type { Database as SqliteDatabase } from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { logger } from '../logger/logger'

let db: SqliteDatabase | null = null
let dbPath: string = ''

export async function initDatabase(): Promise<SqliteDatabase> {
  if (db) return db

  const dbDir = join(app.getPath('userData'), 'data')
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }

  dbPath = join(dbDir, 'gamemind.db')
  logger.info('Database', `Opening database at ${dbPath}`)

  db = new Database(dbPath)
  
  // Enable WAL mode
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')

  runMigrations(db)

  return db
}

export function getDatabase(): SqliteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

export function closeDatabase(): void {
  if (db) {
    logger.info('Database', 'Closing database connection')
    db.close()
    db = null
  }
}

// ============================================================
// Helper: run a query and return typed results
// ============================================================

export function queryAll<T>(sql: string, params: unknown[] = []): T[] {
  const database = getDatabase()
  const stmt = database.prepare(sql)
  return stmt.all(...params) as T[]
}

export function queryOne<T>(sql: string, params: unknown[] = []): T | null {
  const database = getDatabase()
  const stmt = database.prepare(sql)
  const result = stmt.get(...params) as T | undefined
  return result !== undefined ? result : null
}

export function execute(sql: string, params: unknown[] = []): void {
  const database = getDatabase()
  const stmt = database.prepare(sql)
  stmt.run(...params)
}

// ============================================================
// Migration System
// ============================================================

interface Migration {
  version: number
  name: string
  up: (database: SqliteDatabase) => void
}

import { migration002 } from './migrations/002_player_dna_summary'

const migrations: Migration[] = [
  migration002,
  {
    version: 4,
    name: 'add_hardware_evaluation',
    up: (database: SqliteDatabase): void => {
      try {
        database.prepare('ALTER TABLE recommendations ADD COLUMN hardware_evaluation TEXT').run()
      } catch (e) {
        // ignore
      }
    }
  },
  {
    version: 3,
    name: 'add_achievements_columns',
    up: (database: SqliteDatabase): void => {
      try {
        database.prepare('ALTER TABLE games ADD COLUMN total_achievements INTEGER DEFAULT 0').run()
      } catch (e) {
        // ignore
      }
      try {
        database.prepare('ALTER TABLE games ADD COLUMN unlocked_achievements INTEGER DEFAULT 0').run()
      } catch (e) {
        // ignore
      }
    }
  },
  {
    version: 1,
    name: 'initial_schema',
    up: (database: SqliteDatabase): void => {
      database.exec(`
        CREATE TABLE IF NOT EXISTS user_profile (
          steam_id TEXT PRIMARY KEY,
          persona_name TEXT,
          avatar_url TEXT,
          avatar_medium_url TEXT,
          avatar_full_url TEXT,
          profile_url TEXT,
          country_code TEXT,
          time_created INTEGER,
          last_logoff INTEGER,
          persona_state INTEGER,
          last_synced_at INTEGER
        )
      `)

      database.exec(`
        CREATE TABLE IF NOT EXISTS games (
          app_id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          playtime_forever INTEGER DEFAULT 0,
          playtime_2weeks INTEGER DEFAULT 0,
          img_icon_url TEXT,
          header_image TEXT,
          has_community_visible_stats INTEGER DEFAULT 0,
          last_played_at INTEGER,
          added_at INTEGER,
          genres TEXT DEFAULT '[]',
          tags TEXT DEFAULT '[]',
          developers TEXT DEFAULT '[]',
          publishers TEXT DEFAULT '[]',
          release_date TEXT,
          metacritic_score INTEGER,
          description TEXT,
          short_description TEXT,
          screenshots TEXT DEFAULT '[]',
          platforms TEXT DEFAULT '[]',
          categories TEXT DEFAULT '[]',
          price_initial INTEGER,
          price_final INTEGER,
          hltb_main REAL,
          hltb_extra REAL,
          hltb_completionist REAL,
          engine TEXT,
          franchise TEXT,
          total_achievements INTEGER DEFAULT 0,
          unlocked_achievements INTEGER DEFAULT 0,
          updated_at INTEGER
        )
      `)

      database.exec(`
        CREATE TABLE IF NOT EXISTS achievements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          app_id INTEGER NOT NULL,
          api_name TEXT NOT NULL,
          display_name TEXT,
          description TEXT,
          icon TEXT,
          icon_gray TEXT,
          achieved INTEGER DEFAULT 0,
          unlock_time INTEGER,
          global_percent REAL,
          UNIQUE(app_id, api_name),
          FOREIGN KEY (app_id) REFERENCES games(app_id) ON DELETE CASCADE
        )
      `)

      database.exec(`
        CREATE TABLE IF NOT EXISTS friends (
          steam_id TEXT PRIMARY KEY,
          persona_name TEXT,
          avatar_url TEXT,
          relationship TEXT,
          friend_since INTEGER,
          similarity_score REAL,
          common_games TEXT DEFAULT '[]',
          last_synced_at INTEGER
        )
      `)

      database.exec(`
        CREATE TABLE IF NOT EXISTS player_dna (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          steam_id TEXT NOT NULL,
          trait_name TEXT NOT NULL,
          trait_value REAL NOT NULL,
          confidence REAL NOT NULL,
          reasoning TEXT,
          generated_at INTEGER NOT NULL,
          ai_provider TEXT
        )
      `)

      database.exec(`
        CREATE TABLE IF NOT EXISTS insights (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          steam_id TEXT NOT NULL,
          category TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          severity TEXT DEFAULT 'info',
          data TEXT,
          generated_at INTEGER NOT NULL,
          dismissed INTEGER DEFAULT 0
        )
      `)

      database.exec(`
        CREATE TABLE IF NOT EXISTS recommendations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          steam_id TEXT NOT NULL,
          app_id INTEGER,
          game_name TEXT NOT NULL,
          reasoning TEXT NOT NULL,
          score REAL,
          context TEXT,
          generated_at INTEGER NOT NULL,
          user_feedback TEXT
        )
      `)

      database.exec(`
        CREATE TABLE IF NOT EXISTS wishlist (
          app_id INTEGER PRIMARY KEY,
          steam_id TEXT NOT NULL,
          name TEXT,
          priority INTEGER,
          added_at INTEGER,
          price_initial INTEGER,
          price_final INTEGER,
          discount_percent INTEGER,
          ai_buy_priority REAL,
          ai_favorite_prediction REAL,
          ai_reasoning TEXT,
          updated_at INTEGER
        )
      `)

      database.exec(`
        CREATE TABLE IF NOT EXISTS api_cache (
          cache_key TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          created_at INTEGER NOT NULL
        )
      `)

      database.exec(`
        CREATE TABLE IF NOT EXISTS sync_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sync_type TEXT NOT NULL,
          status TEXT NOT NULL,
          started_at INTEGER NOT NULL,
          completed_at INTEGER,
          records_processed INTEGER DEFAULT 0,
          error TEXT
        )
      `)

      // Indexes
      database.prepare('CREATE INDEX IF NOT EXISTS idx_games_playtime ON games(playtime_forever DESC)').run()
      database.prepare('CREATE INDEX IF NOT EXISTS idx_games_last_played ON games(last_played_at DESC)').run()
      database.prepare('CREATE INDEX IF NOT EXISTS idx_achievements_app_id ON achievements(app_id)').run()
      database.prepare('CREATE INDEX IF NOT EXISTS idx_achievements_achieved ON achievements(achieved)').run()
      database.prepare('CREATE INDEX IF NOT EXISTS idx_player_dna_steam_id ON player_dna(steam_id)').run()
      database.prepare('CREATE INDEX IF NOT EXISTS idx_insights_steam_id ON insights(steam_id)').run()
      database.prepare('CREATE INDEX IF NOT EXISTS idx_recommendations_steam_id ON recommendations(steam_id)').run()
      database.prepare('CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON api_cache(expires_at)').run()
      database.prepare('CREATE INDEX IF NOT EXISTS idx_sync_log_type ON sync_log(sync_type)').run()
    }
  }
]

export function sortMigrationsByVersion<T extends Migration>(migrationsToSort: T[]): T[] {
  return [...migrationsToSort].sort((a, b) => a.version - b.version)
}

function runMigrations(database: SqliteDatabase): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    )
  `)

  const appliedRows = queryAll<{ version: number }>(
    'SELECT version FROM _migrations ORDER BY version'
  )
  const appliedSet = new Set(appliedRows.map((m) => m.version))

  const sortedMigrations = sortMigrationsByVersion(migrations)

  for (const migration of sortedMigrations) {
    if (!appliedSet.has(migration.version)) {
      logger.info('Database', `Running migration ${migration.version}: ${migration.name}`)
      migration.up(database)
      database.prepare('INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)').run(migration.version, migration.name, Date.now())
      logger.info('Database', `Migration ${migration.version} applied successfully`)
    }
  }
}
