import { aiClient } from './ai.client'
import { gamesRepository } from '../../database/repository.factory'
import { logger } from '../../logger/logger'
import { steamApi } from '../steam/steam-api.client'
import { z } from 'zod'

const semanticSchema = z.object({
  reasoning: z.any().default(''),
  isValidQuery: z.any().default(true),
  localRecommendations: z.array(z.any()).default([]),
  storeRecommendations: z.array(z.any()).default([])
}).passthrough()

export class SemanticSearchEngine {
  async search(query: string): Promise<{ localGames: any[], storeGames: any[], isInvalidQuery?: boolean }> {
    try {
      if (!query || query.trim() === '') return { localGames: [], storeGames: [] }
      const normalizedQuery = query.trim().toLowerCase()

      const allGames = gamesRepository.getAllGames()
      
      const localLibraryNames = allGames.map(g => g.name)
      
      const prompt = `
You are an expert video game recommendation AI.
User's query: "${normalizedQuery}"

User's Local Library:
${JSON.stringify(localLibraryNames)}

Instructions:
1. "reasoning": Briefly explain the user's query and your logic. If the query is random keyboard mashing (e.g., "asdsadfsf"), state that it is invalid.
2. "isValidQuery": Set to false ONLY IF your reasoning concluded the query is gibberish or invalid. Otherwise, true.
3. "localRecommendations": Recommend up to 15 games EXACTLY from the "User's Local Library" list provided above that match the query perfectly. Rely on your vast internal knowledge of these games (their genres, vibe, setting, mechanics). Output an array of strings (exact titles). If none match, return [].
4. "storeRecommendations": Recommend up to 10 ACTUAL, COMMERCIALLY RELEASED Steam games that perfectly match the query BUT ARE NOT in the local library list. Do not invent games. Output an array of strings.

Output EXACTLY a JSON object matching this schema:
{
  "reasoning": "string",
  "isValidQuery": boolean,
  "localRecommendations": ["string"],
  "storeRecommendations": ["string"]
}
Do not include any other text or markdown blocks.
`
      const { createHash } = await import('crypto')
      const { supabase } = await import('../supabase.client')
      const { configManager } = await import('../../config/config-manager')
      
      const provider = configManager.get('aiProvider') as string || 'gemini'
      const hashInput = 'semantic-search-v5-llm-local:' + provider + ':user' + prompt
      const cacheHash = createHash('sha256').update(hashInput).digest('hex')

      let rawLlmContent: string | object = ''
      let isCached = false

      if (supabase) {
        try {
          const { data, error } = await supabase.rpc('get_ai_cache', { p_hash: cacheHash })
          if (!error && data) {
            const { extractAndParseJSON } = await import('./json-utils')
            const parsedCache = extractAndParseJSON(data)
            if (parsedCache && parsedCache.isValidQuery !== false && (!parsedCache.storeRecommendations || parsedCache.storeRecommendations.length === 0)) {
               logger.info('SemanticSearchEngine', `Ignoring bad cache for query: "${normalizedQuery}" (empty recommendations)`)
            } else {
               logger.info('SemanticSearchEngine', `Cache hit for query: "${normalizedQuery}"`)
               rawLlmContent = parsedCache
               isCached = true
            }
          }
        } catch (err) {
          logger.warn('SemanticSearchEngine', 'Failed to read cache', err)
        }
      }

      if (!rawLlmContent) {
        try {
          const response = await aiClient.generate({
            messages: [{ role: 'user', content: prompt }],
            responseFormat: 'json',
            timeoutMs: 30000
          })
          rawLlmContent = response.content
        } catch (e: any) {
          logger.error('SemanticSearchEngine', 'LLM Generate Error', e)
          throw new Error('Превышен лимит запросов ИИ или ошибка сети. Попробуйте через 10 секунд.')
        }
      }

      if (!rawLlmContent) {
        throw new Error('ИИ вернул пустой ответ. Попробуйте через 10 секунд.')
      }

      const { safeParseJsonWithSchema } = await import('./json-utils')
      
      const parsed = safeParseJsonWithSchema(rawLlmContent, semanticSchema, { 
        isValidQuery: true, localRecommendations: [], storeRecommendations: [] 
      })
      
      if (parsed.isValidQuery === false || String(parsed.isValidQuery).toLowerCase() === 'false') {
        return { localGames: [], storeGames: [], isInvalidQuery: true }
      }
      
      const localRecs: string[] = (parsed.localRecommendations || []).map((t: any) => {
        if (typeof t === 'object' && t !== null) return String(t.gameName || t.name || t.title || t).toLowerCase().trim()
        return String(t).toLowerCase().trim()
      }).filter(Boolean)
      let storeRecs: string[] = []
      if (Array.isArray(parsed.storeRecommendations)) {
        storeRecs = parsed.storeRecommendations.map((r: any) => {
          if (typeof r === 'object' && r !== null) return r.gameName || r.name || r.title || String(r)
          return String(r)
        }).filter(Boolean).slice(0, 10)
      }

      logger.info('SemanticSearchEngine', `=== SEMANTIC SEARCH DEBUG ===`)
      logger.info('SemanticSearchEngine', `Query: "${query}"`)
      logger.info('SemanticSearchEngine', `LLM Local Recommendations: ${JSON.stringify(localRecs)}`)
      logger.info('SemanticSearchEngine', `LLM Store Recommendations: ${JSON.stringify(storeRecs)}`)

      const lowerQuery = query.toLowerCase()
      
      let validLocalGames = allGames.filter(g => {
        const normName = g.name.toLowerCase().trim()
        if (localRecs.includes(normName)) return true
        if (normName === lowerQuery || normName.includes(lowerQuery)) return true
        return false
      })

      // Sort validLocalGames: exact title match first, then playtime
      validLocalGames.sort((a, b) => {
        const aName = a.name.toLowerCase()
        const bName = b.name.toLowerCase()
        if (aName === lowerQuery && bName !== lowerQuery) return -1
        if (bName === lowerQuery && aName !== lowerQuery) return 1
        return (b.playtimeForever || 0) - (a.playtimeForever || 0)
      })
      
      validLocalGames = validLocalGames.slice(0, 15)

      // Cache the successful result if not cached
      if (!isCached && supabase) {
        try {
          await supabase.rpc('set_ai_cache', {
            p_hash: cacheHash,
            p_response: parsed
          })
        } catch (err) {
          logger.warn('SemanticSearchEngine', 'Failed to save cache', err)
        }
      }

      // --- 2. Store Search ---
      const storeGames: any[] = []
      if (storeRecs.length > 0) {
        await Promise.all(storeRecs.map(async (recName) => {
          try {
            if (allGames.some(g => g.name.toLowerCase() === recName.toLowerCase())) return

            const found = await steamApi.searchGameByName(recName)
            if (found && found.id) {
              const details = await steamApi.getAppDetails(found.id)
              if (details) {
                storeGames.push({
                  appId: found.id,
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
          } catch (err) {
            logger.warn('SemanticSearchEngine', `Failed to fetch store game ${recName}:`, err)
          }
        }))
      }

      return {
        localGames: validLocalGames,
        storeGames: storeGames.filter((g, index, self) =>
          index === self.findIndex((t) => t.appId === g.appId)
        )
      }
    } catch (error) {
      logger.error('SemanticSearchEngine', 'Search failed', error)
      throw error
    }
  }
}

export const semanticSearchEngine = new SemanticSearchEngine()
