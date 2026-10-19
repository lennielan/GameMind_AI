// ============================================================
// Messages Service — Supabase chat operations
// ============================================================

import { supabase } from './supabase.client'
import { friendsService } from './friends.service'

export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  is_read: boolean
  created_at: string
  is_edited?: boolean
  reply_to_id?: string | null
  deleted_for?: string[]
}

export interface Conversation {
  user_id: string
  username: string
  avatar_url: string | null
  numeric_id: number | null
  last_seen?: string | null
  created_at?: string | null
  last_message: string
  last_message_at: string
  unread_count: number
  is_pinned?: boolean
}

export class MessagesService {
  /**
   * Get all conversations (chat list) for the current user.
   * Uses server-side RPC to aggregate conversations efficiently in PostgreSQL
   * instead of downloading all messages to the client.
   */
  async getConversations(): Promise<Conversation[]> {
    if (!supabase) return []

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return []

    const userId = session.user.id

    // Call the server-side RPC function for efficient aggregation
    const { data: conversations, error } = await supabase
      .rpc('get_conversations', { p_user_id: userId })

    if (error) {
      console.error('Error fetching conversations via RPC:', error)
    }

    const convList = conversations || []
    const friends = await friendsService.getFriends()
    
    const conversationMap = new Map()
    convList.forEach((conv: any) => conversationMap.set(conv.user_id, conv))
    
    friends.forEach((friend: any) => {
      if (!conversationMap.has(friend.id)) {
        conversationMap.set(friend.id, {
          user_id: friend.id,
          username: friend.username,
          avatar_url: friend.avatar_url || null,
          numeric_id: friend.numeric_id || null,
          last_seen: friend.last_seen || null,
          created_at: friend.created_at || null,
          last_message: '',
          last_message_at: new Date(0).toISOString(),
          unread_count: 0
        })
      }
    })
    
    const mergedConversations = Array.from(conversationMap.values())

    if (mergedConversations.length === 0) return []

    // Fetch user's pinned chats
    const { data: userSettings } = await supabase
      .from('users')
      .select('pinned_chats')
      .eq('id', userId)
      .single()

    const pinnedChats: string[] = userSettings?.pinned_chats || []

    // Map and add pinned status
    const result: Conversation[] = mergedConversations.map((conv: any) => ({
      user_id: conv.user_id,
      username: conv.username || 'Unknown',
      avatar_url: conv.avatar_url || null,
      numeric_id: conv.numeric_id || null,
      last_seen: conv.last_seen || null,
      created_at: conv.created_at || null,
      last_message: conv.last_message,
      last_message_at: conv.last_message_at,
      unread_count: Number(conv.unread_count) || 0,
      is_pinned: pinnedChats.includes(conv.user_id)
    }))

    // Sort by: pinned first, then by last message time (newest first)
    result.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1
      if (!a.is_pinned && b.is_pinned) return 1
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    })

    return result
  }

  /**
   * Get message history with a specific user.
   */
  async getMessages(partnerId: string, limit = 50): Promise<Message[]> {
    if (!supabase) return []

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return []

    const userId = session.user.id

    // Check retention setting
    const { data: userSettings } = await supabase
      .from('users')
      .select('message_retention')
      .eq('id', userId)
      .single()

    const retention = userSettings?.message_retention || 'forever'

    let query = supabase
      .from('messages')
      .select('*, reply_to:reply_to_id(id, content, sender_id)')
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),` +
        `and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`
      )
      .not('deleted_for', 'cs', `{${userId}}`)
      .order('created_at', { ascending: true })
      .limit(limit)

    // If retention is 24h, only fetch messages from last 24 hours
    if (retention === '24h') {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('created_at', cutoff)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching messages:', error)
      return []
    }
    
    return (data || []) as Message[]
  }

  /**
   * Send a message to a user.
   * Checks chat_privacy of the receiver before sending.
   */
  async sendMessage(receiverId: string, content: string, replyToId?: string): Promise<Message | null> {
    if (!supabase) return null

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null

    const senderId = session.user.id
    const trimmed = content.trim()
    if (!trimmed || trimmed.length > 2000) return null

    // Check receiver's chat_privacy
    const { data: receiver } = await supabase
      .rpc('get_user_profile', { p_id: receiverId })

    if (receiver?.chat_privacy === 'friends_only') {
      // Check if they are friends
      const { data: friendship } = await supabase
        .from('friends')
        .select('status')
        .or(
          `and(user_id.eq.${senderId},friend_id.eq.${receiverId}),` +
          `and(user_id.eq.${receiverId},friend_id.eq.${senderId})`
        )
        .eq('status', 'accepted')
        .limit(1)

      if (!friendship || friendship.length === 0) {
        console.warn('Cannot send message: receiver has friends_only privacy')
        return null
      }
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content: trimmed,
        reply_to_id: replyToId || null
      })
      .select('*, reply_to:reply_to_id(id, content, sender_id)')
      .single()

    if (error) {
      console.error('Error sending message:', error)
      return null
    }

    return data as Message
  }

  /**
   * Mark all messages from a partner as read.
   */
  async markAsRead(partnerId: string): Promise<boolean> {
    if (!supabase) return false

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return false

    const { error } = await supabase
      .rpc('mark_messages_as_read', { p_sender_id: partnerId })

    if (error) {
      console.error('Error marking messages as read:', error)
      return false
    }

    return true
  }

  /**
   * Get total unread message count across all conversations.
   */
  async getUnreadCount(): Promise<number> {
    if (!supabase) return 0

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return 0

    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', session.user.id)
      .eq('is_read', false)
      .not('deleted_for', 'cs', `{${session.user.id}}`)

    if (error) {
      console.error('Error getting unread count:', error)
      return 0
    }

    return count || 0
  }

  /**
   * Edit a message
   */
  async editMessage(messageId: string, newContent: string): Promise<Message | null> {
    if (!supabase) return null
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null

    const { data, error } = await supabase
      .from('messages')
      .update({ content: newContent, is_edited: true })
      .eq('id', messageId)
      .eq('sender_id', session.user.id)
      .select('*, reply_to:reply_to_id(id, content, sender_id)')
      .single()

    if (error) {
      console.error('Error editing message:', error)
      return null
    }

    return data as Message
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string, deleteForBoth: boolean): Promise<boolean> {
    if (!supabase) return false
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return false

    const userId = session.user.id

    // Get current message to know who the other person is
    const { data: msg } = await supabase
      .from('messages')
      .select('sender_id, receiver_id, deleted_for')
      .eq('id', messageId)
      .single()

    if (!msg) return false

    if (deleteForBoth && msg.sender_id === userId) {
      // Delete for both (add both users to deleted_for array)
      const toDeleteFor = Array.from(new Set([...(msg.deleted_for || []), msg.sender_id, msg.receiver_id]))
      const { error } = await supabase
        .from('messages')
        .update({ deleted_for: toDeleteFor })
        .eq('id', messageId)

      return !error
    } else {
      // Delete only for self
      const toDeleteFor = Array.from(new Set([...(msg.deleted_for || []), userId]))
      const { error } = await supabase
        .from('messages')
        .update({ deleted_for: toDeleteFor })
        .eq('id', messageId)
        
      return !error
    }
  }

  /**
   * Toggle pin chat
   */
  async togglePinChat(partnerId: string): Promise<{ success: boolean; pinned?: boolean; error?: string }> {
    if (!supabase) return { success: false, error: 'No DB connection' }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { success: false, error: 'Not authenticated' }

    const userId = session.user.id

    // Fetch current pinned
    const { data: userSettings } = await supabase
      .from('users')
      .select('pinned_chats')
      .eq('id', userId)
      .single()

    let pinned: string[] = userSettings?.pinned_chats || []
    let isPinned = false

    if (pinned.includes(partnerId)) {
      pinned = pinned.filter(id => id !== partnerId)
      isPinned = false
    } else {
      if (pinned.length >= 5) {
        return { success: false, error: 'PIN_LIMIT_REACHED' }
      }
      pinned.push(partnerId)
      isPinned = true
    }

    const { error } = await supabase
      .from('users')
      .update({ pinned_chats: pinned })
      .eq('id', userId)

    if (error) {
      console.error('Error toggling pin:', error)
      return { success: false, error: error.message }
    }

    return { success: true, pinned: isPinned }
  }
}

export const messagesService = new MessagesService()
