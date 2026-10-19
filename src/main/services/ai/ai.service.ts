import { aiClient } from './ai.client'
import { logger } from '../../logger/logger'

class AiService {
  async generateCoopRecommendation(myDna: any, friendDna: any): Promise<any> {
    try {
      const { configManager } = await import('../../config/config-manager')
      const language = configManager.get('language') || 'en'
      const langInstruction = language === 'ru' 
        ? 'IMPORTANT: All game descriptions and reasons MUST be written in Russian. Do NOT use English for the reasons.' 
        : 'IMPORTANT: All game descriptions and reasons MUST be written in English.'

      const prompt = `
You are an expert AI gaming assistant for "GameMind AI".
You are tasked with finding the perfect co-op games for two players to play together.

User A (My DNA):
- Top Genres: ${myDna?.topGenres?.join(', ') || 'Unknown'}
- Total Playtime: ${myDna?.totalPlaytimeHours || 0} hours
- Most Played Tags: ${myDna?.mostPlayedTags?.slice(0, 5).join(', ') || 'Unknown'}

User B (Friend's DNA):
- Top Genres: ${friendDna?.topGenres?.join(', ') || 'Unknown'}
- Total Playtime: ${friendDna?.totalPlaytimeHours || 0} hours
- Most Played Tags: ${friendDna?.mostPlayedTags?.slice(0, 5).join(', ') || 'Unknown'}

Please analyze their combined interests and suggest exactly 3 co-op or multiplayer games they would both enjoy. 
The games should ideally bridge their favorite genres. 
CRITICAL RULES:
1. ${langInstruction}
2. DO NOT hallucinate or invent facts about games. Ensure the reasons provided accurately reflect actual game mechanics and features.
3. Suggest EXACTLY 3 games. Do not stop early.

Output the result strictly as a VALID JSON object in this format. Double-check that all array elements and object properties are correctly separated by commas:
{
  "games": [
    {
      "name": "Game Name",
      "reason": "Why this game is perfect for both players"
    }
  ]
}
`
      const response = await aiClient.generate({
        messages: [{ role: 'user', content: prompt }],
        responseFormat: 'json',
        maxTokens: 4000
      })

      const { extractAndParseJSON } = await import('./json-utils')
      const jsonResult = extractAndParseJSON(response.content)
      return jsonResult
    } catch (error) {
      logger.error('AiService', 'Error generating coop recommendation', error)
      throw error
    }
  }
}

export const aiService = new AiService()
