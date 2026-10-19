import { logger } from '../../../logger/logger'
import { localMatcher } from '../local-matcher'
import { configManager } from '../../../config/config-manager'
import { aiClient } from '../ai.client'
import { hardwareService } from '../../hardware.service'
import { safeParseJsonWithSchema } from '../json-utils'
import { steamApi } from '../../steam/steam-api.client'
import { recommendationsSchema } from './recommendations-formatter'
import { recommendationsDataProvider } from './recommendations-data.provider'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { z } from 'zod'

export class RecommendationsCalculator {
  async scoreLocalCandidates(favorites: any[], backlogCandidates: any[], wishlistCandidates: any[], mood?: string) {
    const scoredBacklog = await localMatcher.getTopMatches(favorites, backlogCandidates, backlogCandidates.length, mood)
    const scoredWishlist = await localMatcher.getTopMatches(favorites, wishlistCandidates, wishlistCandidates.length, mood)

    const combinedCandidates = [
      ...scoredBacklog.map(g => ({ ...g, source: 'backlog' })),
      ...scoredWishlist.map(g => ({ ...g, source: 'wishlist' }))
    ].filter(g => g.score >= 50)
    
    combinedCandidates.sort((a, b) => b.score - a.score)

    const topMatches = combinedCandidates.slice(0, 6)
    const topMatchesAppIds = new Set(topMatches.map(g => g.appId))

    const matchedBacklog = scoredBacklog.filter(g => g.score >= 50 && !topMatchesAppIds.has(g.appId)).slice(0, 6)
    const matchedWishlist = scoredWishlist.filter(g => g.score >= 50 && !topMatchesAppIds.has(g.appId)).slice(0, 6)

    return {
      topMatches,
      matchedBacklog,
      matchedWishlist
    }
  }

