import React, { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  MessageSquare,
  Send,
  BellOff,
  Bell,
  UserX,
  Clock,
  Pin,
  Reply,
  Edit2,
  Trash2,
  X,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useVirtualizer } from '@tanstack/react-virtual'
import { supabase } from '../../services/supabase.client'
import { usePresenceStore } from '../../stores/presence.store'
import { useAppStore } from '../../stores/app.store'
import { ChatMessage } from './components/ChatMessage'
import { SocialAuthPrompt } from '../../components/ui/SocialAuthPrompt'
import { formatLastSeen } from '../../utils/format-last-seen'
import styles from './ChatsPage.module.css'

interface Conversation {
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

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  is_read: boolean
  created_at: string
  is_edited?: boolean
  reply_to_id?: string | null
  reply_to?: { id: string, content: string, sender_id: string }
}

export function ChatsPage(): React.JSX.Element {
  const { t } = useTranslation()
  const { onlineUserIds } = usePresenceStore()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedPartner, setSelectedPartner] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [showMuteMenu, setShowMuteMenu] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // Advanced features state
  const [chatContextMenu, setChatContextMenu] = useState<{x: number, y: number, partnerId: string, isPinned: boolean} | null>(null)
  const [msgContextMenu, setMsgContextMenu] = useState<{x: number, y: number, msg: Message} | null>(null)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [editingMsg, setEditingMsg] = useState<Message | null>(null)
  const [deletingMsg, setDeletingMsg] = useState<Message | null>(null)

  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const muteMenuRef = useRef<HTMLDivElement>(null)
  const chatMenuRef = useRef<HTMLDivElement>(null)
  const msgMenuRef = useRef<HTMLDivElement>(null)
  
  const navigate = useNavigate()
  const location = useLocation()
  const handledTarget = useRef(false)

  const [session, setSession] = useState<any>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [isLoadingChats, setIsLoadingChats] = useState(!useAppStore.getState().cachedConversations)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [mutedUserIds, setMutedUserIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!supabase) {
      setAuthChecked(true)
      setIsLoadingChats(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthChecked(true)
      if (!session) {
        setIsLoadingChats(false)
      }
    })

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setAuthChecked(true)
      if (!session) {
        setIsLoadingChats(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const cached = useAppStore.getState().cachedConversations;
    if (cached && session) {
      setConversations(cached);
    }
  }, [session])

  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => messagesContainerRef.current,
    estimateSize: () => 60,
    overscan: 10,
  })

  const loadMutedUsers = async () => {
    try {
      const res = await window.api.mute.getAll()
      if (res.success && res.data) {
        setMutedUserIds(new Set(res.data.map(u => u.muted_user_id)))
      }
    } catch (e) {}
  }

  const fetchLastSeenForConversations = async (convs: Conversation[]) => {
    if (!supabase || convs.length === 0) return
    try {
      const userIds = convs.map(c => c.user_id)
      const { data } = await supabase
        .from('users')
        .select('id, last_seen, created_at')
        .in('id', userIds)
      
      if (data && data.length > 0) {
        const map = new Map(data.map(u => [u.id, u]))
        setConversations(prev => prev.map(c => ({
          ...c,
          last_seen: map.get(c.user_id)?.last_seen || c.last_seen,
          created_at: map.get(c.user_id)?.created_at || c.created_at
        })))
      }
    } catch (e) {}
  }

  const fetchPartnerLastSeen = async (partnerId: string) => {
    if (!supabase) return
    try {
      const { data } = await supabase
        .from('users')
        .select('last_seen, created_at')
        .eq('id', partnerId)
        .single()
      
      if (data) {
        setSelectedPartner(prev => prev && prev.user_id === partnerId ? {
          ...prev,
          last_seen: data.last_seen || prev.last_seen,
          created_at: data.created_at || prev.created_at
        } : prev)
      }
    } catch (e) {}
  }

  const loadConversations = async () => {
    try {
      const res = await window.api.chat.getConversations()
      if (res.success) {
        const convList = res.data || []
        setConversations(convList)
        useAppStore.getState().setHasUnreadChats(convList.some(c => c.unread_count > 0))
        useAppStore.getState().setCachedConversations(convList)
        fetchLastSeenForConversations(convList)
        return convList
      }
    } catch (e) {
      console.error('Failed to load conversations:', e)
    } finally {
      setIsLoadingChats(false)
    }
    return []
  }

  const loadMessages = async (partnerId: string) => {
    try {
      const res = await window.api.chat.getMessages(partnerId)
      if (res.success) {
        setMessages(res.data || [])
      }
      
      await window.api.chat.markRead(partnerId)
      await loadConversations()
    } catch (e) {
      console.error('Failed to load messages:', e)
    }
  }

  const checkMuteStatus = async (partnerId: string) => {
    try {
      const res = await window.api.mute.isMuted(partnerId)
      if (res.success) {
        setIsMuted(res.data || false)
      }
    } catch (e) {}
  }

  useEffect(() => {
    if (!session) return

    let cleanup: (() => void) | undefined

    const init = async () => {
      await loadMutedUsers()
      const convs = await loadConversations()

      const state = location.state as { targetUserId?: string }
      if (state?.targetUserId && !handledTarget.current) {
        handledTarget.current = true
        const existing = convs?.find(c => c.user_id === state.targetUserId)
        if (existing) {
          setSelectedPartner(existing)
        } else if (supabase) {
          try {
            const { data } = await supabase
              .rpc('get_user_profile', { p_id: state.targetUserId })

            if (data) {
              const newConv: Conversation = {
                user_id: data.id,
                username: data.username,
                avatar_url: data.avatar_url,
                numeric_id: data.numeric_id,
                last_seen: data.last_seen || null,
                created_at: data.created_at || null,
                last_message: '',
                last_message_at: new Date().toISOString(),
                unread_count: 0
              }
              setConversations(prev => [newConv, ...prev])
              setSelectedPartner(newConv)
            }
          } catch (e) {}
        }
      }

      cleanup = window.api.chat.onRealtimeUpdate(async (payload: any) => {
        if (payload.eventType) {
          await loadConversations()
        }
      })
    }

    init()

    return () => {
      if (cleanup) cleanup()
    }
  }, [session, location.state])

  useEffect(() => {
    if (!selectedPartner) return

    const cleanup = window.api.chat.onRealtimeUpdate(async (payload: any) => {
      const { new: newMsg, eventType } = payload
      
      if (eventType === 'INSERT' && newMsg) {
        if (newMsg.sender_id === selectedPartner.user_id || newMsg.receiver_id === selectedPartner.user_id) {
          await loadMessages(selectedPartner.user_id)
        }
      } else if (eventType === 'UPDATE' && newMsg) {
        if (newMsg.sender_id === selectedPartner.user_id || newMsg.receiver_id === selectedPartner.user_id) {
          await loadMessages(selectedPartner.user_id)
        }
      } else if (eventType === 'DELETE') {
        await loadMessages(selectedPartner.user_id)
      }
    })

    return () => {
      cleanup()
    }
  }, [selectedPartner])

  useEffect(() => {
    if (selectedPartner) {
      setIsLoadingMessages(true)
      Promise.all([
        loadMessages(selectedPartner.user_id),
        checkMuteStatus(selectedPartner.user_id),
        fetchPartnerLastSeen(selectedPartner.user_id)
      ]).finally(() => {
        setIsLoadingMessages(false)
      })
      setShowMuteMenu(false)
      setReplyingTo(null)
      setEditingMsg(null)
      setInputText('')
    }
  }, [selectedPartner?.user_id])

  useEffect(() => {
    if (messages.length > 0) {
      rowVirtualizer.scrollToIndex(messages.length - 1, { align: 'end' })
    }
  }, [messages, rowVirtualizer])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (muteMenuRef.current && !muteMenuRef.current.contains(target)) {
        setShowMuteMenu(false)
      }
      
      let chatMenuClicked = false
      let msgMenuClicked = false
      
      if (chatMenuRef.current && chatMenuRef.current.contains(target)) {
        chatMenuClicked = true
      }
      if (msgMenuRef.current && msgMenuRef.current.contains(target)) {
        msgMenuClicked = true
      }

      if (!chatMenuClicked) setChatContextMenu(null)
      if (!msgMenuClicked) setMsgContextMenu(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMuteMenu])

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedPartner || isSending) return

    setIsSending(true)
    try {
      if (editingMsg) {
        const res = await window.api.chat.editMessage(editingMsg.id, inputText)
        if (res.success) {
          setEditingMsg(null)
          setInputText('')
          await loadMessages(selectedPartner.user_id)
        } else {
          toast.error(t('chats.sendError', 'Send Error'))
        }
      } else {
        const res = await window.api.chat.sendMessage(selectedPartner.user_id, inputText, replyingTo?.id)
        if (res.success) {
          setInputText('')
          const newMsg = res.data
          if (replyingTo && (!newMsg.reply_to || (Array.isArray(newMsg.reply_to) && newMsg.reply_to.length === 0))) {
            newMsg.reply_to = [{
              id: replyingTo.id,
              content: replyingTo.content,
              sender_id: replyingTo.sender_id
            }]
          }
          setReplyingTo(null)
          setMessages((prev) => [...prev, newMsg])
          loadConversations()
        } else {
          toast.error(t('chats.sendError', 'Send Error'), {
            description: t('chats.sendErrorDesc', 'The recipient might only accept messages from friends.')
          })
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    } else if (e.key === 'Escape') {
      if (editingMsg) {
        setEditingMsg(null)
        setInputText('')
      } else if (replyingTo) {
        setReplyingTo(null)
      }
    }
  }

  const handleMute = async (duration: string) => {
    if (!selectedPartner) return
    const partnerId = selectedPartner.user_id
    
    setIsMuted(true)
    setMutedUserIds(prev => new Set(prev).add(partnerId))
    setShowMuteMenu(false)
    toast.success(t('chats.muted', 'User Muted'), { description: t('chats.mutedDesc', 'Notifications disabled ({{duration}})', { duration }) })

    try {
      await window.api.mute.muteUser(partnerId, duration)
    } catch (e) {}
  }

  const handleUnmute = async () => {
    if (!selectedPartner) return
    const partnerId = selectedPartner.user_id

    setIsMuted(false)
    setMutedUserIds(prev => {
      const next = new Set(prev)
      next.delete(partnerId)
      return next
    })
    setShowMuteMenu(false)
    toast.success(t('chats.unmuted', 'User Unmuted'))

    try {
      await window.api.mute.unmuteUser(partnerId)
    } catch (e) {}
  }

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const handleChatContextMenu = (e: React.MouseEvent, conv: Conversation) => {
    e.preventDefault()
    e.stopPropagation()
    setMsgContextMenu(null)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    let x = rect.right + 10
    let y = rect.top
    const menuWidth = 160
    const menuHeight = 60
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10
    if (y < 10) y = 10
    setChatContextMenu({ x, y, partnerId: conv.user_id, isPinned: !!conv.is_pinned })
  }

  const handleMsgContextMenu = (e: React.MouseEvent, msg: Message) => {
    e.preventDefault()
    e.stopPropagation()
    setChatContextMenu(null)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const isSentByMe = msg.sender_id !== selectedPartner?.user_id
    const menuWidth = 160
    const menuHeight = 130
    
    let x = isSentByMe ? rect.left - menuWidth - 10 : rect.right + 10
    let y = rect.top
    
    if (x < 10) x = e.clientX + 10
    if (x + menuWidth > window.innerWidth) x = e.clientX - menuWidth - 10
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10
    if (y < 10) y = 10
    
    setMsgContextMenu({ x, y, msg })
  }

  const togglePin = async (partnerId: string) => {
    const isCurrentlyPinned = chatContextMenu?.isPinned
    setChatContextMenu(null)
    
    setConversations(prev => {
      const copy = [...prev]
      const idx = copy.findIndex(c => c.user_id === partnerId)
      if (idx !== -1) {
        copy[idx] = { ...copy[idx], is_pinned: !isCurrentlyPinned }
      }
      return copy
    })

    const res = await window.api.chat.togglePinChat(partnerId)
    if (res.success) {
      loadConversations()
    } else {
      loadConversations()
      toast.error(res.error || t('chats.pinLimitReached', 'Максимум 5 закрепленных чатов'))
    }
  }

  const handleDeleteMsg = async (deleteForBoth: boolean) => {
    if (!deletingMsg) return
    await window.api.chat.deleteMessage(deletingMsg.id, deleteForBoth)
    setDeletingMsg(null)
    if (selectedPartner) await loadMessages(selectedPartner.user_id)
  }

  if (authChecked && !session) {
    return <SocialAuthPrompt variant="chats" />
  }

  return (
    <div className={`${styles['chats-page']} ${styles['fade-in']}`}>
      <div className={styles['chat-list']}>
        <div className={styles['chat-list__header']}>
          <MessageSquare size={24} className={styles['text-accent']} />
          <h2>{t('chats.title', 'Chats')}</h2>
        </div>

        <div className={styles['chat-list__items']}>
          {isLoadingChats ? (
            <div className={styles['chat-list__empty']}>
              <Loader2 className="animate-spin text-accent" size={32} />
              <p>{t('chats.loading', 'Загрузка...')}</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className={styles['chat-list__empty']}>
              <MessageSquare size={48} />
              <h4>{t('chats.noChats', 'No chats')}</h4>
              <p>{t('chats.startFromProfile', 'Start chatting from a user profile')}</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.user_id}
                className={`${styles['chat-list__item']} ${selectedPartner?.user_id === conv.user_id ? styles['chat-list__item--active'] : ''}`}
                onClick={() => setSelectedPartner(conv)}
                onContextMenu={(e) => handleChatContextMenu(e, conv)}
              >
                <div className={`${styles['chat-list__avatar']} avatar-container`}>
                  {conv.avatar_url && !conv.avatar_url.startsWith('file://') ? (
                    <img src={conv.avatar_url} alt={conv.username} />
                  ) : (
                    conv.username.charAt(0).toUpperCase()
                  )}
                  {onlineUserIds.has(conv.user_id) && <div className="avatar-online-indicator" />}
                </div>
                <div className={styles['chat-list__meta']}>
                  <div className={`${styles['chat-list__name']} ${styles.flex} ${styles['items-center']} ${styles['gap-1']}`}>
                    <span className={styles.truncate}>{conv.username}</span>
                    {mutedUserIds.has(conv.user_id) && (
                      <div 
                        title={t('chats.muted', 'Muted')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(255,255,255,0.05)',
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          marginLeft: '4px',
                          flexShrink: 0,
                          color: 'var(--text-tertiary)'
                        }}
                      >
                        <BellOff size={10} strokeWidth={2.5} />
                      </div>
                    )}
                    {conv.is_pinned && <Pin size={12} className={`${styles['text-accent']} ${styles['ml-auto']} ${styles['flex-shrink-0']}`} />}
                  </div>
                  <div className={styles['chat-list__preview']}>{conv.last_message}</div>
                </div>
                <div className={`${styles.flex} ${styles['flex-col']} ${styles['items-end']} ${styles['gap-1']}`}>
                  <div className={styles['chat-list__time']}>{formatTime(conv.last_message_at)}</div>
                  {conv.unread_count > 0 && (
                    <div className={styles['chat-list__badge']}>{conv.unread_count}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={styles['chat-window']}>
        {!selectedPartner ? (
          isLoadingChats ? (
            <div className={styles['chat-window__empty']}>
              <Loader2 className="animate-spin text-accent" size={64} />
              <h3>{t('chats.loading', 'Загрузка...')}</h3>
              <p className={styles['text-tertiary']}>{t('chats.loadingDesc', 'Пожалуйста, подождите, мы загружаем список ваших чатов.')}</p>
            </div>
          ) : (
            <div className={styles['chat-window__empty']}>
              <MessageSquare size={64} />
              <h3>{t('chats.selectChat', 'Select a chat')}</h3>
              <p>{t('chats.selectChatDesc', 'Choose a contact from the left list to start chatting')}</p>
            </div>
          )
        ) : (
          <>
            <div className={styles['chat-window__header']}>
              <div className={styles['chat-window__header-info']}>
                <div 
                  className={`${styles['chat-window__header-avatar']} avatar-container`}
                  style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                  onClick={() => navigate(`/profile/${selectedPartner.user_id}`)}
                  title={t('chats.viewProfile', 'View Profile')}
                >
                  {selectedPartner.avatar_url && !selectedPartner.avatar_url.startsWith('file://') ? (
                    <img src={selectedPartner.avatar_url} alt={selectedPartner.username} />
                  ) : (
                    selectedPartner.username.charAt(0).toUpperCase()
                  )}
                </div>
                <div className={styles['chat-window__header-name']}>
                  {selectedPartner.username}
                  <div 
                    className={styles['text-xs']} 
                    style={{ 
                      fontSize: '12px', 
                      marginTop: '2px', 
                      color: onlineUserIds.has(selectedPartner.user_id) ? 'var(--success, #22c55e)' : 'var(--text-tertiary)' 
                    }}
                  >
                    {onlineUserIds.has(selectedPartner.user_id)
                      ? t('friends.status.online', 'Онлайн')
                      : formatLastSeen(t, selectedPartner.last_seen, selectedPartner.created_at)}
                  </div>
                </div>
              </div>

              <div className={styles['chat-window__header-actions']} ref={muteMenuRef}>
                <button
                  className={`${styles['chat-window__mute-btn']} ${isMuted ? styles['chat-window__mute-btn--active'] : ''}`}
                  onClick={() => setShowMuteMenu(!showMuteMenu)}
                >
                  {isMuted ? <BellOff size={18} /> : <Bell size={18} />}
                  <span>{isMuted ? t('chats.notificationsStatusMuted', 'Muted') : t('chats.notificationsStatusActive', 'Notifications')}</span>
                </button>

                {showMuteMenu && (
                  <div className={styles['mute-dropdown']}>
                    {isMuted ? (
                      <button className={`${styles['mute-dropdown__item']} ${styles['mute-dropdown__item--unmute']}`} onClick={handleUnmute}>
                        <Bell size={16} /> {t('chats.unmute', 'Turn on notifications')}
                      </button>
                    ) : (
                      <>
                        <button className={styles['mute-dropdown__item']} onClick={() => handleMute('1h')}>
                          <Clock size={16} /> {t('chats.mute1h', 'For 1 hour')}
                        </button>
                        <button className={styles['mute-dropdown__item']} onClick={() => handleMute('8h')}>
                          <Clock size={16} /> {t('chats.mute8h', 'For 8 hours')}
                        </button>
                        <button className={styles['mute-dropdown__item']} onClick={() => handleMute('24h')}>
                          <Clock size={16} /> {t('chats.mute24h', 'For 24 hours')}
                        </button>
                        <button className={`${styles['mute-dropdown__item']} ${styles['text-warning']}`} onClick={() => handleMute('forever')}>
                          <UserX size={16} /> {t('chats.muteForever', 'Forever')}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className={styles['chat-window__messages']} ref={messagesContainerRef}>
              {isLoadingMessages ? (
                <div className={styles['chat-window__empty']}>
                  <Loader2 className="animate-spin text-accent" size={48} />
                  <p className={styles['text-tertiary']}>{t('chats.loadingMessages', 'Загрузка сообщений...')}</p>
                </div>
              ) : (
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const msg = messages[virtualRow.index]
                    return (
                      <div
                        key={virtualRow.key}
                        data-index={virtualRow.index}
                        ref={rowVirtualizer.measureElement}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`,
                          paddingBottom: '12px',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >
                        <ChatMessage
                          msg={msg}
                          partnerId={selectedPartner.user_id}
                          partnerUsername={selectedPartner.username}
                          onContextMenu={handleMsgContextMenu}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className={styles['chat-window__input-area']}>
              {(replyingTo || editingMsg) && (
                <div className={styles['chat-action-banner']}>
                  <div className={styles['chat-action-banner-content']}>
                    <div className={styles['chat-action-banner-title']}>
                      {editingMsg ? t('chats.editMessage', 'Редактирование сообщения') : `${t('chats.replyTo', 'В ответ на')}: ${replyingTo?.sender_id === selectedPartner.user_id ? selectedPartner.username : t('chats.you', 'Вы')}`}
                    </div>
                    <div className={styles['chat-action-banner-text']}>
                      {editingMsg ? editingMsg.content : replyingTo?.content}
                    </div>
                  </div>
                  <button onClick={() => { setReplyingTo(null); setEditingMsg(null) }}>
                    <X size={16} />
                  </button>
                </div>
              )}
              <div className={`${styles['chat-window__input']} ${(replyingTo || editingMsg) ? styles['rounded-top-none'] : ''}`}>
                <input
                  type="text"
                  placeholder={t('chats.placeholder', 'Type a message...')}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSending}
                  ref={(input) => {
                    if (input && (replyingTo || editingMsg)) input.focus()
                  }}
                />
                <button
                  className={styles['chat-window__send-btn']}
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isSending}
                  title={t('chats.send', 'Send')}
                >
                  <Send size={18} className={isSending ? 'opacity-50' : ''} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

        {chatContextMenu && (
          <div 
            ref={chatMenuRef} 
            className={styles['custom-context-menu']} 
            style={{ top: chatContextMenu.y, left: chatContextMenu.x }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
          <button onClick={() => togglePin(chatContextMenu.partnerId)}>
            <Pin size={16} />
            {chatContextMenu.isPinned ? t('chats.unpinChat', 'Открепить чат') : t('chats.pinChat', 'Закрепить чат')}
          </button>
        </div>
      )}

        {msgContextMenu && (
          <div 
            ref={msgMenuRef} 
            className={styles['custom-context-menu']} 
            style={{ top: msgContextMenu.y, left: msgContextMenu.x }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
          <button onClick={() => { setReplyingTo(msgContextMenu.msg); setEditingMsg(null); setMsgContextMenu(null) }}>
            <Reply size={16} /> {t('chats.reply', 'Ответить')}
          </button>
          {msgContextMenu.msg.sender_id !== selectedPartner?.user_id && (
            <button onClick={() => { setEditingMsg(msgContextMenu.msg); setReplyingTo(null); setInputText(msgContextMenu.msg.content); setMsgContextMenu(null) }}>
              <Edit2 size={16} /> {t('chats.edit', 'Редактировать')}
            </button>
          )}
          <button className={styles['text-error']} onClick={() => { setDeletingMsg(msgContextMenu.msg); setMsgContextMenu(null) }}>
            <Trash2 size={16} /> {t('chats.delete', 'Удалить')}
          </button>
        </div>
      )}

      {deletingMsg && (
        <div className={styles['modal-overlay']} onClick={() => setDeletingMsg(null)}>
          <div className={styles['custom-modal']} onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
            <button
              onClick={() => setDeletingMsg(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%'
              }}
              title={t('chats.cancel', 'Отмена')}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)' }}
            >
              <X size={20} />
            </button>
            <h3>{t('chats.delete', 'Удалить сообщение')}</h3>
            <p style={{ marginTop: '8px' }}>{t('chats.deleteConfirm', 'Также удалить у собеседника?')}</p>
            <div className={styles['custom-modal-actions']}>
               <button className={styles['btn-primary']} style={{ background: 'var(--error)', borderColor: 'var(--error)' }} onClick={() => handleDeleteMsg(false)}>{t('chats.no', 'Нет')}</button>
               <button className={styles['btn-primary']} onClick={() => handleDeleteMsg(true)}>{t('chats.yes', 'Да')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
