import { gamesRepository } from '../../../database/repository.factory'
import { userProfileRepository } from '../../../database/repository.factory'
import { playerDnaRepository } from '../../../database/repository.factory'
import { recommendationsRepository } from '../../../database/repository.factory'
import { blacklistRepository } from '../../../database/repository.factory'
import { favoritesRepository } from '../../../database/repository.factory'
import { recommendationHistoryRepository } from '../../../database/repository.factory'
import { wishlistRepository } from '../../../database/repository.factory'
import { logger } from '../../../logger/logger'
import { hardwareService } from '../../hardware.service'
import { gameHardwareEvaluator } from './hardware-evaluator'

export class RecommendationsDataProvider {
  async getGenerationContext() {
    const profile = userProfileRepository.getProfile()
    if (!profile) {
      throw new Error('No user profile found.')
    }

    const dnaSummary = playerDnaRepository.getSummary(profile.steamId)
    const dnaTraits = playerDnaRepository.getTraits(profile.steamId)

    if (!dnaSummary) {
      throw new Error('Please generate your Player DNA first.')
    }

    const games = gamesRepository.getAllGames()
    
    // Load blacklist, favorites, and history to filter out candidates
    const blacklist = await blacklistRepository.getBlacklist(profile.steamId)
    const favoritesData = await favoritesRepository.getFavorites(profile.steamId)
    const history = await recommendationHistoryRepository.getHistory(profile.steamId)
    
    const blacklistedAppIds = new Set(blacklist.map(item => item.appId).filter(Boolean))
    const blacklistedNames = new Set(blacklist.map(item => item.gameName.toLowerCase().trim()))

    const favoriteAppIds = new Set(favoritesData.map(item => item.appId).filter(Boolean))
    const favoriteNames = new Set(favoritesData.map(item => item.gameName.toLowerCase().trim()))
    const historyAppIds = new Set(history.map(item => item.appId).filter(Boolean))

    const normalizeString = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '')
    const blacklistedNormNames = new Set(blacklist.map(item => normalizeString(item.gameName)))
    const favoriteNormNames = new Set(favoritesData.map(item => normalizeString(item.gameName)))

    const isExcludedCandidate = (appId?: number | null, name?: string | null) => {
      if (appId && (blacklistedAppIds.has(appId) || favoriteAppIds.has(appId) || historyAppIds.has(appId))) {
        return true
      }
      if (name) {
        const lower = name.toLowerCase().trim()
        if (blacklistedNames.has(lower) || favoriteNames.has(lower)) {
          return true
        }
        const norm = normalizeString(name)
        if (norm && (blacklistedNormNames.has(norm) || favoriteNormNames.has(norm))) {
          return true
        }
      }
      return false
    }

    // Unplayed games (playtime < 120 minutes) excluding blacklisted, favorites, and history
    const allBacklog = games.filter(g => g.playtimeForever < 120 && !isExcludedCandidate(g.appId, g.name))
    
    // Select Top 5 favorite games for DNA calculation
    const favorites = games
      .sort((a, b) => b.playtimeForever - a.playtimeForever)
      .slice(0, 5)
      .map(g => ({ appId: g.appId, name: g.name }))
      
    const backlogCandidates = allBacklog.map(g => ({ appId: g.appId, name: g.name }))

    const wishlistRaw = wishlistRepository.getWishlist(profile.steamId)
    const wishlistCandidates = wishlistRaw
      .filter(w => !isExcludedCandidate(w.appId, w.name))
      .map(w => ({ appId: w.appId, name: w.name }))

