// ============================================================
// Preload Script — Secure bridge between main and renderer
// ============================================================

import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/constants/ipc-channels'
import type { GameFilter, SettingsKey, AppSettings, IpcResult } from '../shared/types'

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

  // ---- AI & Player DNA ----
  getQuickInsights: (): Promise<IpcResult<string>> =>
    ipcRenderer.invoke(IPC_CHANNELS.AI_GET_INSIGHTS),
  
  ai: {
    generateCoopRecommendation: (friendDna: any): Promise<any> =>
      ipcRenderer.invoke(IPC_CHANNELS.AI_GENERATE_COOP, friendDna),
  },

  // ---- Theme ----
  getTheme: (): Promise<IpcResult<string>> =>
    ipcRenderer.invoke(IPC_CHANNELS.THEME_GET),
  setTheme: (theme: 'dark' | 'light' | 'system'): Promise<IpcResult<void>> =>
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

  // ---- AI & Player DNA ----
  generateDna: (): Promise<IpcResult<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.AI_GENERATE_DNA),
  getDna: (): Promise<IpcResult<any>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DB_GET_PLAYER_DNA),
  
  // ---- Recommendations ----
  generateRecommendations: (): Promise<IpcResult<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.AI_GET_RECOMMENDATIONS),
  getRecommendations: (): Promise<IpcResult<any>> =>
    ipcRenderer.invoke(IPC_CHANNELS.DB_GET_RECOMMENDATIONS),
  semanticSearch: (query: string): Promise<IpcResult<any>> =>
    ipcRenderer.invoke(IPC_CHANNELS.AI_SEMANTIC_SEARCH, query),

  // ---- Steam ----
  steamSync: (): Promise<IpcResult<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.STEAM_SYNC),
  steamLogin: (): Promise<IpcResult<string>> =>
    ipcRenderer.invoke(IPC_CHANNELS.STEAM_LOGIN),
  getSteamProfile: (): Promise<IpcResult<unknown>> =>
    ipcRenderer.invoke(IPC_CHANNELS.STEAM_GET_PROFILE),
  steamCheckAuth: (): Promise<IpcResult<boolean>> =>
    ipcRenderer.invoke(IPC_CHANNELS.STEAM_CHECK_AUTH),

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
    searchUsers: (query: string): Promise<IpcResult<any[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.FRIENDS_SEARCH, query),
    sendFriendRequest: (friendId: string): Promise<IpcResult<boolean>> =>
      ipcRenderer.invoke(IPC_CHANNELS.FRIENDS_SEND_REQUEST, friendId),
    acceptFriendRequest: (userId: string): Promise<IpcResult<boolean>> =>
      ipcRenderer.invoke(IPC_CHANNELS.FRIENDS_ACCEPT_REQUEST, userId),
    removeFriend: (userId: string): Promise<IpcResult<boolean>> =>
      ipcRenderer.invoke(IPC_CHANNELS.FRIENDS_REMOVE, userId),
    getFriends: (): Promise<IpcResult<any[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.FRIENDS_GET_ALL),
    getPendingRequests: (): Promise<IpcResult<any[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.FRIENDS_GET_PENDING),
    getOutgoingRequests: (): Promise<IpcResult<string[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.FRIENDS_GET_OUTGOING)
  }
}

export type GameMindAPI = typeof api

contextBridge.exposeInMainWorld('api', api)