  async generateAiDiscoveries(context: any, localScored: any, mood?: string) {
    const language = configManager.get('language') || 'en'
    const isRussian = language === 'ru'
    
    const pcSpecs = await hardwareService.getSpecs()
    
    const langInstruction = isRussian
      ? '\nIMPORTANT: ALL strings in the `reasoning` object and `hardware_evaluation` field MUST be written in Russian (Русский язык).'
      : '\nIMPORTANT: ALL strings in the `reasoning` object and `hardware_evaluation` field MUST be written in English.'

    let moodInstruction = ''
    if (mood && mood !== 'none' && mood !== 'default') {
      switch (mood) {
        case 'new': moodInstruction = '\nCURRENT USER MOOD: The user is looking for "something new". Recommend fresh, innovative, unique concepts or indie gems.'; break;
        case 'hard': moodInstruction = '\nCURRENT USER MOOD: The user wants a "challenging game" (hard). CRITICAL: YOU MUST ONLY RECOMMEND GAMES THAT ARE WIDELY KNOWN FOR BEING EXTREMELY DIFFICULT (e.g. Dark Souls, Sekiro, Elden Ring, Hollow Knight). Do not recommend casual or standard games.'; break;
        case 'friends': moodInstruction = '\nCURRENT USER MOOD: The user wants to play "with friends". Prioritize multiplayer, online co-op, local co-op, or party elements.'; break;
        case 'relax': moodInstruction = '\nCURRENT USER MOOD: The user wants to "relax". Prioritize cozy, satisfying, low-stress, sandbox, or casual experiences.'; break;
        case 'story': moodInstruction = '\nCURRENT USER MOOD: The user wants a "strong story". Prioritize narrative-driven games, deep lore, visual novels, rich choice-driven RPGs.'; break;
        case 'completionist': moodInstruction = '\nCURRENT USER MOOD: The user wants a game for "full completion". Prioritize long-term value, deep progression, tons of achievements, or vast open worlds.'; break;
      }
    }

    const localGamesToEvaluate = [
      ...localScored.topMatches,
      ...localScored.matchedBacklog,
      ...localScored.matchedWishlist
    ].map((g: any) => g.name || g.gameName)

    const localGamesStr = localGamesToEvaluate.length > 0 
      ? `\nLocal games to evaluate for reasoning: ${localGamesToEvaluate.join(', ')}`
      : ''

    const recentBlacklist = context.blacklist.slice(0, 50)
    const blacklistedGamesStr = recentBlacklist.length > 0
      ? `\nDO NOT suggest these blacklisted games: ${recentBlacklist.map((g: any) => g.gameName).join(', ')}.`
      : ''

    const recentHistory = context.history.slice(0, 10)
    const historyGamesStr = recentHistory.length > 0
      ? `\nAvoid recently shown games: ${recentHistory.map((g: any) => g.gameName).join(', ')}.`
      : ''

    const topOwnedGames = context.games.slice(0, 15)
    const ownedGamesStr = topOwnedGames.length > 0 
      ? `\nDO NOT suggest these owned games: ${topOwnedGames.map((g: any) => g.name).join(', ')}.`
      : ''

    const hardwareExamples = isRussian 
      ? '✅ Пойдет на высоких, ✅ Пойдет отлично, ⚠️ Возможны просадки' 
      : '✅ Runs on High, ✅ Runs Fine, ⚠️ Might struggle'

    const prompt = `
You are GameMind AI, an expert game recommender.
User Persona: ${context.dnaSummary.persona}
User Traits: ${context.dnaTraits.map((t: any) => `${t.traitName} (${t.traitValue}%)`).join(', ')}
PC Specs: ${pcSpecs}
${moodInstruction}
${langInstruction}

CRITICAL INSTRUCTIONS:
1. Evaluate PC specs. Put evaluation ONLY in "hardware_evaluation" (${hardwareExamples}).
2. GENERATE EXACTLY 10 UNIQUE GAMES in "unexpected_discoveries". Must be DIFFERENT genres than favorites, but match core desires.
3. For unexpected_discoveries, generate a realistic, varied "score" between 75 and 98 based on how well the game fits the profile.
4. IMPORTANT: For EACH game listed in "Local games to evaluate for reasoning", you MUST generate a detailed reasoning entry in "local_reasoning" using the game's exact title as the key.
5. The reasoning "summary" should describe the game itself factually in 1-2 sentences. Do NOT invent facts.
6. The reasoning "why" should explain exactly why it fits the user's specific Player DNA and current mood. Be detailed and insightful.
7. The reasoning "dna_match" should be a short phrase highlighting the strongest matching trait.
${localGamesStr}
${blacklistedGamesStr}
${historyGamesStr}
${ownedGamesStr}

Output exactly this JSON format:
{
  "local_reasoning": {
    "Game Name Here": {
      "summary": "Detailed factual description of the game",
      "why": "Detailed explanation of why it fits the user's DNA and mood",
      "dna_match": "e.g. 100% Match: Tactical Thinker",
      "features": "Comma-separated key features"
    }
  },
  "unexpected_discoveries": [{"appId": null, "gameName": "New Name", "score": 90, "hardware_evaluation": "...", "reasoning": {"summary": "...", "why": "...", "dna_match": "...", "features": "..."}}]
}
`
    const systemPrompt = `You are an expert game recommender. Always output valid JSON matching the exact schema. NEVER use generic phrases like "Идеально подходит вашему профилю". YOU MUST RECOMMEND ONLY REAL, EXISTING, RELEASED GAMES ON STEAM. DO NOT INVENT OR FABRICATE GAME TITLES. YOU MUST GENERATE EXACTLY 10 UNIQUE GAMES in unexpected_discoveries. ${isRussian ? 'CRITICAL: The "gameName" field MUST BE IN ENGLISH (the exact original Steam title). The "reasoning" and "hardware_evaluation" fields MUST BE IN RUSSIAN (Русский язык). Do NOT translate game names.' : 'CRITICAL: The "gameName" field MUST BE IN ENGLISH (the exact original Steam title). The "reasoning" and "hardware_evaluation" fields MUST BE IN ENGLISH.'}`
    
    const response = await aiClient.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      responseFormat: 'json',
      temperature: 0.8,
      maxTokens: 12000,
      timeoutMs: 120000
    })
    
    try {
      fs.writeFileSync(path.join(os.homedir(), 'AppData', 'Roaming', 'gamemind-ai', 'logs', 'raw-ai.log'), response.content)
    } catch (e) {}
    
    const fallback = { top_matches: [], backlog: [], wishlist: [], unexpected_discoveries: [] }
    return safeParseJsonWithSchema(response.content, recommendationsSchema, fallback)
  }

  async validateAndScoreDiscoveries(aiData: any, localScored: any, context: any, mood?: string) {
    const existingNames = new Set([
      ...localScored.topMatches.map((g: any) => g.name.toLowerCase()),
      ...localScored.matchedBacklog.map((g: any) => g.name.toLowerCase()),
      ...localScored.matchedWishlist.map((g: any) => g.name.toLowerCase())
    ])
    const ownedNames = new Set(context.games.map((g: any) => g.name.toLowerCase()))

    if (aiData.unexpected_discoveries && Array.isArray(aiData.unexpected_discoveries)) {
      const uniqueDiscovery: any[] = []
      for (const game of aiData.unexpected_discoveries) {
        const lowerName = (game.gameName || '').toLowerCase().trim()
        if (!existingNames.has(lowerName) && !ownedNames.has(lowerName) && !context.isExcludedCandidate(game.appId, game.gameName)) {
          existingNames.add(lowerName)
          uniqueDiscovery.push(game)
        }
      }
      
      const validDiscoveries: any[] = []
      for (const game of uniqueDiscovery) {
        if (game.gameName) {
          if (context.isExcludedCandidate(game.appId, game.gameName)) continue
          const found = await steamApi.searchGameByName(game.gameName as string)
          await new Promise(r => setTimeout(r, 600)) // Prevent Steam Store API rate limit
          
          if (found && found.id) {
            game.appId = found.id
            game.gameName = found.name // Force official Steam name
            if (context.isExcludedCandidate(found.id, game.gameName)) continue
            validDiscoveries.push(game)
            if (validDiscoveries.length === 6) break 
          } else {
            logger.warn('RecommendationsCalculator', `Dropping hallucinated game: ${game.gameName}`)
          }
        }
      }
      
      if (validDiscoveries.length > 0) {
        try {
          const scoredDiscoveries = await localMatcher.getTopMatches(
            context.favorites,
            validDiscoveries.map(g => ({ appId: g.appId, name: g.gameName })),
            validDiscoveries.length,
            mood
          )
          
          for (const game of validDiscoveries) {
            const scored = scoredDiscoveries.find(s => s.appId === game.appId)
            if (scored) {
              game.score = scored.score
            }
          }
        } catch (err) {
          logger.error('RecommendationsCalculator', 'Failed to score store games', err)
        }
      }
      
      aiData.unexpected_discoveries = validDiscoveries
    }
    
    return aiData
  }

  async generateReasoningForGame(appId: number, gameName: string, languageCode: string) {
    const isRussian = languageCode === 'ru'
    const pcSpecs = await hardwareService.getSpecs()
    const context = await recommendationsDataProvider.getGenerationContext()

    const hardwareExamples = isRussian 
      ? '✅ Пойдет на высоких, ✅ Пойдет отлично, ⚠️ Возможны просадки' 
      : '✅ Runs on High, ✅ Runs Fine, ⚠️ Might struggle'

    const prompt = `
You are GameMind AI. Analyze this specific game against the user's Player DNA and PC specs.
Game: ${gameName} (AppID: ${appId})

User Persona: ${context.dnaSummary.persona}
User Traits: ${context.dnaTraits.map((t: any) => `${t.traitName} (${t.traitValue}%)`).join(', ')}
PC Specs: ${pcSpecs}

CRITICAL INSTRUCTIONS:
1. Provide a "summary" describing the game factually (1-2 sentences). Do not invent facts.
2. In "why", explain exactly why it fits the user's specific Player DNA. Be detailed and insightful. Do NOT use generic text like "Идеально подходит вашему профилю".
3. Provide a "dna_match" phrase (3-5 words) summarizing the vibe/match.
4. Evaluate PC specs in "hardware_evaluation" (${hardwareExamples}).
${isRussian ? '5. Write EVERYTHING in Russian (Русский язык).' : '5. Write EVERYTHING in English.'}

Output exactly this JSON format:
{
  "hardware_evaluation": "...",
  "reasoning": {
    "summary": "1 short sentence about the game",
    "why": "1 detailed sentence on why it fits the user DNA perfectly",
    "dna_match": "3-5 words summarizing the vibe/match",
    "features": "Comma-separated list of 3-4 key gameplay features"
  }
}
`
    const systemPrompt = `You are a highly specific game analyst. Return exactly valid JSON matching the schema. DO NOT use generic marketing text. Be honest and personal.`

    const response = await aiClient.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      responseFormat: 'json',
      temperature: 0.7,
      maxTokens: 3000
    })

    const fallback = {
      hardware_evaluation: isRussian ? '✅ Пойдет отлично' : '✅ Runs Fine',
      reasoning: { summary: gameName, why: isRussian ? 'Игра хорошо подходит вашему стилю.' : 'A good fit for your style.', dna_match: '100% Match', features: '' }
    }
    
    // Parse partial JSON to find reasoning object
    const schema = z.object({
      hardware_evaluation: z.any().transform(v => String(v || fallback.hardware_evaluation)),
      reasoning: z.object({
        summary: z.any().transform(v => String(v || fallback.reasoning.summary)),
        why: z.any().transform(v => String(v || fallback.reasoning.why)),
        dna_match: z.any().transform(v => String(v || fallback.reasoning.dna_match)),
        features: z.any().transform(v => Array.isArray(v) ? v.join(', ') : String(v || ''))
      }).passthrough().default(fallback.reasoning)
    }).passthrough()

    try {
      return safeParseJsonWithSchema(response.content, schema, fallback)
    } catch (e) {
      logger.error('RecommendationsCalculator', `generateReasoningForGame failed to parse JSON. Raw response: ${response.content}`)
      return fallback
    }
  }
}

export const recommendationsCalculator = new RecommendationsCalculator()
