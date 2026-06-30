import { aiClient } from './ai.client'
import { logger } from '../../logger/logger'

class AiService {
  async generateCoopRecommendation(myDna: any, friendDna: any): Promise<any> {
    try {
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
Output the result strictly as a JSON object in this format:
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
        responseFormat: 'json'
      })

      const content = response.content.replace(/```json/g, '').replace(/```/g, '').trim()
      const jsonResult = JSON.parse(content)
      return jsonResult
    } catch (error) {
      logger.error('AiService', 'Error generating coop recommendation', error)
      throw error
    }
  }
}

export const aiService = new AiService()
