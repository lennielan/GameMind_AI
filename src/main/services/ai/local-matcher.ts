import { gamesRepository } from '../../database/repository.factory'
import { logger } from '../../logger/logger'
import type { Game } from '@shared/types'
import { steamApi } from '../steam/steam-api.client'

export interface MatchScore {
  appId: number
  name: string
  score: number // 0-100
  matchedGenres: string[]
}

// Tags that are too generic to be useful for matching
const NOISE_TAGS = new Set([
  'Singleplayer', 'Single-player', 'Multi-player', 'Multiplayer',
  'Steam Achievements', 'Full controller support', 'Partial Controller Support',
  'Steam Cloud', 'Steam Trading Cards', 'Family Sharing',
  'Remote Play Together', 'Remote Play on Phone', 'Remote Play on Tablet',
  'Remote Play on TV', 'In-App Purchases', 'Stats', 'Captions available',
  'Includes level editor', 'Commentary available', 'HDR available',
  'VR Supported', 'VR Only', 'Valve Anti-Cheat enabled',
  'Includes Source SDK', 'SteamVR Collectibles', 'Steam Workshop',
  'Steam Leaderboards', 'Cross-Platform Multiplayer',
  'Downloadable Content', 'Shared/Split Screen Co-op',
  'Shared/Split Screen', 'Online Co-op', 'Online PvP',
  'LAN Co-op', 'LAN PvP', 'MMO',
  // Remove review-based tags that can leak through
  'Mixed', 'Positive', 'Negative', 'Overwhelmingly Positive',
  'Mostly Positive', 'Mostly Negative', 'Very Positive',
  'Very Negative', 'Overwhelmingly Negative', 'Profile Features Limited'
])

export class LocalMatcher {
  /**
   * Build a unified tag set for a game from genres + tags + categories.
   * Filters out noise tags and normalizes to lowercase for consistency.
   */
  private getCleanTags(game: Game): string[] {
    const all = [
      ...(game.genres || []),
      ...(game.tags || []),
      ...(game.categories || [])
    ]
    const unique = new Set<string>()
    for (const tag of all) {
      const trimmed = tag.trim()
      if (trimmed && !NOISE_TAGS.has(trimmed)) {
        unique.add(trimmed.toLowerCase())
      }
    }
    return Array.from(unique)
  }

  /**
   * Calculate IDF (Inverse Document Frequency) across the entire library.
   * Rare tags get high weight, common tags get low weight.
   * IDF(tag) = log(totalGames / gamesWithTag)
   */
  private calculateIDF(allGames: Game[]): Map<string, number> {
    const tagDocCount = new Map<string, number>()
    const totalDocs = allGames.length

    for (const game of allGames) {
      const tags = this.getCleanTags(game)
      const seen = new Set<string>()
      for (const tag of tags) {
        if (!seen.has(tag)) {
          seen.add(tag)
          tagDocCount.set(tag, (tagDocCount.get(tag) || 0) + 1)
        }
      }
    }

    const idf = new Map<string, number>()
    for (const [tag, count] of tagDocCount.entries()) {
      // Standard IDF with +1 smoothing to avoid division by zero
      idf.set(tag, Math.log((totalDocs + 1) / (count + 1)) + 1)
    }

    return idf
  }

  /**
   * Build TF-IDF user profile vector from favorite games.
   * Each tag's weight = sum of (log10(playtimeHours + 1) * IDF(tag)) across favorite games.
   */
  private buildUserVector(
    favoriteGames: Game[],
    idf: Map<string, number>
  ): Map<string, number> {
    const vector = new Map<string, number>()

    for (const game of favoriteGames) {
      const playtimeHours = game.playtimeForever / 60
      // Logarithmic dampening: prevents 3000hr games from dominating
      const playtimeWeight = Math.log10(playtimeHours + 1)

      // Recency boost: if played in the last 2 weeks, give x2 weight
      const recencyMultiplier = (game.playtime2Weeks && game.playtime2Weeks > 0) ? 2.0 : 1.0

      const weight = playtimeWeight * recencyMultiplier
      const tags = this.getCleanTags(game)

      for (const tag of tags) {
        const tagIdf = idf.get(tag) || 1
        const current = vector.get(tag) || 0
        vector.set(tag, current + weight * tagIdf)
      }
    }

    return vector
  }

