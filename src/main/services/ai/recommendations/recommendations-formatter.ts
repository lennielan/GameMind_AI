import { z } from 'zod'

export const reasoningSchema = z.object({
  summary: z.string().default(''),
  why: z.string().default(''),
  dna_match: z.string().default(''),
  features: z.string().default('')
})

export const recSchema = z.object({
  appId: z.coerce.number().nullable().optional(),
  gameName: z.string().default('Unknown Game'),
  reasoning: z.union([z.string(), reasoningSchema]),
  score: z.coerce.number().default(0),
  hardware_evaluation: z.string().default('')
}).passthrough()

export const recommendationsSchema = z.object({
  unexpected_discoveries: z.array(recSchema).default([]),
  local_reasoning: z.record(z.string(), reasoningSchema).optional()
}).passthrough()
import { configManager } from '../../../config/config-manager'
import { gameHardwareEvaluator } from './hardware-evaluator'

export class RecommendationsFormatter {
  buildFinalPayload(topMatches: any[], matchedBacklog: any[], matchedWishlist: any[], aiData: any, pcSpecs: string) {
    const isRussian = configManager.get('language') === 'ru'
    
    const getReasoning = (gameName: string, defaultDesc: string) => {
      const lowerName = gameName.toLowerCase()
      
      let aiRes = null
      if (aiData.local_reasoning) {
        // Try exact match first
        if (aiData.local_reasoning[gameName]) {
          aiRes = aiData.local_reasoning[gameName]
        } else {
          // Try case insensitive match
          for (const key in aiData.local_reasoning) {
            if (key.toLowerCase() === lowerName) {
              aiRes = aiData.local_reasoning[key]
              break
            }
          }
        }
      }
      
      if (aiRes) {
        return {
          summary: aiRes.summary || defaultDesc || (isRussian ? 'В вашей библиотеке' : 'In your library'),
          why: aiRes.why || '',
          dna_match: aiRes.dna_match || '',
          features: aiRes.features || ''
        }
      }
      
      return { 
        summary: defaultDesc || (isRussian ? 'В вашей библиотеке' : 'In your library'), 
        why: '', 
        dna_match: '', 
        features: '' 
      }
    }

    const mapLocal = (list: any[]) => list.map(orig => ({
      ...orig,
      gameName: orig.name,
      reasoning: getReasoning(orig.name, orig.shortDescription || orig.description),
      hardware_evaluation: gameHardwareEvaluator.evaluate(orig, pcSpecs)
    }))

    return {
      finalTopMatches: mapLocal(topMatches),
      finalBacklog: mapLocal(matchedBacklog),
      finalWishlist: mapLocal(matchedWishlist),
      unexpectedDiscoveries: aiData.unexpected_discoveries || []
    }
  }
}

export const recommendationsFormatter = new RecommendationsFormatter()
