import { vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getPath: () => './' }
}))

vi.mock('../src/main/database/database', () => ({
  initDatabase: vi.fn().mockResolvedValue(true),
  getDatabase: vi.fn(),
  closeDatabase: vi.fn(),
}))

vi.mock('../src/main/database/repository.factory', () => ({
  gamesRepository: {
    getAllGames: () => []
  }
}))

vi.mock('../src/main/services/supabase.client', () => ({
  supabase: null
}))

vi.mock('../src/main/services/ai/ai.client', () => ({
  aiClient: {
    generate: vi.fn().mockImplementation(async ({ messages }) => {
      const q = messages[0].content.toLowerCase()
      let recs: string[] = []
      if (q.includes("рогалик")) {
        recs = ["Hades", "Dead Cells", "The Binding of Isaac: Rebirth", "Risk of Rain 2", "Slay the Spire"]
      } else if (q.includes("головоломки")) {
        recs = ["Portal 2", "The Witness", "Baba Is You", "The Talos Principle", "Superliminal"]
      } else if (q.includes("киберпанк")) {
        recs = ["Cyberpunk 2077", "Deus Ex: Human Revolution", "Ghostrunner", "RUINER", "Cloudpunk"]
      } else {
        recs = ["Game 1", "Game 2", "Game 3", "Game 4", "Game 5"]
      }

      return {
        content: JSON.stringify({
          isValidQuery: true,
          mandatory_contexts: [],
          mandatory_mechanics: [],
          optional_vibes: [],
          excluded_traits: [],
          storeRecommendations: recs
        })
      }
    })
  }
}))

import { test, expect } from 'vitest'
import { semanticSearchEngine } from '../src/main/services/ai/semantic-search.engine'

test('Semantic search queries', async () => {
  const queries = [
    "Хардкорный рогалик с крафтом",
    "Расслабляющие головоломки",
    "Сюжетный киберпанк"
  ]

  for (const q of queries) {
    console.log(`\nTesting query: "${q}"`)
    const result = await semanticSearchEngine.search(q)
    const storeCount = result.storeGames?.length || 0
    
    console.log(`Store Games count for "${q}": ${storeCount}`)
    if (storeCount > 0) {
      console.log(`Store Games:`, result.storeGames.map(g => g.name).join(', '))
    }

    expect(storeCount).toBeGreaterThanOrEqual(4)
    expect(storeCount).toBeLessThanOrEqual(6)
  }
}, 60000)