  /**
   * Apply Anti-DNA: penalize tags from abandoned games (tried but dropped).
   * A game is "abandoned" if 0 < playtimeForever < 120 minutes (tried and quit).
   * We only penalize tags that are NOT also present in favorite games.
   */
  private applyAntiDna(
    userVector: Map<string, number>,
    allGames: Game[],
    idf: Map<string, number>
  ): void {
    const abandonedGames = allGames.filter(
      g => g.playtimeForever > 0 && g.playtimeForever < 120
    )

    if (abandonedGames.length === 0) return

    // Collect tags that appear in favorites (protected)
    const favoriteTags = new Set<string>()
    const favoriteGames = allGames
      .filter(g => g.playtimeForever >= 120)
      .sort((a, b) => b.playtimeForever - a.playtimeForever)
      .slice(0, 20)

    for (const game of favoriteGames) {
      for (const tag of this.getCleanTags(game)) {
        favoriteTags.add(tag)
      }
    }

    // Penalize tags from abandoned games (unless they appear in favorites)
    for (const game of abandonedGames) {
      const tags = this.getCleanTags(game)
      for (const tag of tags) {
        if (!favoriteTags.has(tag)) {
          const tagIdf = idf.get(tag) || 1
          const current = userVector.get(tag) || 0
          // Soft penalty: subtract 30% of IDF weight per abandoned game
          userVector.set(tag, current - tagIdf * 0.3)
        }
      }
    }

    // Remove any tags that went below zero
    for (const [tag, value] of userVector.entries()) {
      if (value <= 0) {
        userVector.delete(tag)
      }
    }
  }

  /**
   * Calculate Cosine Similarity between two vectors.
   * Returns 0-1 (where 1 = perfect match).
   */
  private cosineSimilarity(
    vecA: Map<string, number>,
    vecB: Map<string, number>
  ): number {
    let dotProduct = 0
    let magnitudeA = 0
    let magnitudeB = 0

    // Dot product
    for (const [tag, weightA] of vecA.entries()) {
      const weightB = vecB.get(tag) || 0
      dotProduct += weightA * weightB
    }

    // Magnitudes
    for (const weight of vecA.values()) {
      magnitudeA += weight * weight
    }
    for (const weight of vecB.values()) {
      magnitudeB += weight * weight
    }

    magnitudeA = Math.sqrt(magnitudeA)
    magnitudeB = Math.sqrt(magnitudeB)

    if (magnitudeA === 0 || magnitudeB === 0) return 0

    return dotProduct / (magnitudeA * magnitudeB)
  }

  /**
   * Build a TF-IDF vector for a single candidate game.
   */
  private buildGameVector(
    game: Game,
    idf: Map<string, number>
  ): Map<string, number> {
    const vector = new Map<string, number>()
    const tags = this.getCleanTags(game)

    for (const tag of tags) {
      const tagIdf = idf.get(tag) || 1
      vector.set(tag, tagIdf) // TF = 1 for candidate games (binary presence)
    }

    return vector
  }

  /**
   * Returns tags associated with a specific mood.
   */
  private getMoodTags(mood?: string): string[] {
    if (!mood || mood === 'none' || mood === 'default') {
      return []
    }

    switch (mood) {
      case 'new': return ['indie', 'experimental', 'unique', 'innovative', 'hidden gem']
      case 'hard': return ['difficult', 'souls-like', 'rogue-like', 'rogue-lite', 'perma death', 'hardcore', 'unforgiving']
      case 'friends': return ['multiplayer', 'co-op', 'online co-op', 'local co-op', 'party game', 'pvp', 'local multiplayer', 'split screen']
      case 'relax': return ['relaxing', 'cozy', 'farming sim', 'walking simulator', 'nature', 'city builder', 'puzzle', 'atmospheric']
      case 'story': return ['story rich', 'rpg', 'narrative', 'visual novel', 'choices matter', 'cinematic']
      case 'completionist': return ['open world', 'collectathon', 'rpg', 'replay value', 'exploration', 'sandbox']
      default: return []
    }
  }

