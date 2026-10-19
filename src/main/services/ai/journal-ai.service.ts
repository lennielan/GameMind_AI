import { aiClient } from './ai.client'
import { logger } from '../../logger/logger'
import { GameJournal, MonthlyReport, journalEngine } from '../journal/journal.engine'
import { configManager } from '../../config/config-manager'

export class JournalAiService {
  /**
   * Generate a monthly journal report. Never regenerates an existing v2 journal.
   */
  async generateMonthlyJournal(monthYYYYMM: string): Promise<GameJournal> {
    // Never overwrite existing v2 journal
    const existing = journalEngine.getJournal(monthYYYYMM)
    if (existing && existing.version === 2) {
      return existing
    }

    logger.info('JournalAiService', `Generating v2 journal for ${monthYYYYMM}`)

    const language = (configManager.get('language') as string) || 'en'
    const report = journalEngine.generateReportData(monthYYYYMM, language)

    // If no games played at all, don't create journal (handled by getPendingMonths)
    if (report.stats.gamesPlayed === 0 && report.stats.achievementsUnlocked === 0) {
      // Return a minimal empty record (shouldn't normally reach here)
      report.title = language === 'ru' ? 'Спокойный месяц' : 'A Quiet Month'
      report.summary = language === 'ru'
        ? 'В этом месяце игровой активности не было.'
        : 'No gaming activity this month.'
      return journalEngine.saveReport(monthYYYYMM, report)
    }

    // Low activity — use templates, no AI call
    if (report.isLowActivity) {
      report.title = this.getLowActivityTitle(report, language)
      report.summary = this.getLowActivitySummary(report, language)
      return journalEngine.saveReport(monthYYYYMM, report)
    }

    // Normal activity — use AI for title + summary
    const aiResult = await this.generateTitleAndSummary(report, language)
    report.title = aiResult.title
    report.summary = aiResult.summary

    return journalEngine.saveReport(monthYYYYMM, report)
  }

  /**
   * Generate pending journals for all missing months.
   */
  async generatePendingJournals(): Promise<GameJournal[]> {
    const pending = journalEngine.getPendingMonths()
    const results: GameJournal[] = []

    for (const month of pending) {
      try {
        const journal = await this.generateMonthlyJournal(month)
        results.push(journal)
      } catch (error) {
        logger.error('JournalAiService', `Failed to generate journal for ${month}`, error)
      }
    }

    return results
  }

  getAllJournals(): GameJournal[] {
    return journalEngine.getAllJournals()
  }

  // ============================================================
  // AI Generation (title + summary only)
  // ============================================================

  private async generateTitleAndSummary(
    report: MonthlyReport, language: string
  ): Promise<{ title: string; summary: string }> {
    const isRu = language === 'ru'
    const langInstruction = isRu
      ? 'CRITICAL: Write title and summary in Russian (Русский язык).'
      : 'Write title and summary in English.'

    const topGameNames = report.topGames.slice(0, 3).map(g => g.name).join(', ')
    const topGenreNames = report.genresCurrent.slice(0, 3).map(g => g.genre).join(', ')

    const prompt = `You are GameMind AI. Generate a monthly gaming report title and summary.

${langInstruction}

Month: ${report.stats.hoursPlayed > 0 ? report.topGames[0]?.name || 'Gaming' : 'Gaming'}
Stats: ${report.stats.hoursPlayed}h played, ${report.stats.gamesPlayed} games, ${report.stats.achievementsUnlocked} achievements
Top games: ${topGameNames}
Top genres: ${topGenreNames}
${report.stats.newGamesAdded > 0 ? `New games added: ${report.stats.newGamesAdded}` : ''}

Rules:
- "title": A catchy 3-5 word title. Examples: "Summer in Stardew Valley", "Return to Terraria", "Month of Achievements"
- "summary": Exactly 2-3 sentences. Analytical, NOT diary-style. NOT first-person. Brief factual gaming month overview.
  Example: "This month was dominated by Stardew Valley. Gaming activity decreased slightly compared to the previous month, but a large number of achievements were earned."

Respond with a JSON object: {"title": "...", "summary": "..."}`

    try {
      const response = await aiClient.generate({
        messages: [
          { role: 'system', content: 'You are a concise gaming analyst. Output only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        responseFormat: 'json',
        maxTokens: 3000
      })

      const { extractAndParseJSON } = await import('./json-utils')
      const parsed = extractAndParseJSON(response.content)
      return {
        title: parsed.title || (isRu ? 'Игровой отчёт' : 'Gaming Report'),
        summary: parsed.summary || ''
      }
    } catch (error) {
      logger.error('JournalAiService', 'Failed to generate title/summary', error)
      // Fallback
      return {
        title: isRu
          ? `Отчёт за ${this.formatMonthName(report.topGames[0]?.name || '', isRu)}`
          : `Report: ${report.topGames[0]?.name || 'Gaming Month'}`,
        summary: isRu
          ? `Сыграно ${report.stats.gamesPlayed} игр, ${report.stats.hoursPlayed} часов. Получено ${report.stats.achievementsUnlocked} достижений.`
          : `Played ${report.stats.gamesPlayed} games for ${report.stats.hoursPlayed} hours. Earned ${report.stats.achievementsUnlocked} achievements.`
      }
    }
  }

  // ============================================================
  // Low-activity templates
  // ============================================================

  private getLowActivityTitle(report: MonthlyReport, language: string): string {
    const isRu = language === 'ru'
    if (report.stats.gamesPlayed === 1) {
      const gameName = report.topGames[0]?.name || ''
      return isRu ? `Только ${gameName}` : `Just ${gameName}`
    }
    const templates = isRu
      ? ['Спокойный месяц', 'Месяц отдыха', 'Тихий месяц']
      : ['A Quiet Month', 'Rest Month', 'A Calm Month']
    return templates[Math.floor(Math.random() * templates.length)]
  }

  private getLowActivitySummary(report: MonthlyReport, language: string): string {
    const isRu = language === 'ru'
    if (report.stats.gamesPlayed === 1 && report.topGames[0]) {
      return isRu
        ? `Единственной игрой месяца стала ${report.topGames[0].name} — ${report.stats.hoursPlayed} ч. Игровая активность была минимальной.`
        : `The only game this month was ${report.topGames[0].name} — ${report.stats.hoursPlayed}h. Gaming activity was minimal.`
    }
    return isRu
      ? `В этом месяце игровая активность была минимальной: ${report.stats.hoursPlayed} ч в ${report.stats.gamesPlayed} играх. Этот месяц оказался спокойнее обычного.`
      : `Gaming activity was minimal this month: ${report.stats.hoursPlayed}h across ${report.stats.gamesPlayed} games. This month was quieter than usual.`
  }

  private formatMonthName(gameName: string, isRu: boolean): string {
    return gameName || (isRu ? 'месяц' : 'month')
  }
}

export const journalAiService = new JournalAiService()
