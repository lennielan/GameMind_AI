import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipc-channels'
import { userProfileRepository } from '../../database/repository.factory'
import { favoritesRepository } from '../../database/repository.factory'

export function registerFavoritesIpc(): void {
  ipcMain.handle(IPC_CHANNELS.FAVORITES_ADD, async (_event, data: any) => {
    try {
      const profile = userProfileRepository.getProfile()
      if (!profile) throw new Error('Not logged in')
      
      await favoritesRepository.addToFavorites(profile.steamId, data)
      return { success: true, data: null }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.FAVORITES_REMOVE, async (_event, gameName: string) => {
    try {
      const profile = userProfileRepository.getProfile()
      if (!profile) throw new Error('Not logged in')
      
      await favoritesRepository.removeFromFavorites(profile.steamId, gameName)
      return { success: true, data: null }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.FAVORITES_GET_ALL, async () => {
    try {
      const profile = userProfileRepository.getProfile()
      if (!profile) throw new Error('Not logged in')
      
      const favorites = await favoritesRepository.getFavorites(profile.steamId)
      return { success: true, data: favorites }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.FAVORITES_IS_FAVORITE, async (_event, gameName: string) => {
    try {
      const profile = userProfileRepository.getProfile()
      if (!profile) return { success: true, data: false }
      
      const isFav = await favoritesRepository.isFavorite(profile.steamId, gameName)
      return { success: true, data: isFav }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.FAVORITES_AI_REVIEW, async (_event, gameName: string, context?: any, force?: boolean) => {
    try {
      const profile = userProfileRepository.getProfile()
      if (!profile) throw new Error('Not logged in')
      
      const { favoritesService } = await import('../../services/favorites.service')
      const review = await favoritesService.generateAiReview(profile.steamId, gameName, typeof context === 'string' ? context : undefined, force)
      return { success: true, data: review }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
}
