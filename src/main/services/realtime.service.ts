import { supabase } from './supabase.client'
import { logger } from '../logger/logger'
import { EventEmitter } from 'events'
import { configManager } from '../config/config-manager'
import { mutingService } from './muting.service'
import { overlayManager } from '../overlay-manager'

class RealtimeService extends EventEmitter {
  private channel: any = null
  private messagesChannel: any = null
  private currentUserId: string | null = null
  private isAppFocused: boolean = true // Default to true, renderer will sync this

  public setAppFocused(focused: boolean): void {
    this.isAppFocused = focused
  }

  public async initialize(): Promise<void> {
    if (!supabase) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    this.currentUserId = session.user.id

    if (this.channel) {
      supabase.removeChannel(this.channel)
      this.channel = null
    }
    if (this.messagesChannel) {
      supabase.removeChannel(this.messagesChannel)
      this.messagesChannel = null
    }

    // Subscribe to friends changes filtered by current user (as initiator or target)
    this.channel = supabase.channel(`friends:${this.currentUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friends', filter: `user_id=eq.${this.currentUserId}` },
        (payload) => {
          this.handleFriendsChange(payload)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friends', filter: `friend_id=eq.${this.currentUserId}` },
        (payload) => {
          this.handleFriendsChange(payload)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('RealtimeService', 'Subscribed to filtered friends changes')
        }
      })

    // Subscribe to messages where user is receiver (incoming) or sender (own sent confirmations)
    this.messagesChannel = supabase.channel(`messages:${this.currentUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${this.currentUserId}` },
        (payload) => {
          this.handleMessagesChange(payload)
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${this.currentUserId}` },
        (payload) => {
          this.handleMessagesChange(payload)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${this.currentUserId}` },
        (payload) => {
          this.handleMessagesChange(payload)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `sender_id=eq.${this.currentUserId}` },
        (payload) => {
          this.handleMessagesChange(payload)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('RealtimeService', 'Subscribed to filtered messages changes')
        }
      })
  }

  private handleFriendsChange(payload: any): void {
    if (!this.currentUserId) return

    const { new: newRow, old: oldRow, eventType } = payload

    const isRelevant = 
      (newRow && (newRow.user_id === this.currentUserId || newRow.friend_id === this.currentUserId)) ||
      (oldRow && (oldRow.user_id === this.currentUserId || oldRow.friend_id === this.currentUserId))

    if (isRelevant) {
      logger.info('RealtimeService', `Received relevant ${eventType} event for friends table`)
      this.emit('friends-update', payload)
    }
  }

  public shutdown(): void {
    if (this.channel) {
      if (supabase) supabase.removeChannel(this.channel)
      this.channel = null
    }
    if (this.messagesChannel) {
      if (supabase) supabase.removeChannel(this.messagesChannel)
      this.messagesChannel = null
    }
  }

  private handleMessagesChange(payload: any): void {
    if (!this.currentUserId) return

    const { new: newRow, eventType } = payload

    if (eventType === 'DELETE') {
      logger.info('RealtimeService', 'Received DELETE event for message')
      this.emit('messages-update', payload)
      return
    }

    if (newRow && (newRow.receiver_id === this.currentUserId || newRow.sender_id === this.currentUserId)) {
      logger.info('RealtimeService', `Received ${eventType} event for message from ${newRow.sender_id} to ${newRow.receiver_id}`)
      this.emit('messages-update', payload)

      // Global overlay logic
      if (eventType === 'INSERT' && newRow.receiver_id === this.currentUserId) {
        const isOverlayEnabled = configManager.get('chatOverlayEnabled') ?? true
        if (isOverlayEnabled && !mutingService.isMuted(newRow.sender_id)) {
          // Only show overlay if the renderer has explicitly reported it is not focused
          if (!this.isAppFocused) {
            this.fetchAndShowOverlayNotification(newRow)
          }
        }
      }
    }
  }

  private async fetchAndShowOverlayNotification(newRow: any): Promise<void> {
    let sender: { username: string; avatar_url: string } | null = null
    if (supabase) {
      try {
        const { data } = await supabase
          .from('users')
          .select('username, avatar_url')
          .eq('id', newRow.sender_id)
          .single()
        if (data) sender = data
      } catch (e) {
        logger.warn('RealtimeService', 'Could not fetch sender info for overlay', e)
      }
    }
    overlayManager.showNotification({
      ...newRow,
      sender
    })
  }
}

export const realtimeService = new RealtimeService()
