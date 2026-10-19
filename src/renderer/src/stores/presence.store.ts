import { create } from 'zustand'

export interface UserPresenceData {
  isOnline: boolean
  currentGame?: string | null
}

interface PresenceState {
  onlineUserIds: Set<string>
  onlineUsers: Record<string, UserPresenceData>
  setOnlineUsers: (ids: string[]) => void
  addOnlineUser: (id: string, currentGame?: string | null) => void
  removeOnlineUser: (id: string) => void
  setOnlinePresenceMap: (map: Record<string, UserPresenceData>) => void
}

export const usePresenceStore = create<PresenceState>((set) => ({
  onlineUserIds: new Set(),
  onlineUsers: {},
  setOnlineUsers: (ids) => set((state) => {
    const newMap: Record<string, UserPresenceData> = {}
    ids.forEach(id => {
      newMap[id] = state.onlineUsers[id] || { isOnline: true, currentGame: null }
    })
    return { onlineUserIds: new Set(ids), onlineUsers: newMap }
  }),
  addOnlineUser: (id, currentGame) => set((state) => {
    const newSet = new Set(state.onlineUserIds)
    newSet.add(id)
    return {
      onlineUserIds: newSet,
      onlineUsers: {
        ...state.onlineUsers,
        [id]: { isOnline: true, currentGame: currentGame || state.onlineUsers[id]?.currentGame || null }
      }
    }
  }),
  removeOnlineUser: (id) => set((state) => {
    const newSet = new Set(state.onlineUserIds)
    newSet.delete(id)
    const newMap = { ...state.onlineUsers }
    delete newMap[id]
    return { onlineUserIds: newSet, onlineUsers: newMap }
  }),
  setOnlinePresenceMap: (map) => set({
    onlineUsers: map,
    onlineUserIds: new Set(Object.keys(map))
  })
}))
