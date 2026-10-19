// ============================================================
// Steam Data Processor — Heuristics, Sanitization & Clustering
// ============================================================

import { queryAll } from '../../database/database'
import type { TimelineEntry } from '@shared/types'
import { randomUUID } from 'crypto'

export interface ProcessedSteamData {
  epochs: TimelineEntry[]
  definingGames: TimelineEntry[]
  microEvents: TimelineEntry[]
  legacy: TimelineEntry
  allEntries: TimelineEntry[]
}

const MODE_TAGS = new Set([
  'singleplayer', 'single-player', 'multiplayer', 'multi-player', 
  'co-op', 'coop', 'online co-op', 'local co-op', 'pvp', 'online pvp', 
  'local pvp', 'split screen', 'shared/split screen', 'cross-platform multiplayer',
  'mmo', 'massively multiplayer'
])

const GENRE_WHITELIST = new Set([
  'rpg', 'action', 'adventure', 'strategy', 'simulation', 'sports', 'racing', 'casual', 'indie', 
  'fps', 'shooter', 'platformer', 'puzzle', 'fighting', 'survival', 'horror', 'stealth', 
  'roguelike', 'roguelite', 'metroidvania', 'rts', 'turn-based', '4x', 'visual novel', 
  'sandbox', 'open world', 'point & click', 'city builder', 'tower defense', 'hack and slash', 
  'beat em up', 'party', 'rhythm', 'dating sim', 'farming sim', 'grand strategy', 'card game', 
  'board game', 'deckbuilder', 'looter shooter', 'crpg', 'arpg', 'jrpg', 'tactical rpg', 
  'soulslike', 'battle royale', 'moba', 'auto battler', 'hero shooter', 'tactical shooter'
])

const APP_ALIASES: Record<number, number> = {
  1281930: 105600, // tModLoader -> Terraria
  233780: 107410, // Arma 3 Server -> Arma 3
}

export class SteamDataProcessor {
  
