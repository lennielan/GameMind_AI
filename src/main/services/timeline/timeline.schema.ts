// ============================================================
// Timeline AI Schemas — Zod Structured Output Validation
// ============================================================

import { z } from 'zod'

export const timelineEpochAiSchema = z.object({
  id: z.string(),
  epochTitle: z.string().default(''),
  narrative: z.string().default(''),
  confidence: z.enum(['low', 'medium', 'high']).default('high')
})

export type TimelineEpochAi = z.infer<typeof timelineEpochAiSchema>

export const timelineMilestoneAiSchema = z.object({
  id: z.string(),
  narrative: z.string().default(''),
  alternateHistoryHypothesis: z.string().default(''),
  confidence: z.enum(['low', 'medium', 'high']).default('high')
})

export type TimelineMilestoneAi = z.infer<typeof timelineMilestoneAiSchema>

export const timelineLegacyAiSchema = z.object({
  id: z.string().default('legacy-conclusion-fixed-id'),
  narrative: z.string().default(''),
  futurePrediction: z.string().default(''),
  confidence: z.enum(['low', 'medium', 'high']).default('high')
})

export type TimelineLegacyAi = z.infer<typeof timelineLegacyAiSchema>

export const timelineAiPayloadSchema = z.object({
  epochs: z.array(timelineEpochAiSchema).default([]),
  milestones: z.array(timelineMilestoneAiSchema).default([]),
  legacy: timelineLegacyAiSchema.default({
    id: 'legacy-conclusion-fixed-id',
    narrative: '',
    futurePrediction: '',
    confidence: 'high'
  })
})

export type TimelineAiPayload = z.infer<typeof timelineAiPayloadSchema>
