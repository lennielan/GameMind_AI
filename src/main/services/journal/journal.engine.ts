import { journalRepository } from '../../database/repository.factory'
import crypto from 'crypto'
import { logger } from '../../logger/logger'

// ============================================================
// Types
// ============================================================

export interface TopGame {
  name: string
  hours: number
  percentOfTotal: number
  appId: number
}

export interface GenreDistribution {
  genre: string
  percent: number
}

export interface DnaSnapshot {
  axis: string
  value: number
}

export interface ReportHighlight {
  type: 'rarest_achievement' | 'longest_session' | 'comeback_game' | 'quickest_drop' | 'longest_streak' | 'most_hours_day'
  title: string
  value: string
  details?: string
}

export interface MonthlyReport {
  title: string
  stats: {
    hoursPlayed: number
    gamesPlayed: number
    achievementsUnlocked: number
    newGamesAdded: number
    gamemindScoreDelta: number | null
  }
  summary: string
  topGames: TopGame[]
  dnaCurrent: DnaSnapshot[] | null
  dnaPrevious: DnaSnapshot[] | null
  dnaChanged: boolean
  genresCurrent: GenreDistribution[]
  genresPrevious: GenreDistribution[] | null
  highlights: ReportHighlight[]
  isLowActivity: boolean
  lowActivityMessage?: string
  language: string
}

export interface GameJournal {
  id: string
  month: string
  stats_json: string
  narrative_json: string
  report_json: string | null
  version: number
  is_viewed: number
  created_at: number
}

// Legacy compat
export interface JournalStats {
  month: string
  gamesPlayedCount: number
  totalHours: number
  newGamesCount: number
  achievementsUnlocked: number
  topGenres: string[]
  topGames: { name: string; hours: number }[]
}

// ============================================================
// Engine
// ============================================================

export class JournalEngine {
  public hasAnyActivity(monthYYYYMM: string): boolean {
    const { startTs, endTs } = this.getMonthBounds(monthYYYYMM)
    return journalRepository.hasAnyActivity(startTs, endTs)
  }

  public getPendingMonths(): string[] {
    const now = new Date()
    const currentYear = now.getUTCFullYear()
    const currentMonth = now.getUTCMonth() 

    let earliestTs = journalRepository.getEarliestSnapshotTimestamp()

    if (earliestTs === Number.MAX_SAFE_INTEGER) return []

    const earliestDate = new Date(earliestTs * 1000)
    let checkYear = earliestDate.getUTCFullYear()
    let checkMonth = earliestDate.getUTCMonth() 

    const pending: string[] = []

    while (checkYear < currentYear || (checkYear === currentYear && checkMonth < currentMonth)) {
      const monthStr = `${checkYear}-${String(checkMonth + 1).padStart(2, '0')}`

      const existing = this.getJournal(monthStr)
      if (!existing) {
        if (this.hasAnyActivity(monthStr)) {
          pending.push(monthStr)
        }
      }

      checkMonth++
      if (checkMonth >= 12) {
        checkMonth = 0
        checkYear++
      }
    }

    return pending
  }

  public generateReportData(monthYYYYMM: string, language: string): MonthlyReport {
    const { startTs, endTs } = this.getMonthBounds(monthYYYYMM)

    const gamesPlayed = journalRepository.getGamesPlayed(startTs, endTs)

    let totalMinutes = 0
    let newGamesCount = 0
    const genreCounts: Record<string, number> = {}
    const gameList: TopGame[] = []

    gamesPlayed.forEach(g => {
      const deltaMinutes = this.calculatePlaytimeDelta(g, startTs, endTs)

      if ((g.added_at / 1000) >= startTs && (g.added_at / 1000) < endTs) {
        newGamesCount++
      }

      if (deltaMinutes > 0) {
        totalMinutes += deltaMinutes
        const hours = Math.max(1, Math.round(deltaMinutes / 60))
        gameList.push({ name: g.name, hours, percentOfTotal: 0, appId: g.app_id })

        try {
          const parsed = JSON.parse(g.genres || '[]')
          parsed.forEach((gen: any) => {
            const desc = typeof gen === 'string' ? gen : (gen.description || gen)
            if (desc) genreCounts[desc] = (genreCounts[desc] || 0) + deltaMinutes
          })
        } catch (e) { /* ignore */ }
      }
    })

    // Fix for fresh installs / initial syncs:
    // If almost all games in the library were "added" this month, it's a fresh install sync, not a shopping spree.
    if (newGamesCount > 0 && newGamesCount >= gamesPlayed.length * 0.9 && gamesPlayed.length > 3) {
      newGamesCount = 0
    }

    const totalHours = totalMinutes > 0 ? Math.max(1, Math.round(totalMinutes / 60)) : 0
    gameList.sort((a, b) => b.hours - a.hours)
    gameList.forEach(g => {
      g.percentOfTotal = totalHours > 0 ? Math.round((g.hours / totalHours) * 100) : 0
    })

    const achCount = journalRepository.getAchievementsCount(startTs, endTs)

    const totalGenreMinutes = Object.values(genreCounts).reduce((s, v) => s + v, 0)
    const genresCurrent: GenreDistribution[] = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([genre, minutes]) => ({
        genre,
        percent: totalGenreMinutes > 0 ? Math.round((minutes / totalGenreMinutes) * 100) : 0
      }))