  /**
   * Sanitizes tags into True Genres and Game Modes using a strict whitelist
   */
  public sanitizeTags(genresJson: string | null, tagsJson: string | null): {
    trueGenres: string[]
    modes: string[]
  } {
    const rawList: string[] = []

    const parseJsonArray = (jsonStr: string | null) => {
      if (!jsonStr) return
      try {
        const parsed = JSON.parse(jsonStr)
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            const name = typeof item === 'string' ? item : item?.description || item?.name
            if (name && typeof name === 'string') {
              rawList.push(name.trim())
            }
          }
        }
      } catch { /* ignore malformed JSON */ }
    }

    parseJsonArray(genresJson)
    parseJsonArray(tagsJson)

    const trueGenres: string[] = []
    const modes: string[] = []
    const seenGenres = new Set<string>()
    const seenModes = new Set<string>()

    for (const tag of rawList) {
      const lower = tag.toLowerCase()

      if (MODE_TAGS.has(lower)) {
        if (!seenModes.has(lower)) {
          seenModes.add(lower)
          modes.push(tag)
        }
        continue
      }

      if (GENRE_WHITELIST.has(lower) && !seenGenres.has(lower)) {
        seenGenres.add(lower)
        trueGenres.push(tag)
      }
    }

    return { trueGenres, modes }
  }

  /**
   * Extracts raw timeline events prior to LLM narrative enhancement
   */
  public extractRawTimelineData(): ProcessedSteamData {
    const rawGames = queryAll<any>(`
      SELECT app_id, name, header_image, playtime_forever, added_at, last_played_at, 
             genres, tags, developers, total_achievements, unlocked_achievements 
      FROM games 
      WHERE playtime_forever > 0 OR last_played_at IS NOT NULL OR added_at IS NOT NULL
      ORDER BY COALESCE(added_at, last_played_at) ASC
    `)

    if (rawGames.length === 0) {
      return {
        epochs: [],
        definingGames: [],
        microEvents: [],
        legacy: this.createEmptyLegacy(),
        allEntries: []
      }
    }

    const getMs = (ts: number | null) => {
      if (!ts) return 0
      return ts > 10000000000 ? ts : ts * 1000
    }

    // Deduplicate / Merge Aliases and filter out Dedicated Servers / SDKs
    const mergedGames = new Map<number, any>()
    for (const g of rawGames) {
      const lowerName = g.name.toLowerCase()
      // Skip pure tools unless aliased to a parent game
      const isTool = lowerName.includes('dedicated server') || lowerName.includes('test server') || lowerName.includes('sdk base')
      
      const parentId = APP_ALIASES[g.app_id] || g.app_id
      
      if (isTool && parentId === g.app_id) {
        continue // Skip unaliased servers/SDKs
      }

      const existing = mergedGames.get(parentId)
      if (existing) {
        existing.playtime_forever += (g.playtime_forever || 0)
        existing.unlocked_achievements = Math.max(existing.unlocked_achievements || 0, g.unlocked_achievements || 0)
        if (g.added_at && (!existing.added_at || g.added_at < existing.added_at)) {
          existing.added_at = g.added_at
        }
        if (g.last_played_at && (!existing.last_played_at || g.last_played_at > existing.last_played_at)) {
          existing.last_played_at = g.last_played_at
        }
        // If this record IS the base game, prioritize its metadata over the mod
        if (g.app_id === parentId) {
          existing.name = g.name
          existing.header_image = g.header_image
          existing.genres = g.genres
          existing.tags = g.tags
        }
      } else {
        mergedGames.set(parentId, { ...g, app_id: parentId })
      }
    }

    const dedupedGames = Array.from(mergedGames.values()).sort((a, b) => {
      const msA = getMs(a.added_at || a.last_played_at)
      const msB = getMs(b.added_at || b.last_played_at)
      return msA - msB
    })

    const totalLibraryPlaytime = dedupedGames.reduce((acc, g) => acc + (g.playtime_forever || 0), 0)

    // 1. Detect First Step into Steam (Micro-Event)
    const microEvents: TimelineEntry[] = []
    const firstAchievement = queryAll<any>(`
      SELECT a.unlock_time as first_unlock, a.app_id, a.display_name, g.name, g.header_image
      FROM achievements a
      LEFT JOIN games g ON a.app_id = g.app_id
      WHERE a.achieved = 1 AND a.unlock_time > 0
      ORDER BY a.unlock_time ASC
      LIMIT 1
    `)[0]

    let firstStepDate = 0
    let firstStepMeta: any = null

    if (firstAchievement) {
      firstStepDate = getMs(firstAchievement.first_unlock)
      firstStepMeta = { 
        appId: firstAchievement.app_id, 
        gameName: firstAchievement.name, 
        headerImage: firstAchievement.header_image,
        achievementName: firstAchievement.display_name
      }
    } else {
      const firstPlayedGame = dedupedGames
        .filter(g => g.last_played_at > 0)
        .sort((a, b) => a.last_played_at - b.last_played_at)[0]
      if (firstPlayedGame) {
        firstStepDate = getMs(firstPlayedGame.last_played_at)
        firstStepMeta = { 
          appId: firstPlayedGame.app_id, 
          gameName: firstPlayedGame.name, 
          headerImage: firstPlayedGame.header_image 
        }
      }
    }

    if (firstStepDate > 0 && firstStepMeta) {
      microEvents.push({
        id: randomUUID(),
        type: 'milestone',
        date: firstStepDate,
        title: 'First Step into Steam',
        facts: { gamesCount: 1 },
        metadata: firstStepMeta
      })
    }

    // 2. Detect Ultra-Rare Achievements (Micro-Events)
    const rareAchievements = queryAll<any>(`
      SELECT a.app_id, a.display_name, a.icon, a.unlock_time, a.global_percent, g.name as game_name, g.header_image
      FROM achievements a
      LEFT JOIN games g ON a.app_id = g.app_id
      WHERE a.achieved = 1 AND a.global_percent IS NOT NULL AND a.global_percent > 0 AND a.global_percent < 5.0
      ORDER BY a.global_percent ASC
      LIMIT 2
    `)

    for (const rare of rareAchievements) {
      if (rare.unlock_time) {
        microEvents.push({
          id: randomUUID(),
          type: 'milestone',
          date: getMs(rare.unlock_time),
          title: `Rare Achievement: ${rare.display_name}`,
          facts: { globalPercent: Math.round(rare.global_percent * 10) / 10 },
          metadata: {
            appId: rare.app_id,
            gameName: rare.game_name,
            achievementName: rare.display_name,
            achievementIcon: rare.icon,
            headerImage: rare.header_image
          }
        })
      }
    }

    // Load max achievement unlock times to enhance dating accuracy (Steam API compensation)
    const unlockTimes = queryAll<any>(`
      SELECT app_id, MAX(unlock_time) as max_unlock, MIN(unlock_time) as min_unlock 
      FROM achievements 
      WHERE achieved = 1 AND unlock_time > 0
      GROUP BY app_id
    `)
    const unlockTimeMap = new Map<number, {min: number, max: number}>()
    for (const row of unlockTimes) {
      unlockTimeMap.set(row.app_id, { min: row.min_unlock, max: row.max_unlock })
    }

    // 3. Detect Defining Games (Top 4 by Playtime, >= 10 hours)
    const definingGames: TimelineEntry[] = []
    const sortedByPlaytime = [...dedupedGames].sort((a, b) => b.playtime_forever - a.playtime_forever)
    const topPlaytimeCandidates = sortedByPlaytime.slice(0, 4).filter(g => g.playtime_forever >= 600)

    for (const dg of topPlaytimeCandidates) {
      const hoursPlayed = Math.round(dg.playtime_forever / 60)
      const playtimePct = totalLibraryPlaytime > 0 
        ? Math.round((dg.playtime_forever / totalLibraryPlaytime) * 100) 
        : 0

      // Collect key achievement shards
      const defShards = queryAll<any>(`
        SELECT display_name, icon, global_percent FROM achievements
        WHERE achieved = 1 AND app_id = ? AND display_name IS NOT NULL
        ORDER BY CASE WHEN global_percent > 0 THEN global_percent ELSE 99 END ASC, RANDOM()
        LIMIT 3
      `, [dg.app_id]).map(a => ({ name: a.display_name, icon: a.icon }))

      const { trueGenres, modes } = this.sanitizeTags(dg.genres, dg.tags)
      
      const ut = unlockTimeMap.get(dg.app_id)
      const baseMs = getMs(dg.last_played_at || dg.added_at)
      const dateMs = ut ? Math.max(baseMs, getMs(ut.max)) : baseMs

      definingGames.push({
        id: randomUUID(),
        type: 'defining_game',
        date: dateMs,
        title: dg.name,
        facts: { 
          hoursPlayed, 
          achievementsEarned: dg.unlocked_achievements || 0,
          dominantGenres: trueGenres.slice(0, 3),
          globalPercent: playtimePct
        },
        metadata: {
          appId: dg.app_id,
          gameName: dg.name,
          headerImage: dg.header_image,
          shards: defShards.length > 0 ? defShards : undefined
        }
      })
    }

    // 4. Cluster History into Epochs (Seasonal/Yearly Period Clustering)
    const epochs: TimelineEntry[] = []
    const gamesByPeriod = new Map<string, { name: string, year: number, games: any[] }>()

    for (const g of dedupedGames) {
      const ut = unlockTimeMap.get(g.app_id)
      const baseMs = getMs(g.added_at || g.last_played_at)
      const ms = ut ? Math.max(baseMs, getMs(ut.max)) : baseMs
      if (ms === 0) continue
      const d = new Date(ms)
      const year = d.getFullYear()
      const month = d.getMonth()
      
      let period = 1
      let name = ''
      if (month < 6) { 
        period = 1
        name = `Early ${year}` 
      } else { 
        period = 2
        name = `Late ${year}` 
      }
      
      const key = `${year}-H${period}`
      if (!gamesByPeriod.has(key)) {
        gamesByPeriod.set(key, { name, year, games: [] })
      }
      gamesByPeriod.get(key)!.games.push(g)
    }

    const periods = Array.from(gamesByPeriod.values()).sort((a, b) => {
      const msA = getMs(a.games[0].added_at || a.games[0].last_played_at)
      const msB = getMs(b.games[0].added_at || b.games[0].last_played_at)
      return msA - msB
    })

    for (const p of periods) {
      const pGames = p.games
      if (pGames.length < 2) continue

      let pHours = 0
      let pAchievements = 0
      const genrePlaytime: Record<string, number> = {}

      for (const g of pGames) {
        pHours += g.playtime_forever
        pAchievements += (g.unlocked_achievements || 0)

        const { trueGenres } = this.sanitizeTags(g.genres, g.tags)
        for (const tag of trueGenres) {
          // Weight genres by playtime to prevent small 0-min indie tags dominating
          const weight = Math.max(1, Math.round(g.playtime_forever / 60))
          genrePlaytime[tag] = (genrePlaytime[tag] || 0) + weight
        }
      }

      const dominantGenres = Object.entries(genrePlaytime)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(g => g[0])

      const topGamesList = [...pGames]
        .sort((a, b) => b.playtime_forever - a.playtime_forever)
        .slice(0, 4)
        .map(g => ({
          name: g.name,
          appId: g.app_id,
          hours: Math.round(g.playtime_forever / 60),
          headerImage: g.header_image
        }))

      // Achievement shards in this epoch
      const eraAppIds = pGames.map(g => g.app_id)
      const placeholders = eraAppIds.map(() => '?').join(',')
      const eraShards = queryAll<any>(`
        SELECT display_name, icon FROM achievements
        WHERE achieved = 1 AND app_id IN (${placeholders}) AND display_name IS NOT NULL
        ORDER BY RANDOM() LIMIT 2
      `, eraAppIds).map(a => ({ name: a.display_name, icon: a.icon }))

      // Companion overlap analysis
      let companionName: string | undefined
      let companionAvatar: string | undefined
      try {
        const friends = queryAll<any>(`SELECT persona_name, avatar_url, common_games FROM friends`)
        let bestCount = 0
        for (const f of friends) {
          try {
            const commonGames: number[] = JSON.parse(f.common_games || '[]')
            const overlap = eraAppIds.filter(id => commonGames.includes(id)).length
            if (overlap > bestCount) {
              bestCount = overlap
              companionName = f.persona_name
              companionAvatar = f.avatar_url
            }
          } catch { /* skip */ }
        }
      } catch { /* ignore */ }

      epochs.push({
        id: randomUUID(),
        type: 'era_summary',
        date: getMs(pGames[pGames.length - 1].added_at || pGames[pGames.length - 1].last_played_at),
        title: `The ${dominantGenres[0] || 'Gaming'} Era`,
        facts: {
          gamesCount: pGames.length,
          hoursPlayed: Math.round(pHours / 60),
          achievementsEarned: pAchievements,
          dominantGenres
        },
        metadata: {
          eraName: p.name,
          games: topGamesList,
          shards: eraShards.length > 0 ? eraShards : undefined,
          companionName,
          companionAvatar
        }
      })
    }

    // 5. Gaming Legacy Anchor
    const legacy = this.createEmptyLegacy()

    // Combine without legacy first
    const events = [...epochs, ...definingGames, ...microEvents]

    const seenTimes = new Set<number>()
    for (const e of events) {
      while (seenTimes.has(e.date)) {
        e.date += 1000 
      }
      seenTimes.add(e.date)
    }
    // Strict chronological sort (ASC: past -> future)
    events.sort((a, b) => a.date - b.date)

    // Legacy must always be the final object (Epilogue)
    const allEntries = [...events, legacy]

    return {
      epochs,
      definingGames,
      microEvents,
      legacy,
      allEntries
    }
  }

  private createEmptyLegacy(): TimelineEntry {
    return {
      id: 'legacy-conclusion-fixed-id',
      type: 'legacy_conclusion',
      date: Date.now() + 50000,
      title: 'Your Gaming Legacy',
      metadata: {}
    }
  }
}

export const steamDataProcessor = new SteamDataProcessor()
