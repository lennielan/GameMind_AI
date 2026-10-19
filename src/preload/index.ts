// ============================================================
// Preload Script — Secure bridge between main and renderer
// ============================================================

import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/constants/ipc-channels'
import type { GameFilter, SettingsKey, AppSettings, IpcResult, BaseTheme, AiFeatureUsageStatus } from '../shared/types'
import { z } from 'zod'

const searchSchema = z.string().min(1).max(100)
const semanticSearchSchema = z.string().min(1).max(200)
const uuidSchema = z.string().uuid()
const friendDnaSchema = z.record(z.any())
const friendsSchema = z.array(z.record(z.any()))

const api = {
  // ---- App ----
  getVersion: (): Promise<IpcResult<string>> =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
  getPlatform: (): Promise<IpcResult<string>> =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_GET_PLATFORM),
  minimize: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_MINIMIZE),
  maximize: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_MAXIMIZE),
  close: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_CLOSE),
  isMaximized: (): Promise<IpcResult<boolean>> =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_IS_MAXIMIZED),
  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_EXTERNAL, url),
  setFocus: (focused: boolean): void =>
    ipcRenderer.send(IPC_CHANNELS.APP_SET_FOCUS, focused),
  onNavigate: (callback: (path: string, state?: any) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, { path, state }: { path: string, state?: any }) => callback(path, state)
    ipcRenderer.on(IPC_CHANNELS.APP_NAVIGATE, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.APP_NAVIGATE, handler)
  },
  onDnaStarted: (callback: () => void): (() => void) => {
    const handler = () => callback()
    ipcRenderer.on(IPC_CHANNELS.DNA_STARTED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.DNA_STARTED, handler)
  },
  onDnaUpdated: (callback: () => void): (() => void) => {
    const handler = () => callback()
    ipcRenderer.on(IPC_CHANNELS.DNA_UPDATED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.DNA_UPDATED, handler)
  },
  onDnaFailed: (callback: (error: string) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, error: string) => callback(error)
    ipcRenderer.on(IPC_CHANNELS.DNA_GENERATION_FAILED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.DNA_GENERATION_FAILED, handler)
  },
  onRecommendationsStarted: (callback: () => void): (() => void) => {
    const handler = () => callback()
    ipcRenderer.on(IPC_CHANNELS.RECOMMENDATIONS_STARTED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.RECOMMENDATIONS_STARTED, handler)
  },
  onRecommendationsUpdated: (callback: () => void): (() => void) => {
    const handler = () => callback()
    ipcRenderer.on(IPC_CHANNELS.RECOMMENDATIONS_UPDATED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.RECOMMENDATIONS_UPDATED, handler)
  },
  onRecommendationsFailed: (callback: (error: string) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, error: string) => callback(error)
    ipcRenderer.on(IPC_CHANNELS.RECOMMENDATIONS_FAILED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.RECOMMENDATIONS_FAILED, handler)
  },

  // ---- AI & Player DNA ----
  getQuickInsights: (): Promise<IpcResult<string>> =>
    ipcRenderer.invoke(IPC_CHANNELS.AI_GET_INSIGHTS),
  
  ai: {
    generateCoopRecommendation: (friendDna: any): Promise<any> => {
      friendDnaSchema.parse(friendDna)
      return ipcRenderer.invoke(IPC_CHANNELS.AI_GENERATE_COOP, friendDna)
    },
    generateGroupMatch: (friends: any[]): Promise<IpcResult<any>> => {
      friendsSchema.parse(friends)
      return ipcRenderer.invoke(IPC_CHANNELS.AI_GENERATE_GROUP_MATCH, friends)
    },
    generateGameMindScore: (): Promise<IpcResult<boolean>> =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_GENERATE_SCORE),
    generateTimeline: (): Promise<IpcResult<boolean>> =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_GENERATE_TIMELINE),
    getUsage: (): Promise<IpcResult<AiFeatureUsageStatus[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_GET_USAGE),
    getQueueStatus: (): Promise<IpcResult<any>> =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_GET_QUEUE_STATUS),
    onQueueStatusUpdate: (callback: (status: any) => void): (() => void) => {
      const handler = (_e: Electron.IpcRendererEvent, status: any) => callback(status)
      ipcRenderer.on(IPC_CHANNELS.AI_QUEUE_STATUS_UPDATE, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.AI_QUEUE_STATUS_UPDATE, handler)
    },
  },

  // ---- Theme ----
  getTheme: (): Promise<IpcResult<string>> =>
    ipcRenderer.invoke(IPC_CHANNELS.THEME_GET),
  setTheme: (theme: BaseTheme): Promise<IpcResult<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.THEME_SET, theme),

  // ---- Settings ----
  getSetting: (key: SettingsKey): Promise<IpcResult<unknown>> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET, key),
  setSetting: (key: SettingsKey, value: unknown): Promise<IpcResult<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, value),
  getAllSettings: (): Promise<IpcResult<AppSettings>> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_ALL),

  // ---- Database ----
  getGames: (filter?: GameFilter): Promise<IpcResult<unknown[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DB_GET_GAMES, filter),
  getGame: (appId: number): Promise<IpcResult<unknown>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DB_GET_GAME, appId),
  getStats: (): Promise<IpcResult<any>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DB_GET_STATS),
  getRecentGames: (limit?: number): Promise<IpcResult<unknown[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DB_GET_RECENT_GAMES, limit),
  getShowcaseAchievements: (): Promise<IpcResult<any[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DB_GET_SHOWCASE_ACHIEVEMENTS),
  getTimeline: (): Promise<IpcResult<any>> =>
    ipcRenderer.invoke(IPC_CHANNELS.ANALYTICS_GET_TIMELINE),

  // ---- AI & Player DNA ----
  generateDna: (): Promise<IpcResult<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.AI_GENERATE_DNA),
  getDna: (): Promise<IpcResult<any>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DB_GET_PLAYER_DNA),
  
  // ---- Recommendations ----
  generateRecommendations: (mood?: string): Promise<IpcResult<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.AI_GET_RECOMMENDATIONS, mood),
  generateReasoning: (appId: number, gameName: string): Promise<IpcResult<any>> =>
    ipcRenderer.invoke(IPC_CHANNELS.AI_GENERATE_REASONING, appId, gameName),
  getRecommendations: (): Promise<IpcResult<any>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DB_GET_RECOMMENDATIONS),
  semanticSearch: (query: string): Promise<IpcResult<any>> => {
    semanticSearchSchema.parse(query)
    return ipcRenderer.invoke(IPC_CHANNELS.AI_SEMANTIC_SEARCH, query)
  },
  addToBlacklist: (appId: number, gameName: string): Promise<IpcResult<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.AI_BLACKLIST_ADD, appId, gameName),
  removeFromBlacklist: (appId: number): Promise<IpcResult<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.AI_BLACKLIST_REMOVE, appId),
  getBlacklist: (): Promise<IpcResult<any[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.AI_BLACKLIST_GET),

  // ---- Steam ----
  steamSync: (): Promise<IpcResult<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.STEAM_SYNC),
  steamLogin: (): Promise<IpcResult<string>> =>
    ipcRenderer.invoke(IPC_CHANNELS.STEAM_LOGIN),
  getSteamProfile: (): Promise<IpcResult<unknown>> =>
    ipcRenderer.invoke(IPC_CHANNELS.STEAM_GET_PROFILE),
  steamCheckAuth: (): Promise<IpcResult<boolean>> =>
    ipcRenderer.invoke(IPC_CHANNELS.STEAM_CHECK_AUTH),
  steamProtocolAction: (action: 'run' | 'store' | 'community' | 'achievements', appId: number): Promise<IpcResult<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.STEAM_PROTOCOL_ACTION, action, appId),
  getPlayerSummaries: (steamId?: string): Promise<IpcResult<any>> =>
    ipcRenderer.invoke(IPC_CHANNELS.STEAM_GET_PLAYER_SUMMARIES, steamId),

  // ---- Event listeners ----
  onSyncStatus: (callback: (status: unknown) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: unknown): void => {
      callback(status)
    }
    ipcRenderer.on(IPC_CHANNELS.STEAM_SYNC_STATUS, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.STEAM_SYNC_STATUS, handler)
  },

  // ---- Updater ----
  updater: {
    check: (): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.UPDATER_CHECK),
    install: (): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.UPDATER_INSTALL),
    onAvailable: (callback: (info: any) => void): (() => void) => {
      const handler = (_e: Electron.IpcRendererEvent, info: any) => callback(info)
      ipcRenderer.on(IPC_CHANNELS.UPDATER_UPDATE_AVAILABLE, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATER_UPDATE_AVAILABLE, handler)
    },
    onProgress: (callback: (progress: any) => void): (() => void) => {
      const handler = (_e: Electron.IpcRendererEvent, progress: any) => callback(progress)
      ipcRenderer.on(IPC_CHANNELS.UPDATER_DOWNLOAD_PROGRESS, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATER_DOWNLOAD_PROGRESS, handler)
    },
    onReady: (callback: (info: any) => void): (() => void) => {
      const handler = (_e: Electron.IpcRendererEvent, info: any) => callback(info)
      ipcRenderer.on(IPC_CHANNELS.UPDATER_READY, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATER_READY, handler)
    },
    onError: (callback: (error: string) => void): (() => void) => {
      const handler = (_e: Electron.IpcRendererEvent, error: string) => callback(error)
      ipcRenderer.on(IPC_CHANNELS.UPDATER_ERROR, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATER_ERROR, handler)
    }
  },

  // ---- Cloud ----
  cloud: {
    setSession: (accessToken: string, refreshToken: string) =>
      ipcRenderer.send(IPC_CHANNELS.CLOUD_SET_SESSION, accessToken, refreshToken)
  },

  // ---- Friends ----
  friends: {
    searchUsers: (query: string): Promise<IpcResult<any[]>> => {
      searchSchema.parse(query)
      return ipcRenderer.invoke(IPC_CHANNELS.FRIENDS_SEARCH, query)
    },
    sendFriendRequest: (friendId: string): Promise<IpcResult<boolean>> => {
      uuidSchema.parse(friendId)
      return ipcRenderer.invoke(IPC_CHANNELS.FRIENDS_SEND_REQUEST, friendId)
    },
    acceptFriendRequest: (userId: string): Promise<IpcResult<boolean>> => {
      uuidSchema.parse(userId)
      return ipcRenderer.invoke(IPC_CHANNELS.FRIENDS_ACCEPT_REQUEST, userId)
    },
    removeFriend: (userId: string): Promise<IpcResult<boolean>> => {
      uuidSchema.parse(userId)
      return ipcRenderer.invoke(IPC_CHANNELS.FRIENDS_REMOVE, userId)
    },
    getFriends: (): Promise<IpcResult<any[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.FRIENDS_GET_ALL),
    getPendingRequests: (): Promise<IpcResult<any[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.FRIENDS_GET_PENDING),
    getOutgoingRequests: (): Promise<IpcResult<any[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.FRIENDS_GET_OUTGOING),
    onRealtimeUpdate: (callback: (payload: any) => void): (() => void) => {
      const handler = (_e: Electron.IpcRendererEvent, payload: any) => callback(payload)
      ipcRenderer.on(IPC_CHANNELS.FRIENDS_REALTIME_UPDATE, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.FRIENDS_REALTIME_UPDATE, handler)
    }
  },

  // ---- Journal ----
  journal: {
    getAllJournals: (): Promise<IpcResult<any[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.JOURNAL_GET_ALL),
    generateJournal: (monthYYYYMM: string): Promise<IpcResult<any>> =>
      ipcRenderer.invoke(IPC_CHANNELS.JOURNAL_GENERATE, monthYYYYMM),
    generatePendingJournals: (): Promise<IpcResult<any[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.JOURNAL_GENERATE_PENDING),
    checkPendingJournals: (): Promise<IpcResult<string[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.JOURNAL_CHECK_PENDING),
    markJournalViewed: (month: string): Promise<IpcResult<boolean>> =>
      ipcRenderer.invoke(IPC_CHANNELS.JOURNAL_MARK_VIEWED, month),
    hasNewJournals: (): Promise<IpcResult<boolean>> =>
      ipcRenderer.invoke(IPC_CHANNELS.JOURNAL_HAS_NEW),
    adminGenerate: (month: string): Promise<IpcResult<any>> =>
      ipcRenderer.invoke(IPC_CHANNELS.JOURNAL_ADMIN_GENERATE, month),
    adminDelete: (month: string): Promise<IpcResult<boolean>> =>
      ipcRenderer.invoke(IPC_CHANNELS.JOURNAL_ADMIN_DELETE, month)
  },

  // ---- Dashboard ----
  dashboard: {
    getData: (): Promise<IpcResult<any>> =>
      ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD_GET_DATA),
    getWeeklyInsight: (forceRefresh?: boolean): Promise<IpcResult<string>> =>
      ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD_GET_WEEKLY_INSIGHT, forceRefresh)
  },

  // ---- Avatar ----
  avatar: {
    selectFile: (): Promise<IpcResult<string>> =>
      ipcRenderer.invoke(IPC_CHANNELS.AVATAR_SELECT_FILE),
    save: (base64DataUrl: string): Promise<IpcResult<string>> =>
      ipcRenderer.invoke(IPC_CHANNELS.AVATAR_SAVE, base64DataUrl),
    getPath: (): Promise<IpcResult<string | null>> =>
      ipcRenderer.invoke(IPC_CHANNELS.AVATAR_GET_PATH)
  },

  // ---- Chat / Messages ----
  chat: {
    getConversations: (): Promise<IpcResult<any[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.CHAT_GET_CONVERSATIONS),
    getMessages: (partnerId: string): Promise<IpcResult<any[]>> => {
      uuidSchema.parse(partnerId)
      return ipcRenderer.invoke(IPC_CHANNELS.CHAT_GET_MESSAGES, partnerId)
    },
    sendMessage: (receiverId: string, content: string, replyToId?: string): Promise<IpcResult<any>> => {
      uuidSchema.parse(receiverId)
      return ipcRenderer.invoke(IPC_CHANNELS.CHAT_SEND_MESSAGE, receiverId, content, replyToId)
    },
    editMessage: (messageId: string, newContent: string): Promise<IpcResult<any>> => {
      uuidSchema.parse(messageId)
      return ipcRenderer.invoke(IPC_CHANNELS.CHAT_EDIT_MESSAGE, messageId, newContent)
    },
    deleteMessage: (messageId: string, deleteForBoth: boolean): Promise<IpcResult<boolean>> => {
      uuidSchema.parse(messageId)
      return ipcRenderer.invoke(IPC_CHANNELS.CHAT_DELETE_MESSAGE, messageId, deleteForBoth)
    },
    togglePinChat: (partnerId: string): Promise<IpcResult<{pinned?: boolean}>> => {
      uuidSchema.parse(partnerId)
      return ipcRenderer.invoke(IPC_CHANNELS.CHAT_TOGGLE_PIN, partnerId)
    },
    markRead: (partnerId: string): Promise<IpcResult<boolean>> => {
      uuidSchema.parse(partnerId)
      return ipcRenderer.invoke(IPC_CHANNELS.CHAT_MARK_READ, partnerId)
    },
    getUnreadCount: (): Promise<IpcResult<number>> =>
      ipcRenderer.invoke(IPC_CHANNELS.CHAT_GET_UNREAD_COUNT),
    onRealtimeUpdate: (callback: (payload: any) => void): (() => void) => {
      const handler = (_e: Electron.IpcRendererEvent, payload: any) => callback(payload)
      ipcRenderer.on(IPC_CHANNELS.CHAT_REALTIME_UPDATE, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.CHAT_REALTIME_UPDATE, handler)
    }
  },

  // ---- Muting ----
  mute: {
    muteUser: (targetId: string, duration: string): Promise<IpcResult<boolean>> => {
      uuidSchema.parse(targetId)
      return ipcRenderer.invoke(IPC_CHANNELS.MUTE_USER, targetId, duration)
    },
    unmuteUser: (targetId: string): Promise<IpcResult<boolean>> => {
      uuidSchema.parse(targetId)
      return ipcRenderer.invoke(IPC_CHANNELS.MUTE_UNMUTE_USER, targetId)
    },
    isMuted: (targetId: string): Promise<IpcResult<boolean>> => {
      uuidSchema.parse(targetId)
      return ipcRenderer.invoke(IPC_CHANNELS.MUTE_IS_MUTED, targetId)
    },
    getAll: (): Promise<IpcResult<any[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.MUTE_GET_ALL)
  },

  // ---- Favorites ----
  favorites: {
    add: (data: any): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.FAVORITES_ADD, data),
    remove: (gameName: string): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.FAVORITES_REMOVE, gameName),
    getAll: (): Promise<IpcResult<any[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.FAVORITES_GET_ALL),
    isFavorite: (gameName: string): Promise<IpcResult<boolean>> =>
      ipcRenderer.invoke(IPC_CHANNELS.FAVORITES_IS_FAVORITE, gameName),
    getAiReview: (gameName: string, context?: any, force?: boolean): Promise<IpcResult<string>> =>
      ipcRenderer.invoke(IPC_CHANNELS.FAVORITES_AI_REVIEW, gameName, context, force)
  },

  // ---- Overlay ----
  overlay: {
    close: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.OVERLAY_CLOSE),
    click: (senderId: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.OVERLAY_CLICK, senderId),
    showNotification: (messageData: any): Promise<void> => ipcRenderer.invoke('overlay:show-notification', messageData),
    onShowMessage: (callback: (payload: any) => void): (() => void) => {
      const handler = (_e: Electron.IpcRendererEvent, payload: any) => callback(payload)
      ipcRenderer.on(IPC_CHANNELS.SHOW_OVERLAY_MESSAGE, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.SHOW_OVERLAY_MESSAGE, handler)
    }
  },

  // ---- Badges ----
  badges: {
    getAll: (): Promise<IpcResult<any[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.BADGES_GET_ALL),
    getUserBadges: (steamId: string): Promise<IpcResult<any[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.BADGES_GET_USER, steamId),
    grantBadge: (steamId: string, badgeCode: string, grantedBy?: string): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.BADGES_GRANT, steamId, badgeCode, grantedBy),
    revokeBadge: (steamId: string, badgeCode: string): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.BADGES_REVOKE, steamId, badgeCode),
    toggleVisibility: (steamId: string, badgeCode: string, isHidden: boolean): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.BADGES_TOGGLE_VISIBILITY, steamId, badgeCode, isHidden),
    updateTier: (steamId: string, badgeCode: string, newTier: number): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.BADGES_UPDATE_TIER, steamId, badgeCode, newTier),
    checkAutoBadges: (steamId: string, triggerType: string, data?: unknown): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.BADGES_CHECK_AUTO, steamId, triggerType, data)
  }
}

export type GameMindAPI = typeof api

contextBridge.exposeInMainWorld('api', api)
