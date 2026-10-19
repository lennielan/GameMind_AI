import { queryAll, queryOne, execute } from '../database'
import type { Badge, UserBadgeWithDetails } from '../../../shared/types/badge.types'

export class BadgesRepository {
  cleanupDeprecatedBadges(): void {
    execute("DELETE FROM user_badges WHERE badge_code IN ('early_supporter', 'founder', 'boss_badge')")
    execute("DELETE FROM badges WHERE code_name IN ('early_supporter', 'founder', 'boss_badge')")
    execute("UPDATE user_badges SET is_hidden = 0 WHERE badge_code = 'boss'")
    execute("UPDATE badges SET icon = 'LegendIcon' WHERE code_name = 'legend'")
    execute("UPDATE badges SET icon = 'Gem' WHERE icon = 'Sparkles'")
  }

  getBadgeByCode(code: string): Badge | null {
    return queryOne<Badge>('SELECT * FROM badges WHERE code_name = ?', [code])
  }

  createBadge(badge: Badge): void {
    execute(
      `INSERT INTO badges (id, code_name, name_key, desc_key, icon, color, acquisition_type, category, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `badge_${badge.code_name}`,
        badge.code_name,
        badge.name_key,
        badge.desc_key,
        badge.icon,
        badge.color,
        badge.acquisition_type,
        badge.category,
        badge.sort_order,
        badge.created_at || Date.now()
      ]
    )
  }

  getAllBadges(): Badge[] {
    return queryAll<Badge>('SELECT * FROM badges WHERE code_name != \'early_supporter\' ORDER BY sort_order DESC, created_at ASC')
  }

  getUserBadges(steamId: string): UserBadgeWithDetails[] {
    const rows = queryAll<any>(
      `SELECT ub.*, b.id as badge_id, b.code_name, b.name_key, b.desc_key, b.icon, b.color, 
              b.acquisition_type, b.category, b.sort_order, b.created_at as badge_created_at
       FROM user_badges ub
       JOIN badges b ON ub.badge_code = b.code_name
       WHERE ub.steam_id = ?
       ORDER BY b.sort_order DESC`,
      [steamId]
    )

    return rows.map(r => ({
      id: r.id,
      steam_id: r.steam_id,
      badge_code: r.badge_code,
      is_hidden: Boolean(r.is_hidden),
      granted_by: r.granted_by,
      granted_at: r.granted_at,
      badge: {
        id: r.badge_id,
        code_name: r.code_name,
        name_key: r.name_key,
        desc_key: r.desc_key,
        icon: r.icon,
        color: r.color,
        acquisition_type: r.acquisition_type,
        category: r.category,
        sort_order: r.sort_order,
        created_at: r.badge_created_at
      }
    }))
  }

  getUserBadge(steamId: string, badgeCode: string): any | null {
    return queryOne<any>('SELECT id FROM user_badges WHERE steam_id = ? AND badge_code = ?', [steamId, badgeCode])
  }

  grantUserBadge(steamId: string, badgeCode: string, grantedBy: string, isHidden: boolean = false): void {
    execute(
      `INSERT INTO user_badges (steam_id, badge_code, is_hidden, granted_by, granted_at)
       VALUES (?, ?, ?, ?, ?)`,
      [steamId, badgeCode, isHidden ? 1 : 0, grantedBy, Date.now()]
    )
  }

  revokeUserBadge(steamId: string, badgeCode: string): void {
    execute('DELETE FROM user_badges WHERE steam_id = ? AND badge_code = ?', [steamId, badgeCode])
  }

  updateUserBadgeVisibility(steamId: string, badgeCode: string, isHidden: boolean): void {
    execute('UPDATE user_badges SET is_hidden = ? WHERE steam_id = ? AND badge_code = ?', [
      isHidden ? 1 : 0,
      steamId,
      badgeCode
    ])
  }

  updateUserBadgeTier(steamId: string, badgeCode: string, newTier: number): void {
    execute('UPDATE user_badges SET current_tier = ? WHERE steam_id = ? AND badge_code = ?', [
      newTier,
      steamId,
      badgeCode
    ])
  }
}
