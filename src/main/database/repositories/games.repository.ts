// ============================================================
// Games Repository — Data access for games table (sql.js)
// ============================================================

import { queryAll, queryOne, execute } from '../database'
import type { Game, GameFilter } from '@shared/types'

export class GamesRepository {
  getAllGames(): Game[] {
    const rows = queryAll<GameRow>('SELECT * FROM games ORDER BY playtime_forever DESC')
    return rows.map(mapRowToGame)
  }

  getGameByAppId(appId: number): Game | null {
    const row = queryOne<GameRow>('SELECT * FROM games WHERE app_id = ?', [appId])
    return row ? mapRowToGame(row) : null
  }

  getFilteredGames(filter: GameFilter): Game[] {
    const conditions: string[] = []
    const params: unknown[] = []

    if (filter.search) {
      conditions.push('name LIKE ?')
      params.push(`%${filter.search}%`)
    }

    if (filter.minPlaytime !== null) {
      conditions.push('playtime_forever >= ?')
      params.push(filter.minPlaytime)
    }

    if (filter.maxPlaytime !== null) {
      conditions.push('playtime_forever <= ?')
      params.push(filter.maxPlaytime)
    }

    if (filter.isPlayed === true) {
      conditions.push('playtime_forever > 0')
    } else if (filter.isPlayed === false) {
      conditions.push('playtime_forever = 0')
    }

    const sortColumn = SORT_COLUMNS[filter.sortBy] || 'playtime_forever'
    const sortOrder = filter.sortOrder === 'asc' ? 'ASC' : 'DESC'

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const query = `SELECT * FROM games ${where} ORDER BY ${sortColumn} ${sortOrder}`

    const rows = queryAll<GameRow>(query, params)
    return rows.map(mapRowToGame)
  }

