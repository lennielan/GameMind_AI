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
  STEAM_GET_PLAYER_SUMMARIES: 'steam:get-player-summaries',
  STEAM_PROTOCOL_ACTION: 'steam:protocol-action',

  // AI
  AI_GENERATE_DNA: 'ai:generate-dna',
  AI_GET_RECOMMENDATIONS: 'ai:get-recommendations',
  AI_GET_INSIGHTS: 'ai:get-insights',
  AI_GENERATE_INSIGHTS: 'ai:generate-insights',
  AI_GENERATE_RECOMMENDATIONS: 'ai:generate-recommendations',
  AI_GENERATE_REASONING: 'ai:generate-reasoning',
  AI_SEARCH_GAMES: 'ai:search-games',
  AI_GENERATE_SCORE: 'ai:generate-score',
  AI_GENERATE_TIMELINE: 'ai:generate-timeline',
  AI_CHAT: 'ai:chat',
  AI_GET_PROVIDERS: 'ai:get-providers',
  AI_GENERATE_COOP: 'ai:generate-coop',
  AI_GENERATE_GROUP_MATCH: 'ai:generate-group-match',
  AI_SEMANTIC_SEARCH: 'ai:semantic-search',
  AI_GET_USAGE: 'ai:get-usage',
  AI_BLACKLIST_ADD: 'ai:blacklist-add',
  AI_BLACKLIST_REMOVE: 'ai:blacklist-remove',
  AI_BLACKLIST_GET: 'ai:blacklist-get',
  AI_GET_QUEUE_STATUS: 'ai:get-queue-status',
  AI_QUEUE_STATUS_UPDATE: 'ai:queue-status-update',

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
  DB_GET_SHOWCASE_ACHIEVEMENTS: 'db:get-showcase-achievements',
  DB_GET_PLAYER_DNA: 'db:get-player-dna',
  DB_GET_INSIGHTS: 'db:get-insights',
  DB_GET_RECOMMENDATIONS: 'db:get-recommendations',

  // Journal
  JOURNAL_GET_ALL: 'journal:get-all',
  JOURNAL_GENERATE: 'journal:generate',
  JOURNAL_GENERATE_PENDING: 'journal:generate-pending',
  JOURNAL_CHECK_PENDING: 'journal:check-pending',
  JOURNAL_MARK_VIEWED: 'journal:mark-viewed',
  JOURNAL_HAS_NEW: 'journal:has-new',
  JOURNAL_ADMIN_GENERATE: 'journal:admin-generate',
  JOURNAL_ADMIN_DELETE: 'journal:admin-delete',

  // Dashboard
  DASHBOARD_GET_DATA: 'dashboard:get-data',
  DASHBOARD_GET_WEEKLY_INSIGHT: 'dashboard:get-weekly-insight',

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
  APP_SET_FOCUS: 'app:set-focus',

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
  FRIENDS_REALTIME_UPDATE: 'friends:realtime-update',

  // Avatar
  AVATAR_SELECT_FILE: 'avatar:select-file',
  AVATAR_SAVE: 'avatar:save',
  AVATAR_GET_PATH: 'avatar:get-path',

  // Chat / Messages
  CHAT_GET_CONVERSATIONS: 'chat:get-conversations',
  CHAT_GET_MESSAGES: 'chat:get-messages',
  CHAT_SEND_MESSAGE: 'chat:send-message',
  CHAT_MARK_READ: 'chat:mark-read',
  CHAT_GET_UNREAD_COUNT: 'chat:get-unread-count',
  CHAT_REALTIME_UPDATE: 'chat:realtime-update',
  CHAT_EDIT_MESSAGE: 'chat:edit-message',
  CHAT_DELETE_MESSAGE: 'chat:delete-message',
  CHAT_TOGGLE_PIN: 'chat:toggle-pin',

  // Muting
  MUTE_USER: 'mute:mute-user',
  MUTE_UNMUTE_USER: 'mute:unmute-user',
  MUTE_IS_MUTED: 'mute:is-muted',
  MUTE_GET_ALL: 'mute:get-all',

  // Favorites
  FAVORITES_ADD: 'favorites:add',
  FAVORITES_REMOVE: 'favorites:remove',
  FAVORITES_GET_ALL: 'favorites:get-all',
  FAVORITES_IS_FAVORITE: 'favorites:is-favorite',
  FAVORITES_AI_REVIEW: 'favorites:ai-review',

  // Overlay & Navigation
  SHOW_OVERLAY_MESSAGE: 'overlay:show-message',
  OVERLAY_CLOSE: 'overlay:close',
  OVERLAY_CLICK: 'overlay:click',
  APP_NAVIGATE: 'app:navigate',

  // DNA & AI Background
  DNA_STARTED: 'dna:started',
  DNA_UPDATED: 'dna:updated',
  DNA_GENERATION_FAILED: 'dna:failed',
  RECOMMENDATIONS_STARTED: 'recommendations:started',
  RECOMMENDATIONS_UPDATED: 'recommendations:updated',
  RECOMMENDATIONS_FAILED: 'recommendations:failed',

  // Badges
  BADGES_GET_ALL: 'badges:get-all',
  BADGES_GET_USER: 'badges:get-user',
  BADGES_GRANT: 'badges:grant',
  BADGES_REVOKE: 'badges:revoke',
  BADGES_TOGGLE_VISIBILITY: 'badges:toggle-visibility',
  BADGES_UPDATE_TIER: 'badges:update-tier',
  BADGES_CHECK_AUTO: 'badges:check-auto'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
