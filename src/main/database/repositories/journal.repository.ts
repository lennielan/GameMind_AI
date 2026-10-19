import { queryAll, queryOne, execute } from '../database'
import crypto from 'crypto'

export class JournalRepository {
  hasAnyActivity(startTs: number, endTs: number): boolean {
    const played = queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM games
       WHERE last_played_at >= ? AND last_played_at < ? AND playtime_forever > 0`,
      [startTs, endTs]
    )
    if (played && played.count > 0) return true

    const achievements = queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM achievements WHERE unlock_time >= ? AND unlock_time < ?`,
      [startTs, endTs]
    )
    if (achievements && achievements.count > 0) return true

    return false
  }

  getEarliestSnapshotTimestamp(): number {
    const earliestSnapshot = queryOne<{ min_ts: number }>(
      `SELECT MIN(timestamp) as min_ts FROM playtime_snapshots WHERE timestamp > 0`
    )
    return earliestSnapshot?.min_ts || Number.MAX_SAFE_INTEGER
  }

  getGamesPlayed(startTs: number, endTs: number): any[] {
    // Return all games with playtime so the engine can accurately calculate their delta.
    // Relying solely on last_played_at misses games played across multiple months.
    return queryAll<any>(
      `SELECT app_id, name, playtime_forever, playtime_2weeks, added_at, last_played_at, genres
       FROM games
       WHERE playtime_forever > 0`
    )
  }

  getAchievementsCount(startTs: number, endTs: number): number {
    const achCount = queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM achievements WHERE unlock_time >= ? AND unlock_time < ?`,
      [startTs, endTs]
    )
    return achCount?.count || 0
  }

  getRarestAchievement(startTs: number, endTs: number): any | null {
    return queryOne<any>(
      `SELECT a.*, g.name as game_name
       FROM achievements a
       LEFT JOIN games g ON a.app_id = g.app_id
       WHERE a.unlock_time >= ? AND a.unlock_time < ? AND a.achieved = 1
       ORDER BY CAST(COALESCE(a.global_percent, '100') AS REAL) ASC
       LIMIT 1`,
      [startTs, endTs]
    )
  }

  getLatestSnapshotBefore(appId: number, startTs: number): number | null {
    const prevPlay = queryOne<{ timestamp: number }>(
      `SELECT timestamp FROM playtime_snapshots
       WHERE app_id = ? AND timestamp < ? AND timestamp > 0
       ORDER BY timestamp DESC LIMIT 1`,
      [appId, startTs]
    )
    return prevPlay?.timestamp || null
  }

  getSnapshotsForPeriod(startTs: number, endTs: number): any[] {
    return queryAll<{ timestamp: number; app_id: number; playtime_forever: number }>(
      `SELECT timestamp, app_id, playtime_forever FROM playtime_snapshots
       WHERE timestamp >= ? AND timestamp < ?
       ORDER BY timestamp ASC`,
      [startTs, endTs]
    )
  }

  getCurrentDnaTraits(): { trait_name: string; trait_value: number }[] {
    return queryAll<{ trait_name: string; trait_value: number }>(
      `SELECT trait_name, trait_value FROM player_dna ORDER BY id ASC`
    )
  }

  getDnaSnapshotForMonth(month: string): string | null {
    const row = queryOne<{ traits_json: string }>(
      `SELECT traits_json FROM player_dna_snapshots WHERE month = ?`, [month]
    )
    return row?.traits_json || null
  }

  saveDnaSnapshot(month: string, traitsJson: string): void {
    const existing = queryOne<{ id: string }>(
      `SELECT id FROM player_dna_snapshots WHERE month = ?`, [month]
    )
    if (existing) return
    execute(
      `INSERT INTO player_dna_snapshots (id, month, traits_json, created_at) VALUES (?, ?, ?, ?)`,
      [crypto.randomUUID(), month, traitsJson, Date.now()]
    )
  }

  getJournal(monthYYYYMM: string): any | null {
    return queryOne<any>(
      `SELECT * FROM game_journals WHERE month = ?`,
      [monthYYYYMM]
    )
  }

  getAllJournals(): any[] {
    return queryAll<any>(
      `SELECT * FROM game_journals ORDER BY month DESC`
    )
  }

  saveReport(id: string, month: string, statsJson: string, narrativeJson: string, reportJson: string): void {
    execute(
      `INSERT OR REPLACE INTO game_journals (id, month, stats_json, narrative_json, report_json, version, is_viewed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, month, statsJson, narrativeJson, reportJson, 2, 0, Date.now()]
    )
  }

  markViewed(month: string): void {
    execute(`UPDATE game_journals SET is_viewed = 1 WHERE month = ?`, [month])
  }

  hasUnviewedJournals(): boolean {
    const row = queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM game_journals WHERE is_viewed = 0 AND version = 2`
    )
    return (row?.count || 0) > 0
  }

  getMetaValue(key: string): string | null {
    const row = queryOne<{ value: string }>(
      `SELECT value FROM journal_meta WHERE key = ?`, [key]
    )
    return row?.value || null
  }

  setMetaValue(key: string, value: string): void {
    execute(
      `INSERT OR REPLACE INTO journal_meta (key, value) VALUES (?, ?)`,
      [key, value]
    )
  }

  getPlaytimeSnapshot(appId: number, maxTimestamp: number): number | null {
    const snapshot = queryOne<{ playtime_forever: number }>(
      'SELECT playtime_forever FROM playtime_snapshots WHERE app_id = ? AND timestamp <= ? ORDER BY timestamp DESC LIMIT 1',
      [appId, maxTimestamp]
    )
    return snapshot?.playtime_forever || null
  }

  getEarliestPlaytimeSnapshot(appId: number, startTs: number, endTs: number): number | null {
    const earliest = queryOne<{ playtime_forever: number }>(
      'SELECT playtime_forever FROM playtime_snapshots WHERE app_id = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC LIMIT 1',
      [appId, startTs, endTs]
    )
    return earliest?.playtime_forever || null
  }

  getUserCount(): number {
    const countRow = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM user_profile')
    return countRow?.count || 0
  }

  getCurrentGameMindScore(): number {
    const row = queryOne<{ gamemind_score: number }>(
      `SELECT gamemind_score FROM user_profile LIMIT 1`
    )
    return row?.gamemind_score || 0
  }
}
