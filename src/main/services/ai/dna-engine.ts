import { logger } from '../../logger/logger'
import { configManager } from '../../config/config-manager'
import { gamesRepository } from '../../database/repository.factory'
import { userProfileRepository } from '../../database/repository.factory'
import { playerDnaRepository, PlayerDnaSummary, PlayerDnaTrait } from '../../database/repository.factory'
import { aiClient } from './ai.client'

// The 4 fixed axes for Player DNA traits
export const FIXED_AXES = [
  { axis: 'Story vs Gameplay', leftLabel: 'Story', rightLabel: 'Gameplay' },
  { axis: 'Relax vs Hardcore', leftLabel: 'Relax', rightLabel: 'Hardcore' },
  { axis: 'Solo vs Social', leftLabel: 'Solo', rightLabel: 'Social' },
  { axis: 'Reflex vs Tactics', leftLabel: 'Reflex', rightLabel: 'Tactics' }
]

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

    // Filter to top 60 games by playtime to give the AI a deep backlog analysis
    // Use logarithmic dampening so that 3000hr multiplayer games
    // don't completely overshadow 40hr singleplayer gems
    const topGames = games
      .filter(g => g.playtimeForever > 0)
      .sort((a, b) => b.playtimeForever - a.playtimeForever)
      .slice(0, 60)
      .map(g => {
        const blacklist = ['Mixed', 'Positive', 'Negative', 'Overwhelmingly Positive', 'Mostly Positive', 'Mostly Negative', 'Very Positive', 'Very Negative', 'Overwhelmingly Negative', 'Profile Features Limited'];
        
        const filteredGenres = Array.isArray(g.genres) ? g.genres.filter(gen => !blacklist.includes(gen)).slice(0, 5) : [];
        const filteredTags = Array.isArray(g.tags) ? g.tags.filter(tag => !blacklist.includes(tag)).slice(0, 5) : [];

        let completionRate = undefined;
        if (g.totalAchievements && g.totalAchievements > 0) {
          completionRate = Math.round(((g.unlockedAchievements || 0) / g.totalAchievements) * 100);
        }

        return {
          name: g.name,
          playtimeHours: Math.round(g.playtimeForever / 60),
          logWeight: Math.round(Math.log10(g.playtimeForever / 60 + 1) * 100) / 100,
          genres: filteredGenres,
          tags: filteredTags,
          completion: completionRate !== undefined ? `${completionRate}%` : undefined,
          recentlyPlayed: g.playtime2Weeks > 0
        };
      })

    // Identify abandoned games for Anti-DNA context
    const abandonedGames = games
      .filter(g => g.playtimeForever > 0 && g.playtimeForever < 120)
      .slice(0, 10)
      .map(g => ({
        name: g.name,
        playtimeMinutes: g.playtimeForever,
        genres: Array.isArray(g.genres) ? g.genres.slice(0, 3) : [],
        tags: Array.isArray(g.tags) ? g.tags.slice(0, 3) : []
      }))

    if (topGames.length === 0) {
      throw new Error('You have 0 hours of playtime. We need some data to analyze your DNA!')
    }
    const language = configManager.get('language') || 'en'
    const isRussian = language === 'ru'
    
    const langInstruction = isRussian
      ? '\nIMPORTANT: All text fields (persona, description, playstyle, reasoning) MUST be written in Russian.'
      : ''

    const axesDescription = isRussian
      ? `Оцени пользователя по следующим 4 шкалам (от 0 до 100):
  1. "Сюжет vs Геймплей" — 0 = чисто сюжетные игры, 100 = чистый геймплей без истории
  2. "Релакс vs Хардкор" — 0 = максимально расслабляющие игры, 100 = максимально сложные и требовательные
  3. "Соло vs Социум" — 0 = только одиночные игры, 100 = только мультиплеерные
  4. "Рефлексы vs Тактика" — 0 = реакция и скорость рук (шутеры, экшены), 100 = стратегическое мышление`
      : `Evaluate the user on these 4 fixed scales (0 to 100):
  1. "Story vs Gameplay" — 0 = pure story-driven, 100 = pure gameplay focus
  2. "Relax vs Hardcore" — 0 = maximum chill/cozy, 100 = maximum challenge/difficulty
  3. "Solo vs Social" — 0 = exclusively singleplayer, 100 = exclusively multiplayer
  4. "Reflex vs Tactics" — 0 = reaction speed & twitch (FPS, action), 100 = strategic thinking`

    const antiDnaContext = abandonedGames.length > 0
      ? `\n\nABANDONED GAMES (player tried but quit under 2 hours — consider these as "disliked" patterns):
${JSON.stringify(abandonedGames)}`
      : ''

    const categories = {
      story: ['story rich', 'narrative', 'choices matter', 'visual novel', 'cinematic', 'lore-rich', 'interactive fiction', 'rpg', 'crpg', 'jrpg'],
      gameplay: ['action', 'arcade', 'shooter', 'platformer', 'hack and slash', 'fast-paced', "beat 'em up", 'sports', 'racing', 'fighting'],
      relax: ['relaxing', 'casual', 'cozy', 'walking simulator', 'family friendly', 'farming sim', 'life sim', 'nature', 'sandbox', 'building', 'city builder'],
      hardcore: ['difficult', 'souls-like', 'permadeath', 'competitive', 'hardcore', 'dark souls', 'rogue-like', 'rogue-lite', 'survival', 'horror'],
      solo: ['singleplayer', 'single-player'],
      social: ['multiplayer', 'multi-player', 'co-op', 'mmo', 'online pvp', 'pvp', 'team-based', 'massively multiplayer', 'split screen'],
      reflex: ['fast-paced', 'twitch shooter', 'bullet hell', 'hack and slash', 'rhythm', 'fighting', 'fps', 'action', 'arcade'],
      tactics: ['strategy', 'turn-based', 'tactical', 'grand strategy', 'puzzle', 'crpg', 'management', 'rts', 'city builder', 'card game', 'board game']
    }

    const scores = { story: 0, gameplay: 0, relax: 0, hardcore: 0, solo: 0, social: 0, reflex: 0, tactics: 0 }

    for (const game of topGames) {
      const allTags = [...(game.genres || []), ...(game.tags || [])].map(t => t.toLowerCase())
      for (const tag of allTags) {
        if (categories.story.includes(tag)) scores.story += game.logWeight
        if (categories.gameplay.includes(tag)) scores.gameplay += game.logWeight
        if (categories.relax.includes(tag)) scores.relax += game.logWeight
        if (categories.hardcore.includes(tag)) scores.hardcore += game.logWeight
        if (categories.solo.includes(tag)) scores.solo += game.logWeight
        if (categories.social.includes(tag)) scores.social += game.logWeight
        if (categories.reflex.includes(tag)) scores.reflex += game.logWeight
        if (categories.tactics.includes(tag)) scores.tactics += game.logWeight
      }
    }

    const calculateAxis = (left: number, right: number) => {
      if (left === 0 && right === 0) return 50
      return Math.round((right / (left + right)) * 100)
    }

    const axisScores = {
      storyVsGameplay: calculateAxis(scores.story, scores.gameplay),
      relaxVsHardcore: calculateAxis(scores.relax, scores.hardcore),
      soloVsSocial: calculateAxis(scores.solo, scores.social),
      reflexVsTactics: calculateAxis(scores.reflex, scores.tactics)
    }

    const schemaTemplate = isRussian ? `{
  "persona": "Яркое название архетипа на русском (например, 'Уютный исследователь', 'Хардкорный тактик')",
  "description": "2-3 предложения на РУССКОМ ЯЗЫКЕ, описывающие стиль игры.",
  "topGenres": ["Жанр1", "Жанр2", "Жанр3"],
  "playstyle": "Короткая фраза на русском, описывающая стиль",
  "traits": [
    {
      "traitName": "Сюжет vs Геймплей",
      "traitValue": ${axisScores.storyVsGameplay},
      "confidence": 0.85,
      "reasoning": "1 предложение на РУССКОМ, объясняющее почему (обратите внимание на значение)."
    },
    {
      "traitName": "Релакс vs Хардкор",
      "traitValue": ${axisScores.relaxVsHardcore},
      "confidence": 0.90,
      "reasoning": "1 предложение на РУССКОМ, объясняющее почему (обратите внимание на значение)."
    },
    {
      "traitName": "Соло vs Социум",
      "traitValue": ${axisScores.soloVsSocial},
      "confidence": 0.88,
      "reasoning": "1 предложение на РУССКОМ, объясняющее почему (обратите внимание на значение)."
    },
    {
      "traitName": "Рефлексы vs Тактика",
      "traitValue": ${axisScores.reflexVsTactics},
      "confidence": 0.95,
      "reasoning": "1 предложение на РУССКОМ, объясняющее почему (обратите внимание на значение)."
    }
  ]
}` : `{
  "persona": "A catchy, 2-4 word title for their gamer archetype (e.g. 'Cozy Explorer', 'Hardcore Competitive Tactician')",
  "description": "A 2-3 sentence engaging description of their gaming style based on the games they love.",
  "topGenres": ["Genre1", "Genre2", "Genre3"],
  "playstyle": "A short phrase describing their playstyle",
  "traits": [
    {
      "traitName": "Story vs Gameplay",
      "traitValue": ${axisScores.storyVsGameplay},
      "confidence": 0.85,
      "reasoning": "1 sentence explanation (pay attention to the value provided)."
    },
    {
      "traitName": "Relax vs Hardcore",
      "traitValue": ${axisScores.relaxVsHardcore},
      "confidence": 0.90,
      "reasoning": "1 sentence explanation (pay attention to the value provided)."
    },
    {
      "traitName": "Solo vs Social",
      "traitValue": ${axisScores.soloVsSocial},
      "confidence": 0.88,
      "reasoning": "1 sentence explanation (pay attention to the value provided)."
    },
    {
      "traitName": "Reflex vs Tactics",
      "traitValue": ${axisScores.reflexVsTactics},
      "confidence": 0.95,
      "reasoning": "1 sentence explanation (pay attention to the value provided)."
    }
  ]
}`

    const prompt = `
You are GameMind AI, an expert psychological and behavioral gamer profiler. 
I will provide you with a JSON list of the top 60 most played games of a user on Steam.
Each game has a "logWeight" that represents how important it is (logarithmic, to avoid 3000hr multiplayer games dominating 40hr singleplayer gems).
Games marked "recentlyPlayed: true" represent the user's CURRENT interests and should be weighted more.
Games also include a "completion" percentage (based on achievements). High completion (80-100%) strongly indicates a 'Hardcore' completionist, while low completion points to 'Relaxed' or casual play.
Analyze their genres, tags, playtimes, completion rates, and the logWeight to deduce their "Player DNA".
${langInstruction}

${axesDescription}
${antiDnaContext}

IMPORTANT: Generate EXACTLY 4 traits matching the 4 scales above. No more, no less.

Please return a JSON object with exactly this schema:
${schemaTemplate}

User's Top Games:
${JSON.stringify(topGames)}
`

    try {
      let aiData: any

      try {
        const systemPrompt = `You are an expert gaming behavioral analyst. Always output valid JSON matching the requested schema.${isRussian ? ' ALL GENERATED TEXT MUST BE IN RUSSIAN (Русский язык).' : ''} Generate exactly 4 traits on the fixed scales provided. Be analytical and precise. The user's trait scores have already been calculated and provided in the traitValue fields of the template. DO NOT change those traitValue numbers. Factor in their achievement completion rates when generating descriptions.`
        
        const response = await aiClient.generate({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          responseFormat: 'json',
          maxTokens: 5000
        })
        
        const { extractAndParseJSON } = await import('./json-utils')
        try {
          aiData = extractAndParseJSON(response.content)
          if (!aiData || !aiData.persona) {
            throw new Error('Invalid JSON format received from AI.')
          }
        } catch (e) {
          logger.error('DnaEngine', 'Failed to parse JSON', e)
          throw new Error(isRussian ? 'Не удалось сгенерировать точное описание.' : 'Could not generate detailed description.')
        }
      } catch (apiError: any) {
        throw new Error(apiError.message || (isRussian ? 'Не удалось сгенерировать точное описание.' : 'Could not generate detailed description.'))
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
