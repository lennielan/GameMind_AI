import { net } from 'electron'
import { logger } from '../../logger/logger'
import { SteamProfile, SteamGame } from '@shared/types/steam.types'

const STEAM_API_BASE = 'https://api.steampowered.com'

export class SteamApiClient {
  private apiKey: string | null = null

  constructor() {}

  /**
   * Установить ключ Steam API для вызовов.
   * Вызывается движком синхронизации перед началом работы.
   */
  public setApiKey(key: string) {
    this.apiKey = key
  }

  /**
   * Helper для выполнения запросов с базовой обработкой ошибок.
   */
  private async fetch<T>(endpoint: string, params: Record<string, string>): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Steam API Key is not set')
    }

    const url = new URL(`${STEAM_API_BASE}${endpoint}`)
    url.searchParams.append('key', this.apiKey)
    url.searchParams.append('format', 'json')
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })

    logger.debug('SteamAPI', `Fetching ${endpoint}`)

    const response = await net.fetch(url.toString())

    if (!response.ok) {
      const errorMsg = `Steam API Error: ${response.status} ${response.statusText}`
      logger.error('SteamAPI', errorMsg)
      throw new Error(errorMsg)
    }

    return response.json() as Promise<T>
  }

  /**
   * Получить базовую информацию профиля
   */
  public async getPlayerSummaries(steamId: string): Promise<SteamProfile | null> {
    try {
      const data = await this.fetch<any>('/ISteamUser/GetPlayerSummaries/v0002/', {
        steamids: steamId
      })

      const players = data?.response?.players
      if (!players || players.length === 0) {
        return null
      }

      const p = players[0]
      return {
        steamId: p.steamid,
        personaName: p.personaname,
        avatarUrl: p.avatar,
        avatarMediumUrl: p.avatarmedium,
        avatarFullUrl: p.avatarfull,
        profileUrl: p.profileurl,
        countryCode: p.loccountrycode || null,
        stateCode: p.locstatecode || null,
        timeCreated: p.timecreated || 0,
        lastLogoff: p.lastlogoff || 0,
        personaState: p.personastate || 0,
        communityVisibilityState: p.communityvisibilitystate || 1
      }
    } catch (error) {
      logger.error('SteamAPI', `getPlayerSummaries failed for ${steamId}`, error)
      throw error
    }
  }

  /**
   * Получить список игр пользователя
   */
  public async getOwnedGames(steamId: string): Promise<SteamGame[]> {
    try {
      const data = await this.fetch<any>('/IPlayerService/GetOwnedGames/v0001/', {
        steamid: steamId,
        include_appinfo: '1',
        include_played_free_games: '1'
      })

      const games = data?.response?.games
      if (!games || games.length === 0) {
        return []
      }

      return games.map((g: any) => ({
        appId: g.appid,
        name: g.name,
        playtimeForever: g.playtime_forever || 0,
        playtime2Weeks: g.playtime_2weeks || 0,
        imgIconUrl: g.img_icon_url || '',
        hasCommunityVisibleStats: g.has_community_visible_stats || false,
        lastPlayedAt: g.rtime_last_played || null
      }))
    } catch (error) {
      logger.error('SteamAPI', `getOwnedGames failed for ${steamId}`, error)
      throw error
    }
  }

  /**
   * Получить статистику достижений игрока для конкретной игры
   */
  public async getPlayerAchievements(steamId: string, appId: number): Promise<{ total: number, unlocked: number, forbidden: boolean }> {
    try {
      const data = await this.fetch<any>('/ISteamUserStats/GetPlayerAchievements/v0001/', {
        steamid: steamId,
        appid: appId.toString()
      })

      if (data?.playerstats?.success && data.playerstats.achievements) {
        const achievements = data.playerstats.achievements as any[]
        const unlockedCount = achievements.filter(a => a.achieved === 1).length
        return {
          total: achievements.length,
          unlocked: unlockedCount,
          forbidden: false
        }
      }
      return { total: 0, unlocked: 0, forbidden: false }
    } catch (error: any) {
      if (error.message?.includes('429')) {
        throw error // Re-throw to handle exponential backoff
      }
      // 403 Forbidden = профиль закрыт
      if (error.message?.includes('403')) {
        return { total: 0, unlocked: 0, forbidden: true }
      }
      // 400 = нет ачивок у игры
      if (error.message?.includes('400')) {
        return { total: 0, unlocked: 0, forbidden: false }
      }
      logger.warn('SteamAPI', `getPlayerAchievements failed for app ${appId}: ${error.message}`)
      return { total: 0, unlocked: 0, forbidden: false }
    }
  }

  /**
   * Получить схему игры (описания и иконки достижений)
   */
  public async getSchemaForGame(appId: number): Promise<any> {
    try {
      const data = await this.fetch<any>('/ISteamUserStats/GetSchemaForGame/v2/', {
        appid: appId.toString()
      })

      return data?.game?.availableGameStats?.achievements || []
    } catch (error: any) {
      if (error.message?.includes('400')) {
        return []
      }
      logger.error('SteamAPI', `getSchemaForGame failed for app ${appId}`, error)
      throw error
    }
  }

  /**
   * Получить вишлист пользователя.
   * Поскольку официальный Web API не отдает вишлист, используем эндпоинт магазина.
   */
  public async getWishlist(steamId: string, profileUrl?: string): Promise<any[]> {
    try {
      let storePath = `profiles/${steamId}`
      if (profileUrl) {
         const match = profileUrl.match(/steamcommunity\.com\/(id\/[^\/]+|profiles\/[^\/]+)/)
         if (match) {
            storePath = match[1]
         }
      }

      const jsonUrl = `https://store.steampowered.com/wishlist/${storePath}/wishlistdata/?p=0`
      logger.debug('SteamAPI', `Fetching Wishlist JSON from ${jsonUrl}`)
      
      const reqHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': `https://store.steampowered.com/wishlist/${storePath}/`
      }

      let response = await net.fetch(jsonUrl, { headers: reqHeaders })
      let text = await response.text()

      let data;
      try {
        data = JSON.parse(text)
      } catch (e) {
        logger.warn('SteamAPI', `JSON endpoint failed or returned HTML. (Status: ${response.status}). Falling back to HTML scraping...`)
        logger.warn('SteamAPI', `HTML Preview (JSON url: ${jsonUrl}): ${text.substring(0, 300)}`)
        
        const htmlUrl = `https://store.steampowered.com/wishlist/${storePath}/`
        response = await net.fetch(htmlUrl, { headers: reqHeaders })
        const htmlText = await response.text()
        
        logger.warn('SteamAPI', `HTML Preview (HTML url: ${htmlUrl}): ${htmlText.substring(0, 300)}`)
        
        const match = htmlText.match(/var\s+g_rgWishlistData\s*=\s*(.*?);/s)
        if (match && match[1]) {
           const parsedData = JSON.parse(match[1])
           if (Array.isArray(parsedData)) {
              data = {}
              parsedData.forEach((item: any) => {
                 data[item.appid] = item
              })
           } else {
              data = parsedData // it's already an object
           }
        } else {
           throw new Error('Could not find g_rgWishlistData in HTML')
        }
      }

      if (!data || Object.keys(data).length === 0 || data.success === 2) {
        return [] 
      }

      const wishlist: any[] = []
      for (const appIdStr in data) {
        const item = data[appIdStr]
        wishlist.push({
          appId: parseInt(appIdStr, 10),
          name: item.name,
          priority: item.priority || 0,
          addedAt: item.added || 0
        })
      }
      return wishlist
    } catch (error) {
      logger.error('SteamAPI', `getWishlist failed for ${steamId}`, error)
      return [] 
    }
  }

  /**
   * Получить детали приложения из Steam Store API
   * Лимит: 200 запросов / 5 минут
   */
  public async getAppDetails(appId: number): Promise<any | null> {
    try {
      const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`
      const response = await net.fetch(url)
      
      // Store API doesn't use the standard Web API error handling
      if (!response.ok) {
        if (response.status === 429) {
          logger.warn('SteamAPI', `Rate limit exceeded for appdetails (appId: ${appId})`)
          return null
        }
        throw new Error(`Store API Error: ${response.status}`)
      }

      const data = await response.json()
      if (data && data[appId] && data[appId].success) {
        return data[appId].data
      }
      return null
    } catch (error) {
      logger.error('SteamAPI', `getAppDetails failed for ${appId}`, error)
      return null
    }
  }

  /**
   * Искать игру в Steam Store API по названию
   */
  public async searchGameByName(name: string): Promise<number | null> {
    try {
      const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(name)}&l=english&cc=US`
      const res = await net.fetch(url)
      const data = await res.json()
      if (data && data.items && data.items.length > 0) {
        return data.items[0].id // return the appId
      }
      return null
    } catch (e) {
      return null
    }
  }
  /**
   * Получить теги игры через SteamSpy API
   */
  public async getGameTagsFromSteamSpy(appId: number): Promise<string[]> {
    try {
      const url = `https://steamspy.com/api.php?request=appdetails&appid=${appId}`
      const response = await net.fetch(url)
      
      if (!response.ok) {
        if (response.status === 429) {
          logger.warn('SteamAPI', `SteamSpy Rate limit exceeded for app ${appId}`)
          throw new Error('429 Rate Limit') // To trigger TaskQueue backoff
        }
        throw new Error(`SteamSpy Error: ${response.status}`)
      }

      const data = await response.json()
      if (data && data.tags && typeof data.tags === 'object' && !Array.isArray(data.tags)) {
        return Object.keys(data.tags)
      }
      return []
    } catch (error: any) {
      if (error.message?.includes('429')) {
        throw error // Re-throw for exponential backoff
      }
      logger.error('SteamAPI', `getGameTagsFromSteamSpy failed for app ${appId}`, error)
      return []
    }
  }
}

export const steamApi = new SteamApiClient()
