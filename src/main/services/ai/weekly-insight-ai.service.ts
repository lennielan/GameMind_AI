import { aiClient } from './ai.client'
import { logger } from '../../logger/logger'
import { gamesRepository, userProfileRepository, playerDnaRepository } from '../../database/repository.factory'
import { queryOne, execute } from '../../database/database'
import { configManager } from '../../config/config-manager'

export class WeeklyInsightAiService {
  async getOrGenerateWeeklyInsight(forceRefresh: boolean = false): Promise<string> {
    const profile = userProfileRepository.getProfile()
    if (!profile) return ''

    const language = configManager.get('language') || 'en'
    const isRussian = language === 'ru'
    const defaultInsight = isRussian
      ? 'Неделя прошла в спокойном темпе. Отличный момент, чтобы стряхнуть пыль с бэклога или погрузиться в сюжетное приключение на пару часов.'
      : 'The week passed at a calm pace. A great moment to dust off your backlog or dive into a story adventure for a few hours.'

    // Check if we already have an insight less than 7 days old
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
    const recentInsight = queryOne<{ data: string }>(
      `SELECT data FROM insights WHERE category = 'weekly_insight' AND generated_at > ? ORDER BY generated_at DESC LIMIT 1`,
      [sevenDaysAgo]
    )

    if (recentInsight && recentInsight.data && !forceRefresh) {
      const isLegacyOrDry = recentInsight.data.includes('Отличная') ||
                           recentInsight.data.includes('мастерств') ||
                           recentInsight.data.includes('отдых') ||
                           recentInsight.data.includes('захватыва') ||
                           recentInsight.data.includes(')*:') ||
                           recentInsight.data.includes('**') ||
                           recentInsight.data.includes('снизилась на 40%') ||
                           recentInsight.data.includes('закрыть бэклог короткой сессией') ||
                           recentInsight.data.includes('Нулевая игровая активность зафиксирована') ||
                           recentInsight.data.includes('Системы ожидают инициализации') ||
                           recentInsight.data.includes('decreased by 40%')
      if (!isLegacyOrDry) {
        return recentInsight.data
      }
    }

    logger.info('WeeklyInsightAiService', 'Generating fresh gaming companion weekly insight...')

    // Gather last 7-14 days of activity and library context
    const oneWeekAgoSecs = Math.floor(sevenDaysAgo / 1000)
    const allGames = gamesRepository.getAllGames()
    
    // Check both lastPlayedAt within a week and playtime2Weeks
    const playedRecently = allGames.filter(
      g => (g.lastPlayedAt && g.lastPlayedAt >= oneWeekAgoSecs) || (g.playtime2Weeks && g.playtime2Weeks > 0)
    )

    const dnaSummary = playerDnaRepository.getSummary(profile.steamId)
    const persona = dnaSummary?.persona || ''
    const topGenres = dnaSummary?.topGenres || []

    const backlogGames = allGames.filter(g => g.playtimeForever === 0)
    const topAllTime = allGames.slice(0, 3).map(g => g.name)

    const promptData = {
      playerPersona: persona || undefined,
      favoriteGenres: topGenres.length > 0 ? topGenres.slice(0, 3) : undefined,
      gamesPlayedThisWeek: playedRecently.map(g => ({
        name: g.name,
        hoursThisWeek: Math.round((g.playtime2Weeks || 0) / 60) || 1
      })),
      topAllTimeGames: playedRecently.length === 0 ? topAllTime : undefined,
      backlogCount: backlogGames.length
    }

    const langInstruction = isRussian
      ? 'IMPORTANT: You MUST write the commentary in natural, lively Russian (Русский язык).'
      : 'IMPORTANT: You MUST write the commentary in English.'

    const prompt = `
You are GameMind AI, an intelligent, perceptive, and witty Gaming Companion for PC gamers.
Analyze the user's weekly gaming stats and provide a personalized, engaging weekly commentary.

User Context:
${JSON.stringify(promptData, null, 2)}

${langInstruction}

GUIDELINES FOR YOUR COMMENTARY:
1. Tone: You are a smart co-op partner and gaming companion — observant, engaging, supportive, with a touch of clever gamer wit.
2. NOT a dry corporate report or robotic telemetry log. Speak like an intelligent companion who appreciates good games and understands the gamer's habits.
3. If they played specific games this week: mention them by name, comment on their dedication, genre shifts, or playstyle.
4. If they had a quiet week (zero or few games): playfully or warmly comment on the hiatus, mentioning their unplayed backlog (${backlogGames.length} games waiting) or favorite games (${topAllTime.join(', ')}), encouraging them to jump in whenever they are ready.
5. STRICT CONSTRAINTS:
   - ABSOLUTELY NO EMOJIS (no smiles, no gamepads, no fire, no icons of any kind).
   - Exactly 1 to 2 engaging, concise sentences (max 30-40 words total).
   - NO markdown bolding, asterisks, brackets [ ], bullet points, or JSON formatting. Output ONLY clean, natural plain text.
`

    try {
      const response = await aiClient.generate({
        messages: [
          {
            role: 'system',
            content: 'You are GameMind AI, a witty, intelligent, and perceptive gaming companion. You write engaging 1-2 sentence commentaries for gamers without any emojis or markdown.'
          },
          { role: 'user', content: prompt }
        ],
        maxTokens: 180,
        timeoutMs: 15000
      })

      // Clean up any stray markdown or quotes
      let insight = response.content.trim().replace(/^["']|["']$/g, '').trim()
      if (!insight || insight.length < 10) {
        insight = defaultInsight
      }

      // Save to database
      execute(
        `INSERT INTO insights (steam_id, category, title, description, data, generated_at) 
         VALUES (?, 'weekly_insight', 'Weekly Insight', 'AI generated weekly insight', ?, ?)`,
        [profile.steamId, insight, Date.now()]
      )

      return insight
    } catch (error) {
      logger.error('WeeklyInsightAiService', 'Failed to generate weekly insight, saving default', error)
      execute(
        `INSERT INTO insights (steam_id, category, title, description, data, generated_at) 
         VALUES (?, 'weekly_insight', 'Weekly Insight', 'AI generated weekly insight', ?, ?)`,
        [profile.steamId, defaultInsight, Date.now()]
      )
      return defaultInsight
    }
  }
}

export const weeklyInsightAiService = new WeeklyInsightAiService()
