// ============================================================
// Timeline Service — Orchestrator, LLM Pipeline & Persistence
// ============================================================

import { logger } from '../../logger/logger'
import { configManager } from '../../config/config-manager'
import { steamDataProcessor } from './steam-data.processor'
import { timelinePromptBuilder } from './timeline-prompt.builder'
import { timelineAiPayloadSchema, type TimelineAiPayload } from './timeline.schema'
import { 
  timelineEntryRepository, 
  playerDnaRepository, 
  userProfileRepository 
} from '../../database/repository.factory'
import { aiClient } from '../ai/ai.client'
import type { TimelineEntry } from '@shared/types'

export class TimelineService {
  private isGenerating = false

  public async generateTimeline(): Promise<TimelineEntry[]> {
    if (this.isGenerating) {
      logger.warn('TimelineService', 'Timeline generation already in progress. Returning cached entries.')
      return timelineEntryRepository.getEntries()
    }
    this.isGenerating = true

    // 1. Data Preprocessing & Sanitization (Local Deterministic Stage)
    const rawData = steamDataProcessor.extractRawTimelineData()
    if (rawData.allEntries.length === 0) {
      this.isGenerating = false
      return []
    }

    try {
      logger.info('TimelineService', 'Starting AI Timeline Chronicle generation...')

      // 2. Fetch Player DNA & Persona Context
      const profile = userProfileRepository.getProfile()
      const dnaSummary = profile ? playerDnaRepository.getSummary(profile.steamId) : null
      const persona = dnaSummary?.persona || 'an explorer of gaming worlds'
      const traits = dnaSummary?.traits || []

      const targetLanguage: 'ru' | 'en' = (configManager.get('language') || 'en') === 'ru' ? 'ru' : 'en'

      // 3. Build Structured AI Prompts
      const systemPrompt = timelinePromptBuilder.buildSystemPrompt(targetLanguage)
      const userPrompt = timelinePromptBuilder.buildUserPrompt({
        persona,
        traits,
        epochs: rawData.epochs,
        definingGames: rawData.definingGames,
        language: targetLanguage
      })

      // 4. Invoke LLM with JSON format
      logger.info('TimelineService', `Dispatching to AI Client (Language: ${targetLanguage})...`)
      const aiResponse = await aiClient.generate({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        responseFormat: 'json',
        maxTokens: 6000
      })

      // 5. Parse & Validate with Zod
      const parsedAiData = this.safeParseAiResponse(aiResponse.content)

      // 6. Merge AI Interpretations into Entries
      const finalEntries = this.mergeAiDataIntoEntries(rawData.allEntries, parsedAiData, targetLanguage)

      // 7. Persist to Database
      timelineEntryRepository.clearEntries()
      timelineEntryRepository.saveEntries(finalEntries)

      logger.info('TimelineService', `Successfully generated & saved ${finalEntries.length} timeline entries.`)
      return finalEntries

    } catch (error: any) {
      logger.error('TimelineService', 'Failed during AI Timeline generation, saving raw heuristic entries', error)
      timelineEntryRepository.clearEntries()
      timelineEntryRepository.saveEntries(rawData.allEntries)
      return rawData.allEntries
    } finally {
      this.isGenerating = false
    }
  }

  public getTimeline(): TimelineEntry[] {
    return timelineEntryRepository.getEntries()
  }

  private safeParseAiResponse(content: string): TimelineAiPayload {
    try {
      let cleanContent = content.replace(/^\s*```(json)?/im, '').replace(/```\s*$/m, '').trim()
      
      // Strict UTF-8 Sanitization & Normalization
      cleanContent = cleanContent
        .normalize('NFC') // Normalize unicode composition
        .replace(/\uFFFD/g, '') // Remove replacement characters (invalid UTF-8 bytes)
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // Remove unprintable control chars that break JSON
        
      const rawJson = JSON.parse(cleanContent)
      const parseResult = timelineAiPayloadSchema.safeParse(rawJson)

      if (parseResult.success) {
        return parseResult.data
      }

      logger.warn('TimelineService', 'Zod validation issue on AI response, using safe deterministic fallback', parseResult.error)
      // Strict graceful fallback: return empty AI payload to just use deterministic entries
      return {
        epochs: [],
        milestones: [],
        legacy: {
          id: 'legacy-conclusion-fixed-id',
          narrative: '',
          futurePrediction: '',
          confidence: 'low'
        }
      }
    } catch (e) {
      logger.error('TimelineService', 'Failed to parse AI response JSON', e)
      return {
        epochs: [],
        milestones: [],
        legacy: {
          id: 'legacy-conclusion-fixed-id',
          narrative: '',
          futurePrediction: '',
          confidence: 'low'
        }
      }
    }
  }

  private mergeAiDataIntoEntries(
    entries: TimelineEntry[],
    aiData: TimelineAiPayload,
    language: 'ru' | 'en'
  ): TimelineEntry[] {
    const epochMap = new Map<string, any>()
    for (const ep of aiData.epochs) {
      epochMap.set(ep.id, ep)
    }

    const milestoneMap = new Map<string, any>()
    for (const ms of aiData.milestones) {
      milestoneMap.set(ms.id, ms)
    }

    for (const entry of entries) {
      if (entry.type === 'era_summary') {
        const epAi = epochMap.get(entry.id)
        if (epAi) {
          if (epAi.epochTitle) {
            entry.title = epAi.epochTitle
          }
          entry.aiInterpretation = {
            narrative: epAi.narrative,
            confidence: epAi.confidence
          }
        }
      } else if (entry.type === 'defining_game') {
        const msAi = milestoneMap.get(entry.id)
        if (msAi) {
          entry.aiInterpretation = {
            narrative: msAi.narrative,
            alternateHistoryHypothesis: msAi.alternateHistoryHypothesis,
            confidence: msAi.confidence
          }
        }
      } else if (entry.type === 'legacy_conclusion') {
        if (aiData.legacy) {
          entry.title = language === 'ru' ? 'Ваше геймерское наследие' : 'Your Gaming Legacy'
          entry.aiInterpretation = {
            narrative: aiData.legacy.narrative,
            futurePrediction: aiData.legacy.futurePrediction,
            confidence: aiData.legacy.confidence
          }
        }
      }
    }

    return entries
  }
}

export const timelineService = new TimelineService()
