// ============================================================
// Cache Manager — TTL-based API response caching (sql.js)
// ============================================================

import { queryOne, queryAll, execute } from '../database/database'
import { logger } from '../logger/logger'

export class CacheManager {
  get<T>(key: string): T | null {
    try {
      const row = queryOne<{ data: string; expires_at: number }>(
        'SELECT data, expires_at FROM api_cache WHERE cache_key = ?',
        [key]
      )

      if (!row) return null

      if (row.expires_at < Date.now()) {
        execute('DELETE FROM api_cache WHERE cache_key = ?', [key])
        return null
      }

      return JSON.parse(row.data) as T
    } catch (error) {
      logger.error('CacheManager', `Failed to get cache for key: ${key}`, error)
      return null
    }
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    try {
      // Delete existing entry first (sql.js doesn't have INSERT OR REPLACE same way)
      execute('DELETE FROM api_cache WHERE cache_key = ?', [key])
      execute(
        'INSERT INTO api_cache (cache_key, data, expires_at, created_at) VALUES (?, ?, ?, ?)',
        [key, JSON.stringify(data), Date.now() + ttlMs, Date.now()]
      )
    } catch (error) {
      logger.error('CacheManager', `Failed to set cache for key: ${key}`, error)
    }
  }

  delete(key: string): void {
    try {
      execute('DELETE FROM api_cache WHERE cache_key = ?', [key])
    } catch (error) {
      logger.error('CacheManager', `Failed to delete cache for key: ${key}`, error)
    }
  }

  clearExpired(): number {
    try {
      const before = queryAll<{ cache_key: string }>(
        'SELECT cache_key FROM api_cache WHERE expires_at < ?',
        [Date.now()]
      )
      execute('DELETE FROM api_cache WHERE expires_at < ?', [Date.now()])
      logger.info('CacheManager', `Cleared ${before.length} expired cache entries`)
      return before.length
    } catch (error) {
      logger.error('CacheManager', 'Failed to clear expired cache', error)
      return 0
    }
  }

  clearAll(): void {
    try {
      execute('DELETE FROM api_cache')
      logger.info('CacheManager', 'Cleared all cache entries')
    } catch (error) {
      logger.error('CacheManager', 'Failed to clear all cache', error)
    }
  }
}

export const cacheManager = new CacheManager()
