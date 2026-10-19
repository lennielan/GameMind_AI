import { logger } from '../../logger/logger'
import { configManager } from '../../config/config-manager'
import { gamesRepository } from '../../database/repository.factory'
import { userProfileRepository } from '../../database/repository.factory'
import { playerDnaRepository } from '../../database/repository.factory'
import { aiClient } from './ai.client'

export class ScoreEngine {
  public calculateLocalScore(): number {
    const games = gamesRepository.getAllGames()
    if (!games || games.length === 0) return 0

    let score = 0
    let totalPlaytime = 0
    let totalAchievements = 0
    let unlockedAchievements = 0

    for (const g of games) {
      totalPlaytime += g.playtimeForever
      totalAchievements += g.totalAchievements || 0
      unlockedAchievements += g.unlockedAchievements || 0
    }

    // Base score for games owned (10 per game)
    score += games.length * 10

    // Playtime score (1 point per hour)
    const hours = Math.floor(totalPlaytime / 60)
    score += hours

    // Achievement score: 2 points per unlocked achievement + Completion rate multiplier
    score += unlockedAchievements * 2
    if (totalAchievements > 0) {
      const completionRate = unlockedAchievements / totalAchievements
      score += Math.floor(completionRate * 1000)
    }

    return score
  }

  public async generateGameMindScore(): Promise<boolean> {
    logger.info('ScoreEngine', 'Generating GameMind Score')
    const profile = userProfileRepository.getProfile()
    if (!profile) throw new Error('No user profile found')

    const localScore = this.calculateLocalScore()
    
    // Also grab DNA summary
    const dnaSummary = playerDnaRepository.getSummary(profile.steamId)
    const persona = dnaSummary?.persona || 'Unexplored Gamer'

    const language = configManager.get('language') || 'en'
    const isRussian = language === 'ru'

    const langInstruction = isRussian
      ? '\nIMPORTANT: Response MUST be in Russian.'
      : '\nIMPORTANT: Response MUST be in English.'

    const schemaTemplate = isRussian ? `{
  "title": "Уникальное звание (например, Грандмастер Стратегий, Ветеран Пустошей)",
  "analysis": "Ровно 1 ёмкое профессиональное предложение (без пафоса и без упоминания чисел очков, до 15-20 слов), объясняющее стратегический подход игрока к механизациям и системам."
}` : `{
  "title": "A unique, catchy title (e.g. Grandmaster of Strategy, Wasteland Veteran)",
  "analysis": "Exactly 1 concise, professional sentence (max 15-20 words, no verbose filler or score repeating), describing their analytical approach to game mechanics."
}`

    const prompt = `
You are GameMind AI Telemetry Engine. The user has a calculated GameMind Score of ${localScore} points.
Their previously analyzed Player DNA Persona is: "${persona}".
${langInstruction}

Provide a unique rank title and exactly ONE concise, high-density analytical sentence summarizing their gaming mindset.
Tone: strictly analytical, technical, professional (Neo-Terminal / Industrial Tech).
NO flowery gaming metaphors, NO multi-sentence essays.
Example:
"Глубокий анализ игровых систем и механик для достижения максимального соревновательного преимущества."

Respond ONLY with a JSON object matching this schema:
${schemaTemplate}
`

    const fallbackTitle = isRussian ? 'Аналитик Систем' : 'Systems Analyst'
    const fallbackAnalysis = isRussian
      ? 'Глубокий анализ игровых систем и механик для достижения максимального соревновательного преимущества.'
      : 'In-depth analysis of game systems and mechanics to achieve peak competitive performance.'

    try {
      const response = await aiClient.generate({
        messages: [
          { role: 'system', content: 'You are an expert gaming telemetry analyst. Always output valid JSON.' },
          { role: 'user', content: prompt }
        ],
        responseFormat: 'json',
        maxTokens: 300,
        timeoutMs: 15000
      })

      const { extractAndParseJSON } = await import('./json-utils')
      const aiData = extractAndParseJSON(response.content)

      userProfileRepository.updateGameMindScore(
        profile.steamId,
        localScore,
        aiData?.title || fallbackTitle,
        aiData?.analysis || fallbackAnalysis
      )
    } catch (aiError: any) {
      logger.warn('ScoreEngine', 'AI generation failed, applying telemetry fallback', aiError)
      userProfileRepository.updateGameMindScore(
        profile.steamId,
        localScore,
        fallbackTitle,
        fallbackAnalysis
      )
    }

    // Sync to cloud if necessary
    try {
      const { cloudSyncService } = await import('../cloud-sync.service')
      await cloudSyncService.upsertProfile()
    } catch (e) {
      logger.warn('ScoreEngine', 'Failed to cloud sync profile', e)
    }

    logger.info('ScoreEngine', 'GameMind Score generated successfully')
    return true
  }
}

export const scoreEngine = new ScoreEngine()
