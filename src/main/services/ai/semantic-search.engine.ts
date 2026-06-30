import { aiClient } from './ai.client'
import { gamesRepository } from '../../database/repositories/games.repository'
import { logger } from '../../logger/logger'
import { steamApi } from '../steam/steam-api.client'

export class SemanticSearchEngine {
  async search(query: string): Promise<{ localGames: any[], storeGames: any[] }> {
    try {
      if (!query || query.trim() === '') return { localGames: [], storeGames: [] }

      const prompt = `
You are an expert game librarian for "GameMind AI".
A user is searching their local game library using natural language.
User's query: "${query}"

Your task is to translate this query into an array of standard Steam tags and genres, AND recommend 5 ideal games from the Steam store that match the description perfectly.
You MUST output standard Steam tags IN ENGLISH ONLY, regardless of the user's query language.
Output EXACTLY a JSON object in this format:
{
  "tags": ["Space", "Survival", "Sci-fi"],
  "storeRecommendations": ["Dead Space", "Alien: Isolation", "Prey"]
}
Do not include any other text, just the JSON object.
`
      const response = await aiClient.generate({
        messages: [{ role: 'user', content: prompt }],
        responseFormat: 'json'
      })

      const { extractAndParseJSON } = await import('./json-utils')
      
      let extractedTags: string[] = []
      let storeRecs: string[] = []
      
      try {
        const parsed = extractAndParseJSON(response.content)
        if (parsed && Array.isArray(parsed.tags)) {
          extractedTags = parsed.tags
        }
        if (parsed && Array.isArray(parsed.storeRecommendations)) {
          storeRecs = parsed.storeRecommendations.slice(0, 5)
        }
      } catch (e) {
        logger.error('SemanticSearchEngine', 'Failed to parse AI response', e)
        return { localGames: [], storeGames: [] }
      }

      // --- 1. Local Search ---
      const normalizedTags = extractedTags.map(t => t.toLowerCase())
      const allGames = gamesRepository.getAllGames()
      
      const scoredGames = allGames.map(game => {
        let score = 0;
        const gameTags = [...(game.genres || []), ...(game.tags || [])].map(t => t.toLowerCase())
        
        for (const extractedTag of normalizedTags) {
          if (gameTags.some(gt => gt.includes(extractedTag) || extractedTag.includes(gt))) {
            score += 1
          }
        }
        if (game.name.toLowerCase().includes(query.toLowerCase())) {
          score += 2
        }
        return { ...game, searchScore: score }
      })

      const localGames = scoredGames
        .filter(g => g.searchScore > 0)
        .sort((a, b) => b.searchScore - a.searchScore)
        .slice(0, 10)

      // --- 2. Store Search ---
      const storeGames: any[] = []
      if (storeRecs.length > 0) {
        await Promise.all(storeRecs.map(async (recName) => {
          try {
            if (allGames.some(g => g.name.toLowerCase() === recName.toLowerCase())) return

            const appId = await steamApi.searchGameByName(recName)
            if (appId) {
              const details = await steamApi.getAppDetails(appId)
              if (details) {
                storeGames.push({
                  appId,
                  name: details.name,
                  headerImage: details.header_image,
                  playtimeForever: 0,
                  totalAchievements: 0,
                  unlockedAchievements: 0,
                  isStoreGame: true,
                  priceFinal: details.price_overview?.final,
                  priceFormatted: details.price_overview?.final_formatted,
                  isFree: details.is_free
                })
              }
            }
          } catch (e) {
            logger.warn('SemanticSearchEngine', `Failed to fetch store details for ${recName}`)
          }
        }))
      }

      return { localGames, storeGames }
    } catch (error) {
      logger.error('SemanticSearchEngine', 'Search failed', error)
      throw error
    }
  }
}

export const semanticSearchEngine = new SemanticSearchEngine()