    const prevMonth = this.getPreviousMonth(monthYYYYMM)
    const prevJournal = this.getJournal(prevMonth)
    let genresPrevious: GenreDistribution[] | null = null
    if (prevJournal?.report_json) {
      try {
        const prevReport = JSON.parse(prevJournal.report_json) as MonthlyReport
        genresPrevious = prevReport.genresCurrent
      } catch (e) { /* ignore */ }
    }

    const dnaCurrent = this.getCurrentDnaSnapshot()
    const dnaPrevious = this.getDnaSnapshotForMonth(prevMonth)
    const dnaChanged = this.hasDnaChanged(dnaCurrent, dnaPrevious)

    if (dnaCurrent) {
      this.saveDnaSnapshot(monthYYYYMM, dnaCurrent)
    }

    let gamemindScoreDelta: number | null = null
    if (prevJournal?.report_json) {
      try {
        const prevReport = JSON.parse(prevJournal.report_json) as MonthlyReport
        if (prevReport.stats && typeof prevReport.stats.hoursPlayed === 'number') {
        }
      } catch (e) { /* ignore */ }
    }
    const currentScore = this.getCurrentGameMindScore()
    const savedPrevScore = this.getMetaValue('last_journal_score')
    if (savedPrevScore !== null) {
      gamemindScoreDelta = currentScore - parseFloat(savedPrevScore)
    }
    this.setMetaValue('last_journal_score', String(currentScore))

    const highlights = this.calculateHighlights(startTs, endTs, gameList, language)

    const isLowActivity = totalHours < 1 || (gameList.length === 1 && totalHours < 2)