    return {
      profile,
      dnaSummary,
      dnaTraits,
      blacklist,
      history,
      favorites,
      backlogCandidates,
      wishlistCandidates,
      games,
      isExcludedCandidate
    }
  }

  async saveGeneratedRecommendations(steamId: string, finalTopMatches: any[], finalBacklog: any[], finalWishlist: any[], unexpectedDiscoveries: any[]) {
    recommendationsRepository.clearRecommendations(steamId)

    const saveContext = async (list: any[], context: string) => {
      if (!list || list.length === 0) return
      const mapped: any[] = []
      for (const rec of list) {
        const reasoningStr = typeof rec.reasoning === 'object' ? JSON.stringify(rec.reasoning) : rec.reasoning
        
        if (rec.appId) {
          await recommendationHistoryRepository.addToHistory(steamId, rec.appId, rec.gameName)
        }
        
        mapped.push({
          appId: rec.appId,
          gameName: rec.gameName || rec.name,
          reasoning: reasoningStr,
          score: rec.score,
          hardware_evaluation: rec.hardware_evaluation
        })
      }
      recommendationsRepository.saveRecommendations(steamId, mapped as any, context)
    }

    await saveContext(finalTopMatches, 'top_matches')
    await saveContext(finalBacklog, 'backlog')
    await saveContext(finalWishlist, 'wishlist')
    await saveContext(unexpectedDiscoveries, 'unexpected_discoveries')

    logger.info('RecommendationsDataProvider', 'Recommendations successfully saved to DB')
  }

  async getStoredRecommendations() {
    const profile = userProfileRepository.getProfile()
    if (!profile) return null

    const all = recommendationsRepository.getRecommendations(profile.steamId)
    const games = gamesRepository.getAllGames()
    const ownedAppIds = new Set(games.map(g => g.appId))

    const blacklist = await blacklistRepository.getBlacklist(profile.steamId)
    const favoritesData = await favoritesRepository.getFavorites(profile.steamId)

    const blacklistedAppIds = new Set(blacklist.map(item => item.appId).filter(Boolean))
    const blacklistedNames = new Set(blacklist.map(item => item.gameName.toLowerCase().trim()))
    
    const favoriteAppIds = new Set(favoritesData.map(item => item.appId).filter(Boolean))
    const favoriteNames = new Set(favoritesData.map(item => item.gameName.toLowerCase().trim()))

    const normalizeString = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '')
    const blacklistedNormNames = new Set(blacklist.map(item => normalizeString(item.gameName)))
    const favoriteNormNames = new Set(favoritesData.map(item => normalizeString(item.gameName)))

    const isExcluded = (r: any) => {
      if (r.appId && (blacklistedAppIds.has(r.appId) || favoriteAppIds.has(r.appId))) {
        return true
      }
      if (r.gameName) {
        const lower = r.gameName.toLowerCase().trim()
        if (blacklistedNames.has(lower) || favoriteNames.has(lower)) {
          return true
        }
        const norm = normalizeString(r.gameName)
        if (norm && (blacklistedNormNames.has(norm) || favoriteNormNames.has(norm))) {
          return true
        }
      }
      return false
    }

    const pcSpecs = await hardwareService.getSpecs()

    const mapWithOwnerFlag = (recsList: any[], isDiscovery: boolean = false) => {
      return recsList
        .filter(r => !isExcluded(r))
        .map(r => {
          let hwEval = r.hardwareEvaluation
          
          if (!isDiscovery && r.appId) {
            const gameObj = games.find(g => Number(g.appId) === Number(r.appId))
            if (gameObj) {
              hwEval = gameHardwareEvaluator.evaluate(gameObj, pcSpecs)
            }
          }

          return {
            ...r,
            hardwareEvaluation: hwEval,
            isOwned: r.appId ? ownedAppIds.has(r.appId) : false
          }
        })
    }

    return {
      top_matches: mapWithOwnerFlag(all.filter(r => r.context === 'top_matches')),
      backlog: mapWithOwnerFlag(all.filter(r => r.context === 'backlog')),
      wishlist: mapWithOwnerFlag(all.filter(r => r.context === 'wishlist')),
      unexpected_discoveries: mapWithOwnerFlag(all.filter(r => r.context === 'unexpected_discoveries'), true)
    }
  }
}

export const recommendationsDataProvider = new RecommendationsDataProvider()
