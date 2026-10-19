import { badgesRepository } from '../database/repository.factory'
import { DEFAULT_BADGES, BADGE_THRESHOLDS } from '../../shared/config/badge.config'
import type { Badge, UserBadgeWithDetails } from '../../shared/types/badge.types'
import { logger } from '../logger/logger'
import { journalRepository } from '../database/repository.factory'

export class BadgesService {
  static seedBadges(): void {
    try {
      logger.info('BadgesService', 'Seeding default badges...')
      
      badgesRepository.cleanupDeprecatedBadges()

      for (const b of DEFAULT_BADGES) {
        const existing = badgesRepository.getBadgeByCode(b.code_name)
        if (!existing) {
          badgesRepository.createBadge({
            ...b,
            id: `badge_${b.code_name}`,
            created_at: Date.now()
          })
        }
      }
      logger.info('BadgesService', 'Badges seeded successfully')
    } catch (err) {
      logger.error('BadgesService', 'Failed to seed badges', err)
    }
  }

  static getAllBadges(): Badge[] {
    return badgesRepository.getAllBadges()
  }

  static getUserBadges(steamId: string): UserBadgeWithDetails[] {
    return badgesRepository.getUserBadges(steamId)
  }

  static grantBadge(steamId: string, badgeCode: string, grantedBy = 'system'): void {
    const badge = badgesRepository.getBadgeByCode(badgeCode)
    if (!badge) {
      throw new Error(`Badge with code '${badgeCode}' does not exist.`)
    }

    const existing = badgesRepository.getUserBadge(steamId, badgeCode)

    if (!existing) {
      badgesRepository.grantUserBadge(steamId, badgeCode, grantedBy, false)
      logger.info('BadgesService', `Granted badge '${badgeCode}' to user '${steamId}'`)
    }
  }

  static revokeBadge(steamId: string, badgeCode: string): void {
    badgesRepository.revokeUserBadge(steamId, badgeCode)
    logger.info('BadgesService', `Revoked badge '${badgeCode}' from user '${steamId}'`)
  }

  static toggleBadgeVisibility(steamId: string, badgeCode: string, isHidden: boolean): void {
    const existing = badgesRepository.getUserBadge(steamId, badgeCode)
    if (existing) {
      badgesRepository.updateUserBadgeVisibility(steamId, badgeCode, isHidden)
    } else {
      badgesRepository.grantUserBadge(steamId, badgeCode, 'system', isHidden)
    }
  }

  static updateBadgeTier(steamId: string, badgeCode: string, newTier: number): void {
    badgesRepository.updateUserBadgeTier(steamId, badgeCode, newTier)
  }

  static checkAutoBadges(steamId: string, triggerType: string, _data?: any): void {
    try {
      const currentBadges = this.getUserBadges(steamId).map(ub => ub.badge_code)
      const newBadges: string[] = []

      if (triggerType === 'startup') {
        if (!currentBadges.includes('pioneer')) {
          const userCount = journalRepository.getUserCount()
          if (userCount <= BADGE_THRESHOLDS.PIONEER_MAX_USERS) {
            newBadges.push('pioneer')
          }
        }
      }

      for (const code of newBadges) {
        this.grantBadge(steamId, code, 'auto_trigger')
      }
    } catch (err) {
      logger.error('BadgesService', `Error checking auto badges for ${steamId}`, err)
    }
  }
}