    return {
      title: '', 
      stats: {
        hoursPlayed: totalHours,
        gamesPlayed: gameList.length,
        achievementsUnlocked: achCount,
        newGamesAdded: newGamesCount,
        gamemindScoreDelta
      },
      summary: '', 
      topGames: gameList.slice(0, 10),
      dnaCurrent,
      dnaPrevious,
      dnaChanged,
      genresCurrent,
      genresPrevious,
      highlights,
      isLowActivity,
      language
    }
  }

  // ============================================================
  // Highlights calculation
  // ============================================================

  private calculateHighlights(
    startTs: number, endTs: number,
    topGames: TopGame[], language: string
  ): ReportHighlight[] {
    const highlights: ReportHighlight[] = []
    const isRu = language === 'ru'

    const rarestAch = journalRepository.getRarestAchievement(startTs, endTs)
    if (rarestAch) {
      const rarity = rarestAch.global_percent ? `${parseFloat(rarestAch.global_percent).toFixed(1)}%` : ''
      highlights.push({
        type: 'rarest_achievement',
        title: rarestAch.display_name || rarestAch.api_name,
        value: rarestAch.game_name || '',
        details: rarity ? (isRu ? `Редкость: ${rarity} игроков` : `Rarity: ${rarity} of players`) : undefined
      })
    }

    const comebackThreshold = startTs - (60 * 24 * 3600)
    for (const game of topGames) {
      const prevPlayTs = journalRepository.getLatestSnapshotBefore(game.appId, startTs)
      if (prevPlayTs && prevPlayTs < comebackThreshold) {
        const daysSince = Math.floor((startTs - prevPlayTs) / 86400)
        highlights.push({
          type: 'comeback_game',
          title: game.name,
          value: isRu ? `${daysSince} дней без игры` : `${daysSince} days since last played`,
        })
        break 
      }
    }

    const dailySnapshots = journalRepository.getSnapshotsForPeriod(startTs, endTs)
    if (dailySnapshots.length >= 2) {
      const dayMap: Record<string, number> = {}
      for (let i = 1; i < dailySnapshots.length; i++) {
        const prev = dailySnapshots[i - 1]
        const curr = dailySnapshots[i]
        if (curr.app_id === prev.app_id && curr.playtime_forever > prev.playtime_forever) {
          const dayKey = new Date(curr.timestamp * 1000).toISOString().split('T')[0]
          const delta = curr.playtime_forever - prev.playtime_forever
          dayMap[dayKey] = (dayMap[dayKey] || 0) + delta
        }
      }
      const sortedDays = Object.entries(dayMap).sort((a, b) => b[1] - a[1])
      const maxDay = sortedDays[0]
      if (maxDay && maxDay[1] >= 120) { 
        const hrs = Math.round(maxDay[1] / 60)
        highlights.push({
          type: 'most_hours_day',
          title: maxDay[0],
          value: isRu ? `${hrs} ч за день` : `${hrs}h in one day`
        })
      }
    }

    return highlights
  }

  // ============================================================
  // Player DNA snapshot helpers
  // ============================================================

  private getCurrentDnaSnapshot(): DnaSnapshot[] | null {
    const traits = journalRepository.getCurrentDnaTraits()
    if (!traits || traits.length === 0) return null
    return traits.map(t => ({ axis: t.trait_name, value: t.trait_value }))
  }

  private getDnaSnapshotForMonth(month: string): DnaSnapshot[] | null {
    const traitsJson = journalRepository.getDnaSnapshotForMonth(month)
    if (!traitsJson) return null
    try { return JSON.parse(traitsJson) } catch { return null }
  }

  private saveDnaSnapshot(month: string, traits: DnaSnapshot[]): void {
    journalRepository.saveDnaSnapshot(month, JSON.stringify(traits))
  }

  private hasDnaChanged(current: DnaSnapshot[] | null, previous: DnaSnapshot[] | null): boolean {
    if (!current || !previous) return false
    if (current.length !== previous.length) return true
    for (let i = 0; i < current.length; i++) {
      if (Math.abs(current[i].value - previous[i].value) >= 3) return true
    }
    return false
  }

  // ============================================================
  // GameMind Score helper
  // ============================================================

  private getCurrentGameMindScore(): number {
    return journalRepository.getCurrentGameMindScore()
  }

  // ============================================================
  // Journal CRUD
  // ============================================================

  public getJournal(monthYYYYMM: string): GameJournal | null {
    return journalRepository.getJournal(monthYYYYMM)
  }

  public getAllJournals(): GameJournal[] {
    return journalRepository.getAllJournals()
  }

  public saveReport(month: string, report: MonthlyReport): GameJournal {
    const existing = this.getJournal(month)
    if (existing && existing.version === 2) {
      return existing
    }

    const id = existing ? existing.id : crypto.randomUUID()
    const now = Date.now()
    const reportJson = JSON.stringify(report)
    const statsJson = JSON.stringify({
      month, gamesPlayedCount: report.stats.gamesPlayed,
      totalHours: report.stats.hoursPlayed, newGamesCount: report.stats.newGamesAdded,
      achievementsUnlocked: report.stats.achievementsUnlocked,
      topGenres: report.genresCurrent.map(g => g.genre),
      topGames: report.topGames.map(g => ({ name: g.name, hours: g.hours }))
    })
    const narrativeJson = JSON.stringify({ title: report.title, summary: report.summary, highlights: [] })

    journalRepository.saveReport(id, month, statsJson, narrativeJson, reportJson)

    return {
      id, month, stats_json: statsJson, narrative_json: narrativeJson,
      report_json: reportJson, version: 2, is_viewed: 0, created_at: now
    }
  }

  public markViewed(month: string): void {
    journalRepository.markViewed(month)
  }

  public hasUnviewedJournals(): boolean {
    return journalRepository.hasUnviewedJournals()
  }

  // ============================================================
  // Meta helpers
  // ============================================================

  public getMetaValue(key: string): string | null {
    return journalRepository.getMetaValue(key)
  }

  public setMetaValue(key: string, value: string): void {
    journalRepository.setMetaValue(key, value)
  }

  // ============================================================
  // Utility
  // ============================================================

  private getMonthBounds(monthYYYYMM: string): { startTs: number; endTs: number } {
    const [yearStr, monthStr] = monthYYYYMM.split('-')
    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)
    const startDate = new Date(Date.UTC(year, month - 1, 1))
    const endDate = new Date(Date.UTC(year, month, 1))
    return {
      startTs: Math.floor(startDate.getTime() / 1000),
      endTs: Math.floor(endDate.getTime() / 1000)
    }
  }

  private getPreviousMonth(monthYYYYMM: string): string {
    const [yearStr, monthStr] = monthYYYYMM.split('-')
    let year = parseInt(yearStr, 10)
    let month = parseInt(monthStr, 10) - 1 
    month--
    if (month < 0) { month = 11; year-- }
    return `${year}-${String(month + 1).padStart(2, '0')}`
  }

  private calculatePlaytimeDelta(game: any, startTs: number, endTs: number): number {
    let pStart: number | null | undefined = journalRepository.getPlaytimeSnapshot(game.app_id, startTs - 1)
    let pEnd = journalRepository.getPlaytimeSnapshot(game.app_id, endTs) ?? game.playtime_forever

    const missingBaseline = pStart === null || pStart === undefined

    if (missingBaseline) {
      const earliestInMonth = journalRepository.getEarliestPlaytimeSnapshot(game.app_id, startTs, endTs)
      pStart = earliestInMonth !== null ? earliestInMonth : pEnd
    }

    let deltaMinutes = Math.max(0, pEnd - (pStart as number))

    // Smart fallback for fresh installs or wiped databases:
    // If we have no baseline snapshots for the start of the month, our delta calculation is 0.
    // However, Steam provides `playtime_2weeks`. If this month covers the last 2 weeks, we can 
    // use it as a reliable fallback so the user doesn't get an empty journal.
    if (missingBaseline && game.playtime_2weeks > 0) {
      const nowTs = Date.now() / 1000
      // If the report's end date is within the last 14 days, playtime_2weeks is applicable
      if (endTs >= nowTs - (14 * 86400)) {
        deltaMinutes = Math.max(deltaMinutes, game.playtime_2weeks)
      }
    }

    return deltaMinutes
  }
}

export const journalEngine = new JournalEngine()
