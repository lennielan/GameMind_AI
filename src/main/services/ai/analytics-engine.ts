import { logger } from '../../logger/logger'
import { configManager } from '../../config/config-manager'
import { gamesRepository } from '../../database/repositories/games.repository'
import { userProfileRepository } from '../../database/repositories/user-profile.repository'
import { aiClient } from './ai.client'

export class AnalyticsEngine {
  async getQuickInsights(): Promise<string> {
    logger.info('AnalyticsEngine', 'Starting Quick Insights generation')
    
    const profile = userProfileRepository.getProfile()
    if (!profile) {
      throw new Error('No user profile found.')
    }

    const games = gamesRepository.getAllGames()
    
    const recentGames = games
      .filter(g => g.playtime2Weeks > 0)
      .sort((a, b) => b.playtime2Weeks - a.playtime2Weeks)
      .slice(0, 10)
      .map(g => ({ name: g.name, playtime2Weeks: Math.round(g.playtime2Weeks / 60) }))

    const totalPlaytimeHours = Math.round(games.reduce((acc, g) => acc + g.playtimeForever, 0) / 60)
    const gamesCount = games.length

    const language = configManager.get('language') || 'en'
    const isRussian = language === 'ru'
    
    const langInstruction = isRussian
      ? '\nWrite a fun, 2-sentence \'Quick Insight\' in Russian.'
      : '\nWrite a fun, 2-sentence \'Quick Insight\' in English.'

    const prompt = `
You are GameMind AI. Analyze this user's recent gaming activity and total stats.
${langInstruction}
For example, 'You played 25h of shooters recently. Good job, but maybe try Stardew Valley to relax?'.
Respond with RAW TEXT ONLY, no JSON, no quotes.

User Stats:
Total Games: ${gamesCount}
Total Playtime: ${totalPlaytimeHours} hours
Recent Games (last 2 weeks):
${JSON.stringify(recentGames, null, 2)}
`

    try {
      const response = await aiClient.generate({
        messages: [
          { role: 'system', content: 'You are GameMind AI, an expert gaming analyst. Respond with raw text only.' },
          { role: 'user', content: prompt }
        ],
        maxTokens: 300
      })
      
      return response.content.trim()
    } catch (error: any) {
      logger.error('AnalyticsEngine', 'Failed to generate insights', error)
      throw new Error(`Failed to generate insights: ${error.message}`)
    }
  }
}

export const analyticsEngine = new AnalyticsEngine()
