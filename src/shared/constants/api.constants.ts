// ============================================================
// External API Constants
// ============================================================

export const STEAM_API = {
  BASE_URL: 'https://api.steampowered.com',
  STORE_URL: 'https://store.steampowered.com/api',
  CDN_URL: 'https://steamcdn-a.akamaihd.net',

  ENDPOINTS: {
    GET_PLAYER_SUMMARIES: '/ISteamUser/GetPlayerSummaries/v2/',
    GET_FRIEND_LIST: '/ISteamUser/GetFriendList/v1/',
    GET_OWNED_GAMES: '/IPlayerService/GetOwnedGames/v1/',
    GET_RECENT_GAMES: '/IPlayerService/GetRecentlyPlayedGames/v1/',
    GET_PLAYER_ACHIEVEMENTS: '/ISteamUserStats/GetPlayerAchievements/v1/',
    GET_SCHEMA_FOR_GAME: '/ISteamUserStats/GetSchemaForGame/v2/',
    GET_GLOBAL_ACHIEVEMENT_PERCENTAGES: '/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/'
  },

  STORE_ENDPOINTS: {
    APP_DETAILS: '/appdetails'
  }
} as const

export const RAWG_API = {
  BASE_URL: 'https://api.rawg.io/api',
  ENDPOINTS: {
    GAMES: '/games',
    GAME_DETAILS: '/games/{id}',
    GENRES: '/genres',
    TAGS: '/tags',
    DEVELOPERS: '/developers',
    PUBLISHERS: '/publishers'
  }
} as const

export const IGDB_API = {
  BASE_URL: 'https://api.igdb.com/v4',
  AUTH_URL: 'https://id.twitch.tv/oauth2/token',
  ENDPOINTS: {
    GAMES: '/games',
    COVERS: '/covers',
    FRANCHISES: '/franchises',
    GAME_ENGINES: '/game_engines',
    COMPANIES: '/companies',
    GENRES: '/genres'
  }
} as const