  upsertGame(game: Partial<Game> & { appId: number; name: string }): void {
    // Check if game exists
    const existing = queryOne<{ app_id: number }>('SELECT app_id FROM games WHERE app_id = ?', [game.appId])

    if (existing) {
      execute(
        `UPDATE games SET
          name = ?,
          playtime_forever = COALESCE(?, playtime_forever),
          playtime_2weeks = COALESCE(?, playtime_2weeks),
          img_icon_url = COALESCE(?, img_icon_url),
          header_image = COALESCE(?, header_image),
          has_community_visible_stats = COALESCE(?, has_community_visible_stats),
          last_played_at = COALESCE(?, last_played_at),
          genres = CASE WHEN ? != '[]' THEN ? ELSE genres END,
          tags = CASE WHEN ? != '[]' THEN ? ELSE tags END,
          developers = CASE WHEN ? != '[]' THEN ? ELSE developers END,
          publishers = CASE WHEN ? != '[]' THEN ? ELSE publishers END,
          release_date = COALESCE(?, release_date),
          metacritic_score = COALESCE(?, metacritic_score),
          description = COALESCE(?, description),
          short_description = COALESCE(?, short_description),
          screenshots = CASE WHEN ? != '[]' THEN ? ELSE screenshots END,
          platforms = CASE WHEN ? != '[]' THEN ? ELSE platforms END,
          categories = CASE WHEN ? != '[]' THEN ? ELSE categories END,
          price_initial = COALESCE(?, price_initial),
          price_final = COALESCE(?, price_final),
          hltb_main = COALESCE(?, hltb_main),
          hltb_extra = COALESCE(?, hltb_extra),
          hltb_completionist = COALESCE(?, hltb_completionist),
          engine = COALESCE(?, engine),
          franchise = COALESCE(?, franchise),
          total_achievements = COALESCE(?, total_achievements),
          unlocked_achievements = COALESCE(?, unlocked_achievements),
          updated_at = ?
        WHERE app_id = ?`,
        [
          game.name,
          game.playtimeForever ?? null,
          game.playtime2Weeks ?? null,
          game.imgIconUrl ?? null,
          game.headerImage ?? null,
          game.hasCommunityVisibleStats ? 1 : null,
          game.lastPlayedAt ?? null,
          JSON.stringify(game.genres ?? []), JSON.stringify(game.genres ?? []),
          JSON.stringify(game.tags ?? []), JSON.stringify(game.tags ?? []),
          JSON.stringify(game.developers ?? []), JSON.stringify(game.developers ?? []),
          JSON.stringify(game.publishers ?? []), JSON.stringify(game.publishers ?? []),
          game.releaseDate ?? null,
          game.metacriticScore ?? null,
          game.description ?? null,
          game.shortDescription ?? null,
          JSON.stringify(game.screenshots ?? []), JSON.stringify(game.screenshots ?? []),
          JSON.stringify(game.platforms ?? []), JSON.stringify(game.platforms ?? []),
          JSON.stringify(game.categories ?? []), JSON.stringify(game.categories ?? []),
          game.priceInitial ?? null,
          game.priceFinal ?? null,
          game.hltbMain ?? null,
          game.hltbExtra ?? null,
          game.hltbCompletionist ?? null,
          game.engine ?? null,
          game.franchise ?? null,
          game.totalAchievements ?? null,
          game.unlockedAchievements ?? null,
          Date.now(),
          game.appId
        ]
      )
    } else {
      execute(
        `INSERT INTO games (
          app_id, name, playtime_forever, playtime_2weeks, img_icon_url, header_image,
          has_community_visible_stats, last_played_at, added_at, genres, tags,
          developers, publishers, release_date, metacritic_score, description,
          short_description, screenshots, platforms, categories, price_initial,
          price_final, hltb_main, hltb_extra, hltb_completionist, engine,
          franchise, total_achievements, unlocked_achievements, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          game.appId,
          game.name,
          game.playtimeForever ?? 0,
          game.playtime2Weeks ?? 0,
          game.imgIconUrl ?? null,
          game.headerImage ?? null,
          game.hasCommunityVisibleStats ? 1 : 0,
          game.lastPlayedAt ?? null,
          game.addedAt ?? Date.now(),
          JSON.stringify(game.genres ?? []),
          JSON.stringify(game.tags ?? []),
          JSON.stringify(game.developers ?? []),
          JSON.stringify(game.publishers ?? []),
          game.releaseDate ?? null,
          game.metacriticScore ?? null,
          game.description ?? null,
          game.shortDescription ?? null,
          JSON.stringify(game.screenshots ?? []),
          JSON.stringify(game.platforms ?? []),
          JSON.stringify(game.categories ?? []),
          game.priceInitial ?? null,
          game.priceFinal ?? null,
          game.hltbMain ?? null,
          game.hltbExtra ?? null,
          game.hltbCompletionist ?? null,
          game.engine ?? null,
          game.franchise ?? null,
          game.totalAchievements ?? 0,
          game.unlockedAchievements ?? 0,
          Date.now()
        ]
      )
    }
  }

  upsertGames(games: Array<Partial<Game> & { appId: number; name: string }>): void {
    for (const game of games) {
      this.upsertGame(game)
    }
  }

  getGameCount(): number {
    const result = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM games')
    return result?.count ?? 0
  }

  getPlayedGameCount(): number {
    const result = queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM games WHERE playtime_forever > 0'
    )
    return result?.count ?? 0
  }

  getTotalPlaytime(): number {
    const result = queryOne<{ total: number }>(
      'SELECT COALESCE(SUM(playtime_forever), 0) as total FROM games'
    )
    return result?.total ?? 0
  }

  getAchievementStats(): { total: number, unlocked: number, completionRate: number } {
    const result = queryOne<{ total: number, unlocked: number }>(
      'SELECT SUM(total_achievements) as total, SUM(unlocked_achievements) as unlocked FROM games WHERE total_achievements > 0'
    )
    
    const total = result?.total ?? 0
    const unlocked = result?.unlocked ?? 0
    
    let completionRate = 0
    if (total > 0) {
      completionRate = Math.round((unlocked / total) * 100)
    }
    
    return { total, unlocked, completionRate }
  }

  resetAllAchievements(): void {
    execute('UPDATE games SET total_achievements = 0, unlocked_achievements = 0')
  }

  getTopGames(limit: number = 10): Game[] {
    const rows = queryAll<GameRow>(
      'SELECT * FROM games ORDER BY playtime_forever DESC LIMIT ?',
      [limit]
    )
    return rows.map(mapRowToGame)
  }

  getRecentGames(limit: number = 10): Game[] {
    const rows = queryAll<GameRow>(
      'SELECT * FROM games WHERE last_played_at IS NOT NULL ORDER BY last_played_at DESC LIMIT ?',
      [limit]
    )
    return rows.map(mapRowToGame)
  }
}

// ============================================================
// Internal types and mappers
// ============================================================

interface GameRow {
  app_id: number
  name: string
  playtime_forever: number
  playtime_2weeks: number
  img_icon_url: string | null
  header_image: string | null
  has_community_visible_stats: number
  last_played_at: number | null
  added_at: number | null
  genres: string
  tags: string
  developers: string
  publishers: string
  release_date: string | null
  metacritic_score: number | null
  description: string | null
  short_description: string | null
  screenshots: string
  platforms: string
  categories: string
  price_initial: number | null
  price_final: number | null
  hltb_main: number | null
  hltb_extra: number | null
  hltb_completionist: number | null
  engine: string | null
  franchise: string | null
  total_achievements: number
  unlocked_achievements: number
  updated_at: number | null
}

const SORT_COLUMNS: Record<string, string> = {
  name: 'name',
  playtime: 'playtime_forever',
  lastPlayed: 'last_played_at',
  metacritic: 'metacritic_score',
  releaseDate: 'release_date'
}

function mapRowToGame(row: GameRow): Game {
  return {
    appId: row.app_id,
    name: row.name,
    playtimeForever: row.playtime_forever,
    playtime2Weeks: row.playtime_2weeks,
    imgIconUrl: row.img_icon_url ?? '',
    headerImage: row.header_image,
    hasCommunityVisibleStats: row.has_community_visible_stats === 1,
    lastPlayedAt: row.last_played_at,
    addedAt: row.added_at,
    genres: safeParseJson(row.genres),
    tags: safeParseJson(row.tags),
    developers: safeParseJson(row.developers),
    publishers: safeParseJson(row.publishers),
    releaseDate: row.release_date,
    metacriticScore: row.metacritic_score,
    description: row.description,
    shortDescription: row.short_description,
    screenshots: safeParseJson(row.screenshots),
    platforms: safeParseJson(row.platforms),
    categories: safeParseJson(row.categories),
    priceInitial: row.price_initial,
    priceFinal: row.price_final,
    hltbMain: row.hltb_main,
    hltbExtra: row.hltb_extra,
    hltbCompletionist: row.hltb_completionist,
    engine: row.engine,
    franchise: row.franchise,
    totalAchievements: row.total_achievements,
    unlockedAchievements: row.unlocked_achievements,
    updatedAt: row.updated_at
  }
}

function safeParseJson(value: string | null): string[] {
  if (!value) return []
  try {
    return JSON.parse(value)
  } catch {
    return []
  }
}

export const gamesRepository = new GamesRepository()
