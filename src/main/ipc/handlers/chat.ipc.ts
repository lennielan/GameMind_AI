// ============================================================
// Chat IPC Handlers — Bridge for messages & muting
// ============================================================

import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/constants/ipc-channels'
import { messagesService } from '../../services/messages.service'
import { mutingService, MuteDuration } from '../../services/muting.service'
import { realtimeService } from '../../services/realtime.service'
import { logger } from '../../logger/logger'
import type { IpcResult } from '@shared/types'
import { z } from 'zod'

const uuidSchema = z.string().uuid()
const contentSchema = z.string().min(1).max(2000)
const muteDurationSchema = z.enum(['1h', '8h', '24h', 'forever'])

export function registerChatIpc(): void {
  // ── Messages ──────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.CHAT_GET_CONVERSATIONS, async (): Promise<IpcResult<any[]>> => {
    try {
      const conversations = await messagesService.getConversations()
      return { success: true, data: conversations, error: null }
    } catch (e: any) {
      logger.error('ChatIPC', 'Error getting conversations', e)
      return { success: false, data: [], error: e.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.CHAT_GET_MESSAGES, async (_event, partnerId: string): Promise<IpcResult<any[]>> => {
    try {
      const validId = uuidSchema.parse(partnerId)
      const messages = await messagesService.getMessages(validId)
      return { success: true, data: messages, error: null }
    } catch (e: any) {
      logger.error('ChatIPC', 'Error getting messages', e)
      return { success: false, data: [], error: e.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.CHAT_SEND_MESSAGE, async (_event, receiverId: string, content: string, replyToId?: string): Promise<IpcResult<any>> => {
    try {
      const validId = uuidSchema.parse(receiverId)
      const validContent = contentSchema.parse(content)
      const message = await messagesService.sendMessage(validId, validContent, replyToId)
      if (!message) {
        return { success: false, data: null, error: 'Failed to send message (privacy check or validation)' }
      }
      return { success: true, data: message, error: null }
    } catch (e: any) {
      logger.error('ChatIPC', 'Error sending message', e)
      return { success: false, data: null, error: e.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.CHAT_MARK_READ, async (_event, partnerId: string): Promise<IpcResult<boolean>> => {
    try {
      const validId = uuidSchema.parse(partnerId)
      const success = await messagesService.markAsRead(validId)
      return { success: true, data: success, error: null }
    } catch (e: any) {
      logger.error('ChatIPC', 'Error marking messages read', e)
      return { success: false, data: false, error: e.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.CHAT_GET_UNREAD_COUNT, async (): Promise<IpcResult<number>> => {
    try {
      const count = await messagesService.getUnreadCount()
      return { success: true, data: count, error: null }
    } catch (e: any) {
      logger.error('ChatIPC', 'Error getting unread count', e)
      return { success: false, data: 0, error: e.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.CHAT_EDIT_MESSAGE, async (_event, messageId: string, newContent: string): Promise<IpcResult<any>> => {
    try {
      const validId = uuidSchema.parse(messageId)
      const validContent = contentSchema.parse(newContent)
      const message = await messagesService.editMessage(validId, validContent)
      if (!message) {
        return { success: false, data: null, error: 'Failed to edit message' }
      }
      return { success: true, data: message, error: null }
    } catch (e: any) {
      logger.error('ChatIPC', 'Error editing message', e)
      return { success: false, data: null, error: e.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.CHAT_DELETE_MESSAGE, async (_event, messageId: string, deleteForBoth: boolean): Promise<IpcResult<boolean>> => {
    try {
      const validId = uuidSchema.parse(messageId)
      const success = await messagesService.deleteMessage(validId, deleteForBoth)
      return { success: true, data: success, error: null }
    } catch (e: any) {
      logger.error('ChatIPC', 'Error deleting message', e)
      return { success: false, data: false, error: e.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.CHAT_TOGGLE_PIN, async (_event, partnerId: string): Promise<IpcResult<{pinned?: boolean}>> => {
    try {
      const validId = uuidSchema.parse(partnerId)
      const result = await messagesService.togglePinChat(validId)
      if (!result.success) {
        return { success: false, data: {}, error: result.error || 'Unknown error' }
      }
      return { success: true, data: { pinned: result.pinned }, error: null }
    } catch (e: any) {
      logger.error('ChatIPC', 'Error toggling pin', e)
      return { success: false, data: {}, error: e.message }
    }
  })

  // ── Muting ────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.MUTE_USER, async (_event, targetId: string, duration: string): Promise<IpcResult<boolean>> => {
    try {
      const validId = uuidSchema.parse(targetId)
      const validDuration = muteDurationSchema.parse(duration) as MuteDuration
      const success = await mutingService.muteUser(validId, validDuration)
      return { success: true, data: success, error: null }
    } catch (e: any) {
      logger.error('ChatIPC', 'Error muting user', e)
      return { success: false, data: false, error: e.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.MUTE_UNMUTE_USER, async (_event, targetId: string): Promise<IpcResult<boolean>> => {
    try {
      const validId = uuidSchema.parse(targetId)
      const success = await mutingService.unmuteUser(validId)
      return { success: true, data: success, error: null }
    } catch (e: any) {
      logger.error('ChatIPC', 'Error unmuting user', e)
      return { success: false, data: false, error: e.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.MUTE_IS_MUTED, async (_event, targetId: string): Promise<IpcResult<boolean>> => {
    try {
      const validId = uuidSchema.parse(targetId)
      const muted = await mutingService.isMuted(validId)
      return { success: true, data: muted, error: null }
    } catch (e: any) {
      logger.error('ChatIPC', 'Error checking mute status', e)
      return { success: false, data: false, error: e.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.MUTE_GET_ALL, async (): Promise<IpcResult<any[]>> => {
    try {
      const muted = await mutingService.getMutedUsers()
      return { success: true, data: muted, error: null }
    } catch (e: any) {
      logger.error('ChatIPC', 'Error getting muted users', e)
      return { success: false, data: [], error: e.message }
    }
  })

  // ── Realtime: forward messages events to renderer ─────────
  realtimeService.on('messages-update', (payload) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send(IPC_CHANNELS.CHAT_REALTIME_UPDATE, payload)
    })
  })

  logger.info('ChatIPC', 'Chat IPC handlers registered')
}
