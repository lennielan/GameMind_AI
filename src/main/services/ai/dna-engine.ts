import { logger } from '../../logger/logger'
import { configManager } from '../../config/config-manager'
import { gamesRepository } from '../../database/repositories/games.repository'
import { userProfileRepository } from '../../database/repositories/user-profile.repository'
import { playerDnaRepository, PlayerDnaSummary, PlayerDnaTrait } from '../../database/repositories/player-dna.repository'
import { aiClient } from './ai.client'

export class DnaEngine {
  async generateDna(): Promise<boolean> {
    logger.info('DnaEngine', 'Starting Player DNA generation')
    
    const profile = userProfileRepository.getProfile()
    if (!profile) {
      throw new Error('No user profile found. Please sync your Steam account first.')
    }

    const games = gamesRepository.getAllGames()
    if (!games || games.length === 0) {
      throw new Error('No games found in the library. Please sync your Steam account first.')
    }

    // Filter to top 50 games by playtime to avoid token limits
    const topGames = games
      .filter(g => g.playtimeForever > 0)
      .sort((a, b) => b.playtimeForever - a.playtimeForever)
      .slice(0, 50)
      .map(g => ({
        name: g.name,
        playtimeHours: Math.round(g.playtimeForever / 60),
        genres: g.genres,
        tags: g.tags,
        metacritic: g.metacriticScore
      }))

    if (topGames.length === 0) {
      throw new Error('You have 0 hours of playtime. We need some data to analyze your DNA!')
    }
    const language = configManager.get('language') || 'en'
    const isRussian = language === 'ru'
    
    const langInstruction = isRussian
      ? '\nIMPORTANT: All text fields (persona, description, playstyle, traitName, reasoning) MUST be written in Russian.'
      : ''

    const schemaTemplate = isRussian ? `{
  "persona": "Яркое название архетипа на русском (например, 'Уютный исследователь', 'Хардкорный тактик')",
  "description": "2-3 предложения на РУССКОМ ЯЗЫКЕ, описывающие стиль игры.",
  "topGenres": ["Жанр1", "Жанр2", "Жанр3"],
  "playstyle": "Короткая фраза на русском, описывающая стиль",
  "traits": [
    {
      "traitName": "Название черты на русском (например, 'Соревновательность', 'Терпение')",
      "traitValue": <число от 0 до 100>,
      "confidence": <число от 0 до 1>,
      "reasoning": "1 предложение на РУССКОМ, объясняющее почему."
    }
  ]
}` : `{
  "persona": "A catchy, 2-4 word title for their gamer archetype (e.g. 'Cozy Explorer', 'Hardcore Competitive Tactician')",
  "description": "A 2-3 sentence engaging description of their gaming style based on the games they love.",
  "topGenres": ["Genre1", "Genre2", "Genre3"],
  "playstyle": "A short phrase describing their playstyle",
  "traits": [
    {
      "traitName": "Name of the trait (e.g. 'Competitiveness', 'Patience', 'Story Focus')",
      "traitValue": <number from 0 to 100>,
      "confidence": <number from 0 to 1>,
      "reasoning": "1 sentence explanation of why they have this trait based on their playtime."
    }
  ]
}`

    const prompt = `
You are GameMind AI, an expert psychological and behavioral gamer profiler. 
I will provide you with a JSON list of the top 50 most played games of a user on Steam.
Analyze their genres, tags, and playtimes to deduce their "Player DNA".
${langInstruction}

Please return a JSON object with exactly this schema:
${schemaTemplate}

User's Top Games:
${JSON.stringify(topGames, null, 2)}
`

    try {
      let aiData: any

      try {
        const systemPrompt = `You are an expert gaming behavioral analyst. Always output valid JSON matching the requested schema.${isRussian ? ' ALL GENERATED TEXT MUST BE IN RUSSIAN (Русский язык).' : ''}`
        
        const response = await aiClient.generate({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          responseFormat: 'json',
          maxTokens: 1500
        })
        aiData = JSON.parse(response.content)
      } catch (apiError: any) {
        throw new Error(`Failed to generate DNA: ${apiError.message}`)
      }
      
      const generatedAt = Date.now()
      const aiProvider = 'openai'

      const summary: PlayerDnaSummary = {
        steamId: profile.steamId,
        persona: aiData.persona,
        description: aiData.description,
        topGenres: aiData.topGenres,
        playstyle: aiData.playstyle,
        generatedAt,
        aiProvider
      }

      const traits: Omit<PlayerDnaTrait, 'id'>[] = aiData.traits.map((t: any) => ({
        steamId: profile.steamId,
        traitName: t.traitName,
        traitValue: t.traitValue,
        confidence: t.confidence,
        reasoning: t.reasoning,
        generatedAt,
        aiProvider
      }))

      playerDnaRepository.saveSummary(summary)
      playerDnaRepository.saveTraits(traits)

      // Upload to Cloud (Supabase) if authenticated
      try {
        const { cloudSyncService } = await import('../cloud-sync.service')
        await cloudSyncService.upsertProfile()
      } catch (cloudError) {
        logger.warn('DnaEngine', 'Cloud sync failed, continuing locally', cloudError)
      }

      logger.info('DnaEngine', 'Player DNA successfully generated and saved')
      return true
    } catch (error) {
      logger.error('DnaEngine', 'Failed to generate DNA', error)
      throw error
    }
  }

  getDna() {
    const profile = userProfileRepository.getProfile()
    if (!profile) return null

    const summary = playerDnaRepository.getSummary(profile.steamId)
    if (!summary) return null

    const traits = playerDnaRepository.getTraits(profile.steamId)
    return { summary, traits }
  }
}

export const dnaEngine = new DnaEngine()
