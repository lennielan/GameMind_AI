import { logger } from '../../logger/logger'
import { gamesRepository } from '../../database/repositories/games.repository'
import { userProfileRepository } from '../../database/repositories/user-profile.repository'
import { playerDnaRepository } from '../../database/repositories/player-dna.repository'
import { recommendationsRepository } from '../../database/repositories/recommendations.repository'
import { configManager } from '../../config/config-manager'
import { aiClient } from './ai.client'
import { hardwareService } from '../hardware.service'

export class RecommendationsEngine {
  async generateRecommendations(): Promise<boolean> {
    logger.info('RecommendationsEngine', 'Starting AI Recommendations generation')
    
    const profile = userProfileRepository.getProfile()
    if (!profile) {
      throw new Error('No user profile found.')
    }

    const dnaSummary = playerDnaRepository.getSummary(profile.steamId)
    const dnaTraits = playerDnaRepository.getTraits(profile.steamId)

    if (!dnaSummary) {
      throw new Error('Please generate your Player DNA first.')
    }

    const games = gamesRepository.getAllGames()
    
    // Unplayed games (playtime < 120 minutes)
    const allBacklog = games.filter(g => g.playtimeForever < 120)
    
    // Select Top 5 favorite games
    const favorites = games
      .sort((a, b) => b.playtimeForever - a.playtimeForever)
      .slice(0, 5)
      .map(g => ({ appId: g.appId, name: g.name }))
      
    // Select 20 backlog candidates
    const backlogCandidates = allBacklog
      .slice(0, 20)
      .map(g => ({ appId: g.appId, name: g.name }))

    const { wishlistRepository } = await import('../../database/repositories/wishlist.repository')
    const wishlistRaw = wishlistRepository.getWishlist(profile.steamId)
    const wishlistCandidates = wishlistRaw
      .slice(0, 10)
      .map(w => ({ appId: w.appId, name: w.name }))

    // ---------------------------------------------------------
    // 1. LOCAL MATCHING (Zero API Cost, Highly Accurate)
    // ---------------------------------------------------------
    const { localMatcher } = await import('./local-matcher')
    
    const matchedBacklog = await localMatcher.getTopMatches(favorites, backlogCandidates, 3)
    const matchedWishlist = await localMatcher.getTopMatches(favorites, wishlistCandidates, 3)

    // ---------------------------------------------------------
    // 2. THIN-AI: FLAVOR TEXT GENERATION & HARDWARE CHECK
    // ---------------------------------------------------------
    const language = configManager.get('language') || 'en'
    const isRussian = language === 'ru'
    
    // Fetch PC Specs for AI evaluation
    const pcSpecs = await hardwareService.getSpecs()
    
    const langInstruction = isRussian
      ? '\nIMPORTANT: The `reasoning` fields MUST be written in Russian.'
      : ''

    const wishlistSchemaStr = matchedWishlist.length > 0 
      ? (isRussian ? `,
  "wishlist": [
    {
      "appId": 123,
      "gameName": "Name",
      "reasoning": "2 предложения на РУССКОМ ЯЗЫКЕ, объясняющие почему стоит в это поиграть...",
      "score": <keep original score>,
      "hardware_evaluation": "✅ Runs on High | ✅ Runs Fine | ⚠️ Might struggle"
    } // 3 items
  ]` : `,
  "wishlist": [
    {
      "appId": 123,
      "gameName": "Name",
      "reasoning": "2 sentences explaining why...",
      "score": <keep original score>,
      "hardware_evaluation": "✅ Runs on High | ✅ Runs Fine | ⚠️ Might struggle"
    } // 3 items
  ]`)
      : ''

    const schemaTemplate = `{
  "backlog": [
    {
      "appId": 123,
      "gameName": "Name",
      "reasoning": "${isRussian ? '2 предложения на РУССКОМ ЯЗЫКЕ...' : '2 sentences explaining why...'}",
      "score": <keep original score>,
      "hardware_evaluation": "✅ Runs on High | ✅ Runs Fine | ⚠️ Might struggle"
    } // 3 items
  ]${wishlistSchemaStr},
  "discovery": [
    {
      "appId": null,
      "gameName": "Name",
      "reasoning": "${isRussian ? '2 предложения на РУССКОМ ЯЗЫКЕ, объясняющие почему эта новая игра идеально подходит...' : '2 sentences explaining why this new game is a perfect match'}",
      "score": <number 80-99>,
      "hardware_evaluation": "✅ Runs on High | ✅ Runs Fine | ⚠️ Might struggle"
    } // 3 items
  ]
}`

    const prompt = `
You are GameMind AI, an expert game recommender.
User Persona: ${dnaSummary.persona}
User Traits: ${dnaTraits.map(t => `${t.traitName} (${t.traitValue}%)`).join(', ')}
User PC Specs: ${pcSpecs}

Our algorithmic engine has already selected the absolute best 3 games from their backlog${matchedWishlist.length > 0 ? ' and 3 from their wishlist' : ''} based on genre cosine similarity.
Your ONLY job is to write a highly personalized 2-sentence reasoning for WHY they should play them, based on their Persona and Traits.
You must ALSO pick 3 entirely new Discovery games (general Steam games) that match their persona.
${langInstruction}

CRITICAL INSTRUCTION FOR HARDWARE:
Evaluate if the user's PC specs can run the game. Put your evaluation ONLY in the new "hardware_evaluation" JSON field using one of the short badges: ✅ Runs on High, ✅ Runs Fine, ⚠️ Might struggle.

Output exactly this JSON format:
${schemaTemplate}

Pre-selected Backlog Matches (DO NOT CHANGE APPID, NAME, OR SCORE):
${JSON.stringify(matchedBacklog, null, 2)}
${matchedWishlist.length > 0 ? `\nPre-selected Wishlist Matches (DO NOT CHANGE APPID, NAME, OR SCORE):\n${JSON.stringify(matchedWishlist, null, 2)}` : ''}
`

    try {
      const systemPrompt = `You are an expert game recommender. Always output valid JSON. Never change provided IDs or scores.${isRussian ? ' ALL REASONING TEXT MUST BE IN RUSSIAN (Русский язык).' : ''}`
      
      const response = await aiClient.generate({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        responseFormat: 'json',
        maxTokens: 2000
      })
      
      const { extractAndParseJSON } = await import('./json-utils')
      const aiData = extractAndParseJSON(response.content)

      const { steamApi } = await import('../steam/steam-api.client')
      if (aiData.discovery && Array.isArray(aiData.discovery)) {
        for (const game of aiData.discovery) {
          if (!game.appId || game.appId === null) {
            const foundId = await steamApi.searchGameByName(game.gameName)
            if (foundId) {
              game.appId = foundId
            }
          }
        }
      }

      recommendationsRepository.clearRecommendations(profile.steamId)

      recommendationsRepository.saveRecommendations(profile.steamId, aiData.backlog, 'backlog')
      if (aiData.wishlist && aiData.wishlist.length > 0) {
        recommendationsRepository.saveRecommendations(profile.steamId, aiData.wishlist, 'wishlist')
      }
      recommendationsRepository.saveRecommendations(profile.steamId, aiData.discovery, 'discovery')

      logger.info('RecommendationsEngine', 'Recommendations successfully generated and saved')
      return true
    } catch (error: any) {
      logger.error('RecommendationsEngine', 'Failed to generate recommendations', error)
      throw new Error(`Failed to generate recommendations: ${error.message}`)
    }
  }

  getRecommendations() {
    const profile = userProfileRepository.getProfile()
    if (!profile) return null

    const all = recommendationsRepository.getRecommendations(profile.steamId)
    return {
      backlog: all.filter(r => r.context === 'backlog'),
      wishlist: all.filter(r => r.context === 'wishlist'),
      discovery: all.filter(r => r.context === 'discovery')
    }
  }
}

export const recommendationsEngine = new RecommendationsEngine()
