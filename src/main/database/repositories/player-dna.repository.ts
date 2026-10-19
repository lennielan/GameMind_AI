import { queryOne, execute, queryAll } from '../database'

export interface PlayerDnaSummary {
  steamId: string
  persona: string
  description: string
  topGenres: string[]
  playstyle: string
  generatedAt: number
  aiProvider: string
}

export interface PlayerDnaTrait {
  id: number
  steamId: string
  traitName: string
  traitValue: number
  confidence: number
  reasoning: string
  generatedAt: number
  aiProvider: string
}

export class PlayerDnaRepository {
  getSummary(steamId: string): PlayerDnaSummary | null {
    const row = queryOne<any>('SELECT * FROM player_dna_summary WHERE steam_id = ?', [steamId])
    if (!row) return null

    return {
      steamId: row.steam_id,
      persona: row.persona,
      description: row.description,
      topGenres: JSON.parse(row.top_genres || '[]'),
      playstyle: row.playstyle,
      generatedAt: row.generated_at,
      aiProvider: row.ai_provider
    }
  }

  saveSummary(summary: PlayerDnaSummary): void {
    const existing = queryOne<{ steam_id: string }>('SELECT steam_id FROM player_dna_summary WHERE steam_id = ?', [summary.steamId])

    if (existing) {
      execute(
        `UPDATE player_dna_summary SET
          persona = ?, description = ?, top_genres = ?, playstyle = ?, generated_at = ?, ai_provider = ?
         WHERE steam_id = ?`,
        [
          summary.persona,
          summary.description,
          JSON.stringify(summary.topGenres),
          summary.playstyle,
          summary.generatedAt,
          summary.aiProvider,
          summary.steamId
        ]
      )
    } else {
      execute(
        `INSERT INTO player_dna_summary (
          steam_id, persona, description, top_genres, playstyle, generated_at, ai_provider
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          summary.steamId,
          summary.persona,
          summary.description,
          JSON.stringify(summary.topGenres),
          summary.playstyle,
          summary.generatedAt,
          summary.aiProvider
        ]
      )
    }
  }

  getTraits(steamId: string): PlayerDnaTrait[] {
    const rows = queryAll<any>('SELECT * FROM player_dna WHERE steam_id = ?', [steamId])
    return rows.map(row => ({
      id: row.id,
      steamId: row.steam_id,
      traitName: row.trait_name,
      traitValue: row.trait_value,
      confidence: row.confidence,
      reasoning: row.reasoning,
      generatedAt: row.generated_at,
      aiProvider: row.ai_provider
    }))
  }

  saveTraits(traits: Omit<PlayerDnaTrait, 'id'>[]): void {
    if (traits.length === 0) return
    
    // Clear old traits
    execute('DELETE FROM player_dna WHERE steam_id = ?', [traits[0].steamId])
    
    // Insert new ones
    for (const trait of traits) {
      execute(
        `INSERT INTO player_dna (
          steam_id, trait_name, trait_value, confidence, reasoning, generated_at, ai_provider
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          trait.steamId,
          trait.traitName,
          trait.traitValue,
          trait.confidence,
          trait.reasoning,
          trait.generatedAt,
          trait.aiProvider
        ]
      )
    }
  }
}

