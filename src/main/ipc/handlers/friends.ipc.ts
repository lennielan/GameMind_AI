import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipc-channels'
import { friendsService } from '../../services/friends.service'
import { realtimeService } from '../../services/realtime.service'
import { logger } from '../../logger/logger'
import type { IpcResult } from '@shared/types'
import { z } from 'zod'

const searchSchema = z.string().min(1).max(100)
const uuidSchema = z.string().uuid()

export function registerFriendsIpc(): void {
  ipcMain.handle(IPC_CHANNELS.FRIENDS_SEARCH, async (_event, query: string): Promise<IpcResult<any[]>> => {
    try {
      const validQuery = searchSchema.parse(query)
      const results = await friendsService.searchUsers(validQuery)
      return { success: true, data: results, error: null }
    } catch (e: any) {
      logger.error('FriendsIPC', 'Error searching friends', e)
      return { success: false, data: [], error: e.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.FRIENDS_SEND_REQUEST, async (_event, friendId: string): Promise<IpcResult<boolean>> => {
    try {
      const validId = uuidSchema.parse(friendId)
      const success = await friendsService.sendFriendRequest(validId)
      return { success: true, data: success, error: null }
    } catch (e: any) {
      logger.error('FriendsIPC', 'Error sending friend request', e)
      return { success: false, data: false, error: e.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.FRIENDS_ACCEPT_REQUEST, async (_event, userId: string): Promise<IpcResult<boolean>> => {
    try {
      const validId = uuidSchema.parse(userId)
      const success = await friendsService.acceptFriendRequest(validId)
      return { success: true, data: success, error: null }
    } catch (e: any) {
      logger.error('FriendsIPC', 'Error accepting friend request', e)
      return { success: false, data: false, error: e.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.FRIENDS_REMOVE, async (_event, userId: string): Promise<IpcResult<boolean>> => {
    try {
      const validId = uuidSchema.parse(userId)
      const success = await friendsService.removeFriend(validId)
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

  ipcMain.handle(IPC_CHANNELS.FRIENDS_GET_OUTGOING, async (): Promise<IpcResult<any[]>> => {
    try {
      const requests = await friendsService.getOutgoingRequests()
      return { success: true, data: requests, error: null }
    } catch (e: any) {
      logger.error('FriendsIPC', 'Error getting outgoing requests', e)
      return { success: false, data: [], error: e.message }
    }
  })

  // Forward realtime updates to renderer
  realtimeService.on('friends-update', (payload) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send(IPC_CHANNELS.FRIENDS_REALTIME_UPDATE, payload)
    })
  })

  logger.info('FriendsIPC', 'Friends IPC handlers registered')
}
