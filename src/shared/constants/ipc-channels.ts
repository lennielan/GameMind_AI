// ============================================================
// IPC Channel Names — Single Source of Truth
// ============================================================

export const IPC_CHANNELS = {
  // Steam
  STEAM_GET_PROFILE: 'steam:get-profile',
  STEAM_GET_GAMES: 'steam:get-games',
  STEAM_GET_ACHIEVEMENTS: 'steam:get-achievements',
  STEAM_GET_FRIENDS: 'steam:get-friends',
  STEAM_GET_RECENT_GAMES: 'steam:get-recent-games',
  STEAM_SYNC: 'steam:sync',
  STEAM_SYNC_STATUS: 'steam:sync-status',
  STEAM_LOGIN: 'steam:login',
  STEAM_CHECK_AUTH: 'steam:check-auth',

  // AI
  AI_GENERATE_DNA: 'ai:generate-dna',
  AI_GET_RECOMMENDATIONS: 'ai:get-recommendations',
  AI_GET_INSIGHTS: 'ai:get-insights',
  AI_CHAT: 'ai:chat',
  AI_GET_PROVIDERS: 'ai:get-providers',
  AI_GENERATE_COOP: 'ai:generate-coop',
  AI_SEMANTIC_SEARCH: 'ai:semantic-search',

  // Analytics
  ANALYTICS_GET_OVERVIEW: 'analytics:get-overview',
  ANALYTICS_GET_GENRE_DISTRIBUTION: 'analytics:get-genre-distribution',
  ANALYTICS_GET_PLAYTIME_STATS: 'analytics:get-playtime-stats',
  ANALYTICS_GET_COMPLETION_STATS: 'analytics:get-completion-stats',
  ANALYTICS_GET_TIMELINE: 'analytics:get-timeline',

  // Database
  DB_GET_GAMES: 'db:get-games',
  DB_GET_GAME: 'db:get-game',
  DB_GET_STATS: 'db:get-stats',
  DB_GET_RECENT_GAMES: 'db:get-recent-games',
  DB_GET_PLAYER_DNA: 'db:get-player-dna',
  DB_GET_INSIGHTS: 'db:get-insights',
  DB_GET_RECOMMENDATIONS: 'db:get-recommendations',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_GET_ALL: 'settings:get-all',

  // App
  APP_GET_VERSION: 'app:get-version',
  APP_GET_PLATFORM: 'app:get-platform',
  APP_MINIMIZE: 'app:minimize',
  APP_MAXIMIZE: 'app:maximize',
  APP_CLOSE: 'app:close',
  APP_IS_MAXIMIZED: 'app:is-maximized',
  APP_OPEN_EXTERNAL: 'app:open-external',

  // Theme
  THEME_GET: 'theme:get',
  THEME_SET: 'theme:set',

  // Updater
  UPDATER_CHECK: 'updater:check',
  UPDATER_UPDATE_AVAILABLE: 'updater:update-available',
  UPDATER_DOWNLOAD_PROGRESS: 'updater:download-progress',
  UPDATER_READY: 'updater:ready',
  UPDATER_INSTALL: 'updater:install',
  UPDATER_ERROR: 'updater:error',

  // Cloud Sync
  CLOUD_SET_SESSION: 'cloud:set-session',

  // Friends
  FRIENDS_SEARCH: 'friends:search',
  FRIENDS_SEND_REQUEST: 'friends:send-request',
  FRIENDS_ACCEPT_REQUEST: 'friends:accept-request',
  FRIENDS_REMOVE: 'friends:remove',
  FRIENDS_GET_ALL: 'friends:get-all',
  FRIENDS_GET_PENDING: 'friends:get-pending',
  FRIENDS_GET_OUTGOING: 'friends:get-outgoing',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
