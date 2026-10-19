import { steamApi } from '../steam/steam-api.client'
import { gamesRepository } from '../../database/repository.factory'
import { playerDnaRepository } from '../../database/repository.factory'
import { userProfileRepository } from '../../database/repository.factory'
import { UserProfile } from '../friends.service'
import { logger } from '../../logger/logger'
import { configManager } from '../../config/config-manager'

export interface GroupMatchResult {
  groupProfile: {
    aggregatedGenres: Record<string, number>
    commonPlaystyle: string
  }
  topCandidates: Array<{
    appId: number
    name: string
    reason: string
    playtimeScore: number
    genreScore: number
    imgIconUrl: string
  }>
}

export class GroupMatchEngine {
  async computeMatch(friends: UserProfile[]): Promise<GroupMatchResult> {
    logger.info('GroupMatchEngine', `Computing match for ${friends.length} friends + local user`)
    
    // Ensure Steam API has a key
    if (!(steamApi as any).apiKey) {
      const key = configManager.get('steamApiKey')
      if (key) steamApi.setApiKey(key as string)
      else throw new Error('Steam API Key is missing. Cannot fetch friends libraries.')
    }

    const localProfile = userProfileRepository.getProfile()
    if (!localProfile) throw new Error('Local user profile not found')
    
    const localDna = playerDnaRepository.getSummary(localProfile.steamId)
    const localGames = gamesRepository.getAllGames().filter(g => g.playtimeForever > 0)

    // Maps steamId -> games
    const libraries = new Map<string, any[]>()
    libraries.set(localProfile.steamId, localGames)

    const aggregatedGenres: Record<string, number> = {}
    if (localDna?.topGenres) {
      localDna.topGenres.forEach((g: string) => { aggregatedGenres[g] = (aggregatedGenres[g] || 0) + 1 })
    }

    // Fetch friends games & aggregate DNA
    for (const friend of friends) {
      try {
        const friendGames = await steamApi.getOwnedGames(friend.steam_id)
        libraries.set(friend.steam_id, friendGames.filter(g => g.playtimeForever > 0))
        
        if (friend.dna_summary && friend.dna_summary.topGenres) {
          friend.dna_summary.topGenres.forEach((g: string) => {
            aggregatedGenres[g] = (aggregatedGenres[g] || 0) + 1
          })
        }
      } catch (err) {
        logger.error('GroupMatchEngine', `Failed to fetch games for ${friend.steam_id}`, err)
      }
    }

    // Find common games across all players
    const userIds = Array.from(libraries.keys())
    const firstUserGames = libraries.get(userIds[0]) || []
    
    let commonGames = firstUserGames.filter(g => {
      for (let i = 1; i < userIds.length; i++) {
        const lib = libraries.get(userIds[i]) || []
        if (!lib.some(fg => fg.appId === g.appId || fg.appid === g.appId || fg.appId === g.appid)) {
          return false
        }
      }
      return true
    })

    // Fallback: If no games are common among EVERYONE, find games common to AT LEAST 2 players
    if (commonGames.length === 0 && userIds.length > 2) {
      const gameCounts = new Map<number, { game: any, count: number }>()
      for (const lib of libraries.values()) {
        for (const g of lib) {
          const id = g.appId || g.appid
          if (!gameCounts.has(id)) gameCounts.set(id, { game: g, count: 1 })
          else gameCounts.get(id)!.count++
        }
      }
      commonGames = Array.from(gameCounts.values())
        .filter(entry => entry.count >= 2)
        .map(entry => entry.game)
    }

    if (commonGames.length === 0) {
      throw new Error('No common games found among the selected group.')
    }

    // Sort aggregated genres to find top group interests
    const topGroupGenres = Object.entries(aggregatedGenres)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0])

    // Rank candidates
    const rankedCandidates = commonGames.map(game => {
      const id = game.appId || game.appid
      const name = game.name || 'Unknown Game'
      
      let playtimeScore = 0
      let maxPlaytime = 0
      
      // Compute how much the group has played it
      for (const lib of libraries.values()) {
        const fg = lib.find(g => (g.appId || g.appid) === id)
        if (fg) {
          const hours = Math.round((fg.playtimeForever || fg.playtime_forever || 0) / 60)
          playtimeScore += hours
          if (hours > maxPlaytime) maxPlaytime = hours
        }
      }

      // Check if local game has genres matching group DNA
      let genreScore = 0
      const localG = localGames.find(g => g.appId === id)
      if (localG) {
        let parsedGenres: any[] = []
        try {
          parsedGenres = typeof localG.genres === 'string' ? JSON.parse(localG.genres) : (Array.isArray(localG.genres) ? localG.genres : [])
        } catch(e) {}
        for (const gen of parsedGenres) {
          const desc = gen.description || gen
          if (topGroupGenres.includes(desc)) genreScore += 5
        }
      }

      let reason = ''
      if (genreScore > 0) {
        reason = `Matches the group's top genres (${topGroupGenres.slice(0,2).join(', ')}). `
      } else {
        reason = `A shared title in everyone's library. `
      }
      
      if (maxPlaytime > 50) {
        reason += `Someone in the group is already a veteran (${maxPlaytime}h).`
      } else if (playtimeScore < 5) {
        reason += `Fresh start! Barely played by the group.`
      }

      return {
        appId: id,
        name,
        playtimeScore,
        genreScore,
        reason,
        imgIconUrl: game.imgIconUrl || game.img_icon_url || ''
      }
    })

    // Sort by genre affinity and playtime
    rankedCandidates.sort((a, b) => {
      if (a.genreScore !== b.genreScore) return b.genreScore - a.genreScore
      return b.playtimeScore - a.playtimeScore
    })

    return {
      groupProfile: {
        aggregatedGenres,
        commonPlaystyle: topGroupGenres.length > 0 ? `Fans of ${topGroupGenres[0]}` : 'Diverse group'
      },
      topCandidates: rankedCandidates.slice(0, 5)
    }
  }
}

export const groupMatchEngine = new GroupMatchEngine()
