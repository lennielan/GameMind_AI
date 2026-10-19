import { logger } from '../../logger/logger'
import { recommendationsDataProvider } from './recommendations/recommendations-data.provider'
import { recommendationsCalculator } from './recommendations/recommendations-calculator'
import { recommendationsFormatter } from './recommendations/recommendations-formatter'
import { hardwareService } from '../hardware.service'

export class RecommendationsEngine {
  async generateRecommendations(mood?: string): Promise<boolean> {
    logger.info('RecommendationsEngine', `Starting AI Recommendations generation. Mood: ${mood || 'none'}`)
    
    try {
      // 1. Gather all required data
      const context = await recommendationsDataProvider.getGenerationContext()
      const pcSpecs = await hardwareService.getSpecs()

      // 2. Score local candidates
      const localScored = await recommendationsCalculator.scoreLocalCandidates(
        context.favorites, 
        context.backlogCandidates, 
        context.wishlistCandidates, 
        mood
      )

      // 3. Generate AI insights & discoveries
      let aiData = await recommendationsCalculator.generateAiDiscoveries(context, localScored, mood)

      // 4. Validate and score AI discoveries
      aiData = await recommendationsCalculator.validateAndScoreDiscoveries(aiData, localScored, context, mood)

      const formatted = recommendationsFormatter.buildFinalPayload(
        localScored.topMatches,
        localScored.matchedBacklog,
        localScored.matchedWishlist,
        aiData,
        pcSpecs
      )

      // 6. Save back to Data Provider
      await recommendationsDataProvider.saveGeneratedRecommendations(
        context.profile.steamId,
        formatted.finalTopMatches,
        formatted.finalBacklog,
        formatted.finalWishlist,
        formatted.unexpectedDiscoveries
      )

      logger.info('RecommendationsEngine', 'Recommendations successfully generated and saved')
      return true
    } catch (error: any) {
      logger.error('RecommendationsEngine', 'Failed to generate recommendations', error)
      throw new Error(`Failed to generate recommendations: ${error.message}`)
    }
  }

  async getRecommendations() {
    const stored = await recommendationsDataProvider.getStoredRecommendations()
    if (!stored || (!stored.top_matches?.length && !stored.backlog?.length)) {
      try {
        const context = await recommendationsDataProvider.getGenerationContext()
        const pcSpecs = await hardwareService.getSpecs()
        const localScored = await recommendationsCalculator.scoreLocalCandidates(
          context.favorites, 
          context.backlogCandidates, 
          context.wishlistCandidates
        )
        const formatted = recommendationsFormatter.buildFinalPayload(
          localScored.topMatches,
          localScored.matchedBacklog,
          localScored.matchedWishlist,
          { unexpected_discoveries: [] },
          pcSpecs
        )
        await recommendationsDataProvider.saveGeneratedRecommendations(
          context.profile.steamId,
          formatted.finalTopMatches,
          formatted.finalBacklog,
          formatted.finalWishlist,
          []
        )
        return await recommendationsDataProvider.getStoredRecommendations()
      } catch (err) {
        logger.error('RecommendationsEngine', 'Failed instant local generation', err)
      }
    }
    return stored
  }

  async generateReasoning(appId: number, gameName: string, languageCode: string) {
    return await recommendationsCalculator.generateReasoningForGame(appId, gameName, languageCode)
  }
}

export const recommendationsEngine = new RecommendationsEngine()
