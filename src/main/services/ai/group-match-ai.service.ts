import { aiClient } from './ai.client'
import { logger } from '../../logger/logger'
import { GroupMatchResult } from './group-match.engine'
import { configManager } from '../../config/config-manager'
import { UserProfile } from '../friends.service'

export interface GroupMatchAiResult {
  appId: number
  name: string
  aiExplanation: string
}

export class GroupMatchAiService {
  async generateExplanations(friends: UserProfile[], matchData: GroupMatchResult): Promise<GroupMatchAiResult[]> {
    if (matchData.topCandidates.length === 0) return []

    logger.info('GroupMatchAiService', `Generating AI explanations for ${matchData.topCandidates.length} group match candidates`)

    const language = configManager.get('language') || 'en'
    const isRussian = language === 'ru'
    const langInstruction = isRussian ? 'IMPORTANT: You MUST write the explanations in Russian (Русский язык).' : ''

    const promptData = {
      groupProfile: matchData.groupProfile,
      friends: friends.map(f => f.username),
      candidates: matchData.topCandidates.map(c => ({
        appId: c.appId,
        name: c.name,
        rawReason: c.reason,
        groupTotalHours: c.playtimeScore
      }))
    }

    const schemaTemplate = `[
  {
    "appId": 12345,
    "name": "Game Name",
    "aiExplanation": "A 2-sentence enthusiastic explanation of why this game is perfect for the group, mentioning their shared interests or veteran status."
  }
]`

    const prompt = `
You are the GameMind AI, an expert at finding the perfect multiplayer or co-op games for a group of friends.
I am providing you with a Group Profile (their aggregated genres) and the Top Candidate games found by our deterministic engine.

${langInstruction}

Group Data & Candidates:
${JSON.stringify(promptData, null, 2)}

For EACH candidate game, write an enthusiastic explanation of why it's a great fit for this specific group.

Respond ONLY with a JSON array matching this schema exactly:
${schemaTemplate}
`

    try {
      const response = await aiClient.generate({
        messages: [
          { role: 'system', content: 'You are an enthusiastic game recommender. Output strictly valid JSON array.' },
          { role: 'user', content: prompt }
        ],
        responseFormat: 'json',
        maxTokens: 4000
      })

      const { extractAndParseJSON } = await import('./json-utils')
      const aiData: GroupMatchAiResult[] = extractAndParseJSON(response.content)
      
      // Merge AI explanation back into candidates
      return matchData.topCandidates.map(c => {
        // try to find matching AI explanation by appId
        const aiMatch = aiData.find(a => String(a.appId) === String(c.appId) || (a.name && a.name.toLowerCase().includes(c.name.toLowerCase())))
        return {
          ...c,
          aiExplanation: aiMatch ? aiMatch.aiExplanation : `(AI Fallback) ${c.reason}`
        }
      })
    } catch (error) {
      logger.error('GroupMatchAiService', 'Failed to generate group match explanations', error)
      // Fallback: return raw reasons if AI fails
      return matchData.topCandidates.map(c => ({
        ...c,
        aiExplanation: `(AI Fallback) ${c.reason}`
      }))
    }
  }
}

export const groupMatchAiService = new GroupMatchAiService()
