import { achievementsRepository } from '../database/repository.factory'
import { steamApi } from './steam/steam-api.client'
import { logger } from '../logger/logger'

export class AchievementsService {
  public async getShowcaseAchievements(): Promise<any[]> {
    let recents = achievementsRepository.getRecentAchievements(12)
    
    // Find apps that need schema updates
    const missingSchemaAppIds = new Set<number>()
    for (const ach of recents) {
      if (!ach.display_name) {
        missingSchemaAppIds.add(ach.app_id)
      }
    }
    
    if (missingSchemaAppIds.size > 0) {
      logger.info('AchievementsService', `Fetching achievement schema for apps: ${Array.from(missingSchemaAppIds).join(', ')}`)
      for (const appId of missingSchemaAppIds) {
        try {
          const schema = await steamApi.getSchemaForGame(appId)
          if (schema && schema.length > 0) {
            achievementsRepository.updateAchievementSchema(appId, schema)
          }
        } catch (err) {
          logger.error('AchievementsService', `Failed to fetch schema for ${appId}`, err)
        }
      }
      // Refresh list after updating schema
      recents = achievementsRepository.getRecentAchievements(6)
    }
    
    return recents
  }
}

export const achievementsService = new AchievementsService()
