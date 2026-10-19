// ============================================================
// Milestone Engine (Legacy Adapter -> SteamDataProcessor)
// ============================================================

import { steamDataProcessor } from './steam-data.processor'
import type { TimelineEntry } from '@shared/types'

export class MilestoneEngine {
  public generateEntries(): TimelineEntry[] {
    return steamDataProcessor.extractRawTimelineData().allEntries
  }
}

export const milestoneEngine = new MilestoneEngine()
