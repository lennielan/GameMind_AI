import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipc-channels'
import { friendsService } from '../services/friends.service'
import { logger } from '../logger/logger'
import type { IpcResult } from '@shared/types'

export function registerFriendsIpc(): void {
  ipcMain.handle(IPC_CHANNELS.FRIENDS_SEARCH, async (_event, query: string): Promise<IpcResult<any[]>> => {
    try {
      const results = await friendsService.searchUsers(query)
      return { success: true, data: results, error: null }
    } catch (e: any) {
      logger.error('FriendsIPC', 'Error searching friends', e)
      return { success: false, data: [], error: e.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.FRIENDS_SEND_REQUEST, async (_event, friendId: string): Promise<IpcResult<boolean>> => {
    try {
      const success = await friendsService.sendFriendRequest(friendId)
      return { success: true, data: success, error: null }
    } catch (e: any) {
      logger.error('FriendsIPC', 'Error sending friend request', e)
      return { success: false, data: false, error: e.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.FRIENDS_ACCEPT_REQUEST, async (_event, userId: string): Promise<IpcResult<boolean>> => {
    try {
      const success = await friendsService.acceptFriendRequest(userId)
      return { success: true, data: success, error: null }
    } catch (e: any) {
      logger.error('FriendsIPC', 'Error accepting friend request', e)
      return { success: false, data: false, error: e.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.FRIENDS_REMOVE, async (_event, userId: string): Promise<IpcResult<boolean>> => {
    try {
      const success = await friendsService.removeFriend(userId)
      return { success: true, data: success, error: null }
    } catch (e: any) {
      logger.error('FriendsIPC', 'Error removing friend', e)
      return { success: false, data: false, error: e.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.FRIENDS_GET_ALL, async (): Promise<IpcResult<any[]>> => {
    try {
      const friends = await friendsService.getFriends()
      return { success: true, data: friends, error: null }
    } catch (e: any) {
      logger.error('FriendsIPC', 'Error getting friends', e)
      return { success: false, data: [], error: e.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.FRIENDS_GET_PENDING, async (): Promise<IpcResult<any[]>> => {
    try {
      const requests = await friendsService.getPendingRequests()
      return { success: true, data: requests, error: null }
    } catch (e: any) {
      logger.error('FriendsIPC', 'Error getting pending requests', e)
      return { success: false, data: [], error: e.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.FRIENDS_GET_OUTGOING, async (): Promise<IpcResult<string[]>> => {
    try {
      const requests = await friendsService.getOutgoingRequests()
      return { success: true, data: requests, error: null }
    } catch (e: any) {
      logger.error('FriendsIPC', 'Error getting outgoing requests', e)
      return { success: false, data: [], error: e.message }
    }
  })

  logger.info('FriendsIPC', 'Friends IPC handlers registered')
}
