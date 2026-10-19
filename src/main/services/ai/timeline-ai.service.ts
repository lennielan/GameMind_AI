// ============================================================
// Timeline AI Service (Adapter layer for IPC calls)
// ============================================================

import { timelineService } from '../timeline/timeline.service'
import type { TimelineEntry } from '@shared/types'

export class TimelineAiService {
  public async generateTimelineNarratives(): Promise<TimelineEntry[]> {
    return await timelineService.generateTimeline()
  }

  public getTimeline(): TimelineEntry[] {
    return timelineService.getTimeline()
  }
}

export const timelineAiService = new TimelineAiService()
