// ============================================================
// SQLite Database — sql.js (WASM-based, zero native deps)
// ============================================================

import Database from 'better-sqlite3'
import type { Database as SqliteDatabase } from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { logger } from '../logger/logger'
import { runMigrations } from './migrations'

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
