import { execute, queryAll } from '../database'

export class AchievementsRepository {
  upsertAchievements(appId: number, achievements: any[]): void {
    if (!achievements || achievements.length === 0) return

    // achievements from Steam look like: { apiname: "ACH_1", achieved: 1, unlocktime: 1782864000 }
    achievements.forEach(ach => {
      // Only insert unlocked ones that have an unlocktime, or just insert them all?
      // Since we just need the count of unlocked, we can insert achieved=1
      if (ach.achieved === 1) {
        execute(
          `INSERT INTO achievements (app_id, api_name, achieved, unlock_time)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(app_id, api_name) DO UPDATE SET 
             achieved = excluded.achieved, 
             unlock_time = excluded.unlock_time`,
          [
            appId,
            ach.apiname,
            ach.achieved,
            ach.unlocktime || null
          ]
        )
      }
    })
  }

  // Not strictly needed right now, but good to have if we want to reset privacy issues
  resetAchievementsForGame(appId: number): void {
    execute('DELETE FROM achievements WHERE app_id = ?', [appId])
  }

  getRecentAchievements(limit: number = 6): any[] {
    return queryAll(
      `SELECT a.*, g.name as game_name 
       FROM achievements a
       LEFT JOIN games g ON a.app_id = g.app_id
       WHERE a.achieved = 1 AND a.unlock_time IS NOT NULL AND a.unlock_time > 0
       ORDER BY a.unlock_time DESC
       LIMIT ?`,
      [limit]
    )
  }

  updateAchievementSchema(appId: number, achievements: any[]): void {
    if (!achievements || achievements.length === 0) return
    
    execute('BEGIN TRANSACTION')
    try {
      achievements.forEach(ach => {
        execute(
          `UPDATE achievements 
           SET display_name = ?, description = ?, icon = ?, icon_gray = ? 
           WHERE app_id = ? AND api_name = ?`,
          [ach.displayName || ach.name, ach.description, ach.icon, ach.icongray, appId, ach.name]
        )
      })
      execute('COMMIT')
    } catch (error) {
      execute('ROLLBACK')
      throw error
    }
  }
}

