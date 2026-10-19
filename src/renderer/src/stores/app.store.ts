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
  hasUnreadChats: boolean
  hasNewJournal: boolean
  cachedConversations: any[] | null
  isGeneratingRecs: boolean
  isGeneratingDna: boolean

  setLoading: (loading: boolean) => void
  setSyncing: (syncing: boolean, progress?: number, step?: string) => void
  setSteamId: (id: string) => void
  setConnected: (connected: boolean) => void
  setCurrentPage: (page: string) => void
  setHasUnreadChats: (has: boolean) => void
  setHasNewJournal: (has: boolean) => void
  setCachedConversations: (convs: any[] | null) => void
  setIsGeneratingRecs: (isGenerating: boolean) => void
  setIsGeneratingDna: (isGenerating: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  isLoading: true,
  isSyncing: false,
  syncProgress: 0,
  syncStep: '',
  steamId: '',
  isConnected: false,
  currentPage: 'dashboard',
  hasUnreadChats: false,
  hasNewJournal: false,
  cachedConversations: null,
  isGeneratingRecs: false,
  isGeneratingDna: false,

  setLoading: (loading) => set({ isLoading: loading }),
  setSyncing: (syncing, progress = 0, step = '') => set({ isSyncing: syncing, syncProgress: progress, syncStep: step }),
  setSteamId: (id) => set({ steamId: id }),
  setConnected: (connected) => set({ isConnected: connected }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setHasUnreadChats: (has) => set({ hasUnreadChats: has }),
  setHasNewJournal: (has) => set({ hasNewJournal: has }),
  setCachedConversations: (convs) => set({ cachedConversations: convs }),
  setIsGeneratingRecs: (isGenerating) => set({ isGeneratingRecs: isGenerating }),
  setIsGeneratingDna: (isGenerating) => set({ isGeneratingDna: isGenerating }),
}))
