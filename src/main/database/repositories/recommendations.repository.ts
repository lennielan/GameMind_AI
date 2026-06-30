import { execute, queryAll } from '../database'

export interface Recommendation {
  id?: number
  steamId: string
  appId: number | null
  gameName: string
  reasoning: string
  score: number
  context: string // e.g. "backlog", "discovery", "wishlist"
  generatedAt: number
  userFeedback: string | null
  hardwareEvaluation?: string
}

export class RecommendationsRepository {
  getRecommendations(steamId: string): Recommendation[] {
    const rows = queryAll<any>('SELECT * FROM recommendations WHERE steam_id = ? ORDER BY score DESC', [steamId])
    return rows.map(row => ({
      id: row.id,
      steamId: row.steam_id,
      appId: row.app_id,
      gameName: row.game_name,
      reasoning: row.reasoning,
      score: row.score,
      context: row.context,
      generatedAt: row.generated_at,
      userFeedback: row.user_feedback,
      hardwareEvaluation: row.hardware_evaluation
    }))
  }

  saveRecommendations(steamId: string, recommendations: Omit<Recommendation, 'id' | 'steamId' | 'generatedAt' | 'userFeedback'>[], context: string): void {
    if (recommendations.length === 0) return
    
    // Clear old recommendations for this context
    execute('DELETE FROM recommendations WHERE steam_id = ? AND context = ?', [steamId, context])
    
    const generatedAt = Date.now()

    // Insert new ones
    for (const rec of (recommendations as any[])) {
      execute(
        `INSERT INTO recommendations (
          steam_id, app_id, game_name, reasoning, score, context, generated_at, user_feedback, hardware_evaluation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          steamId,
          rec.appId,
          rec.gameName,
          rec.reasoning,
          rec.score,
          context,
          generatedAt,
          null,
          rec.hardware_evaluation || null
        ]
      )
    }
  }

  clearRecommendations(steamId: string): void {
    execute('DELETE FROM recommendations WHERE steam_id = ?', [steamId])
  }
}

export const recommendationsRepository = new RecommendationsRepository()