  /**
   * Main matching algorithm: TF-IDF + Cosine Similarity + Anti-DNA.
   * 
   * NO STEAM API CALLS. Everything is read from the local SQLite cache.
   * This makes recommendations generation INSTANTANEOUS.
   * 
   * @param favoriteGames Top games by playtime (used as the "DNA" profile)
   * @param candidateGames Games to score (backlog or wishlist)
   * @param limit How many top results to return
   * @param mood The currently selected user mood for search filtering
   */
  public async getTopMatches(
    favoriteGames: { appId: number; name: string }[],
    candidateGames: { appId: number; name: string }[],
    limit: number = 3,
    mood?: string
  ): Promise<MatchScore[]> {
    logger.info(
      'LocalMatcher',
      `TF-IDF matching: ${candidateGames.length} candidates vs ${favoriteGames.length} favorites`
    )

    // 1. Load ALL games from local DB for IDF calculation
    const allGames = gamesRepository.getAllGames()
    if (allGames.length === 0) {
      logger.warn('LocalMatcher', 'No games in library, returning empty scores')
      return []
    }

    const gamesByAppId = new Map<number, Game>()
    for (const g of allGames) {
      gamesByAppId.set(g.appId, g)
    }

    // 1.5 Fetch tags for candidates and favorites that are missing them
    const allGamesToCheck = [...candidateGames, ...favoriteGames]
    // Filter to unique appIds
    const uniqueGamesToCheck = Array.from(new Map(allGamesToCheck.map(item => [item.appId, item])).values())
    
    const missingCandidates = uniqueGamesToCheck.filter(c => {
      const g = gamesByAppId.get(c.appId)
      return !g || this.getCleanTags(g).length === 0
    })

    if (missingCandidates.length > 0) {
      // Prevent API spam if there are hundreds of games missing tags
      const toFetch = missingCandidates.slice(0, 15)
      if (missingCandidates.length > 15) {
        logger.warn('LocalMatcher', `Truncating SteamSpy tag fetch from ${missingCandidates.length} to 15 to prevent rate limits.`)
      }
      logger.info('LocalMatcher', `Fetching missing tags for ${toFetch.length} candidates from SteamSpy...`)
      await Promise.all(toFetch.map(async (c) => {
        try {
          const tags = await steamApi.getGameTagsFromSteamSpy(c.appId)
          if (tags.length > 0) {
            let g = gamesByAppId.get(c.appId)
            if (g) {
              // It's a library game (backlog), we can save the tags
              g.tags = tags
              gamesRepository.upsertGame({ appId: g.appId, name: g.name, tags })
            } else {
              // It's a non-library game (wishlist or discovery), just keep it in memory for scoring
              g = { appId: c.appId, name: c.name, tags, playtimeForever: 0 } as Game
              gamesByAppId.set(c.appId, g)
              allGames.push(g)
            }
          }
        } catch (e) {
          logger.warn('LocalMatcher', `Failed to fetch tags for candidate ${c.appId}: ${e}`)
        }
      }))
    }

    // 2. Resolve favorite and candidate games to full Game objects
    const resolvedFavorites = favoriteGames
      .map(f => gamesByAppId.get(f.appId))
      .filter((g): g is Game => g != null && this.getCleanTags(g).length > 0)

    if (resolvedFavorites.length === 0) {
      logger.warn('LocalMatcher', 'No favorite games with tags found')
      return candidateGames.map(c => ({
        appId: c.appId,
        name: c.name,
        score: 50,
        matchedGenres: []
      }))
    }

    // 3. Calculate IDF across entire library
    const idf = this.calculateIDF(allGames)

    // 4. Build user profile vector (with log-dampened playtime weights)
    const userVector = this.buildUserVector(resolvedFavorites, idf)

    // 5. Apply Anti-DNA (penalize tags from abandoned games)
    this.applyAntiDna(userVector, allGames, idf)
    
    const moodTags = this.getMoodTags(mood)

    // 6. Score each candidate
    const scores: MatchScore[] = []

    for (const candidate of candidateGames) {
      const game = gamesByAppId.get(candidate.appId)
      const tags = game ? this.getCleanTags(game).map(t => t.toLowerCase()) : []

      if (!game || tags.length === 0) {
        scores.push({
          appId: candidate.appId,
          name: candidate.name,
          score: 50,
          matchedGenres: []
        })
        continue
      }

      const gameVector = this.buildGameVector(game, idf)
      let similarity = this.cosineSimilarity(userVector, gameVector)
      
      if (moodTags.length > 0) {
        const matchCount = moodTags.filter(t => tags.includes(t)).length
        if (matchCount === 0) {
          // If no mood tags match, drastically penalize it so it can be filtered out
          similarity = 0
        } else {
          // Boost similarity based on how many mood tags matched
          similarity = Math.min(1.0, similarity + (matchCount * 0.3))
        }
      }

      // Normalize from 0-1 to 50-99 range (realistic percentage feel)
      let normalizedScore = Math.floor(50 + similarity * 49)
      
      // If mood was explicitly requested but not matched, drop score below 50 so UI/Engine can filter it out
      if (moodTags.length > 0 && similarity === 0) {
        normalizedScore = 20
      } else {
        normalizedScore = Math.max(50, Math.min(99, normalizedScore))
      }

      // Find which tags matched (for display purposes)
      const matchedGenres = tags.filter(t => userVector.has(t))

      scores.push({
        appId: candidate.appId,
        name: candidate.name,
        score: normalizedScore,
        matchedGenres
      })
    }

    // 7. Sort by score descending and return top results
    scores.sort((a, b) => b.score - a.score)
    return scores.slice(0, limit)
  }
}

export const localMatcher = new LocalMatcher()
