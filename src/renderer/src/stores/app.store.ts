// ============================================================
// App Store — Global application state
// ============================================================

import { create } from 'zustand'

interface AppState {
  isLoading: boolean
  isSyncing: boolean
  syncProgress: number
  syncStep: string
  steamId: string
  isConnected: boolean
  currentPage: string

  setLoading: (loading: boolean) => void
  setSyncing: (syncing: boolean, progress?: number, step?: string) => void
  setSteamId: (id: string) => void
  setConnected: (connected: boolean) => void
  setCurrentPage: (page: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  isLoading: true,
  isSyncing: false,
  syncProgress: 0,
  syncStep: '',
  steamId: '',
  isConnected: false,
  currentPage: 'dashboard',

  setLoading: (isLoading): void => set({ isLoading }),
  setSyncing: (isSyncing, progress = 0, step = ''): void =>
    set({ isSyncing, syncProgress: progress, syncStep: step }),
  setSteamId: (steamId): void => set({ steamId }),
  setConnected: (isConnected): void => set({ isConnected }),
  setCurrentPage: (currentPage): void => set({ currentPage })
}))
