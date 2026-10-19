import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../services/supabase.client'
import { usePresenceStore } from '../stores/presence.store'
import { useAppStore } from '../stores/app.store'
import { router } from '../router'
import { X, MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function GlobalRealtimeListener(): null {
  const { setHasUnreadChats, isGeneratingRecs, isGeneratingDna } = useAppStore()
  const { t } = useTranslation()
  
  const [currentPath, setCurrentPath] = useState(router.state.location.pathname || '/')
  const recsToastId = useRef<string | number | null>(null)
  const dnaToastId = useRef<string | number | null>(null)

  useEffect(() => {
    setCurrentPath(router.state.location.pathname)

    const unsubscribe = router.subscribe((state) => {
      setCurrentPath(state.location.pathname)
    })
    
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (isGeneratingRecs) {
      if (currentPath !== '/recommendations') {
        if (!recsToastId.current) {
          recsToastId.current = toast.loading(
            t('recommendations.generating_background', 'ИИ генерирует рекомендации...'), 
            { id: 'recs-bg-toast' }
          )
        }
      } else {
        if (recsToastId.current) {
          toast.dismiss(recsToastId.current)
          recsToastId.current = null
        }
      }
    }
  }, [isGeneratingRecs, currentPath, t])

  useEffect(() => {
    if (isGeneratingDna) {
      if (currentPath !== '/player-dna') {
        if (!dnaToastId.current) {
          dnaToastId.current = toast.loading(
            t('dna.generating_background', 'ИИ вычисляет ДНК игрока...'), 
            { id: 'dna-bg-toast' }
          )
        }
      } else {
        if (dnaToastId.current) {
          toast.dismiss(dnaToastId.current)
          dnaToastId.current = null
        }
      }
    }
  }, [isGeneratingDna, currentPath, t])

  useEffect(() => {
    const dnaStartedCleanup = window.api.onDnaStarted?.(() => {
      useAppStore.getState().setIsGeneratingDna(true)
    })

    const dnaUpdatedCleanup = window.api.onDnaUpdated?.(() => {
      useAppStore.getState().setIsGeneratingDna(false)
      
      const successMessage = t('dna.generated_success', 'ДНК Игрока успешно вычислена')

      if (dnaToastId.current) {
        toast.success(successMessage, { id: dnaToastId.current, duration: 4000 })
        dnaToastId.current = null
      }

      window.api.overlay?.showNotification?.({
        sender_id: 'SYSTEM:DNA',
        content: successMessage
      })
    })

    const dnaFailedCleanup = window.api.onDnaFailed?.(() => {
      useAppStore.getState().setIsGeneratingDna(false)
      
      const errorMessage = t('dna.generated_failed', 'Ошибка при вычислении ДНК Игрока')
      
      if (dnaToastId.current) {
        toast.error(errorMessage, { id: dnaToastId.current, duration: 4000 })
        dnaToastId.current = null
      }

      window.api.overlay?.showNotification?.({
        sender_id: 'SYSTEM:DNA',
        content: errorMessage
      })
    })

    const recsStartedCleanup = window.api.onRecommendationsStarted?.(() => {
      useAppStore.getState().setIsGeneratingRecs(true)
    })

    const recsUpdatedCleanup = window.api.onRecommendationsUpdated?.(() => {
      useAppStore.getState().setIsGeneratingRecs(false)
      
      const successMessage = t('recommendations.generated_success', 'ИИ Рекомендации успешно сгенерированы')

      if (recsToastId.current) {
        toast.success(successMessage, { id: recsToastId.current, duration: 4000 })
        recsToastId.current = null
      }
      
      // Also show global OS overlay
      window.api.overlay?.showNotification?.({
        sender_id: 'SYSTEM:RECS',
        content: successMessage
      })
    })

    const recsFailedCleanup = window.api.onRecommendationsFailed?.(() => {
      useAppStore.getState().setIsGeneratingRecs(false)
      
      const errorMessage = t('recommendations.generated_failed', 'Ошибка при генерации ИИ Рекомендаций')
      
      if (recsToastId.current) {
        toast.error(errorMessage, { id: recsToastId.current, duration: 4000 })
        recsToastId.current = null
      }

      // Also show global OS overlay
      window.api.overlay?.showNotification?.({
        sender_id: 'SYSTEM:RECS',
        content: errorMessage
      })
    })

    return () => {
      if (dnaStartedCleanup) dnaStartedCleanup()
      if (dnaUpdatedCleanup) dnaUpdatedCleanup()
      if (dnaFailedCleanup) dnaFailedCleanup()
      if (recsStartedCleanup) recsStartedCleanup()
      if (recsUpdatedCleanup) recsUpdatedCleanup()
      if (recsFailedCleanup) recsFailedCleanup()
    }
  }, [t])

  useEffect(() => {
    if (!supabase) return

    const client = supabase
    let activeCleanup: (() => void) | undefined
    let activeUserId: string | null = null
    let isDisposed = false

    const clearActiveSession = () => {
      if (activeCleanup) {
        activeCleanup()
        activeCleanup = undefined
      }
      activeUserId = null
      usePresenceStore.getState().setOnlinePresenceMap({})
    }

    const startSessionRealtime = (session: any) => {
      if (!session || isDisposed) return

      const myId = session.user.id
      if (activeUserId === myId) return

      clearActiveSession()
      activeUserId = myId

      let cleanup: (() => void) | undefined
      let chatCleanup: (() => void) | undefined
      let presenceChannel: any
      let heartbeatInterval: ReturnType<typeof setInterval> | undefined
      let gameInterval: ReturnType<typeof setInterval> | undefined
      let stopped = false

      const updateLastSeen = async () => {
        try {
          const { error } = await client
            .from('users')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', myId)

          if (error) {
            console.warn('[Presence] Failed to update last_seen:', error.message)
          }
        } catch (err) {
          console.warn('[Presence] Failed to update last_seen:', err)
        }
      }

      const handleUnload = () => {
        void updateLastSeen()
      }

      // 0. Fetch initial unread chat status
      window.api.chat.getConversations().then(res => {
        if (res.success && res.data) {
          setHasUnreadChats(res.data.some(c => c.unread_count > 0))
        }
      }).catch(err => console.warn('[Realtime] Failed to fetch unread chat status:', err))

      // 1. Friends Realtime listener (existing)
      cleanup = window.api.friends.onRealtimeUpdate((payload: any) => {
        const { new: newRow, eventType } = payload
        if (eventType === 'INSERT') {
          if (newRow && newRow.friend_id === myId) {
            toast(t('notifications.newFriendRequest', 'Новая заявка в друзья'), {
              description: t('notifications.userWantsToBefriend', 'Пользователь хочет добавить вас в друзья'),
              action: { 
                label: t('common.accept', 'Принять'), 
                onClick: async () => {
                  await window.api.friends.acceptFriendRequest(newRow.user_id)
                  toast.success(t('notifications.requestAccepted', 'Заявка принята!'))
                } 
              },
              cancel: { 
                label: t('common.decline', 'Отклонить'), 
                onClick: async () => {
                  await window.api.friends.removeFriend(newRow.user_id)
                } 
              },
              duration: 8000
            })
          }
        } else if (eventType === 'UPDATE') {
          if (newRow && newRow.status === 'accepted' && newRow.user_id === myId) {
            toast.success(t('notifications.yourRequestAccepted', 'Ваша заявка в друзья принята!'))
          }
        }
      })

      // 1b. Chat Realtime listener
      chatCleanup = window.api.chat.onRealtimeUpdate(async (payload: any) => {
        const { new: newMsg, eventType } = payload
        if (eventType !== 'INSERT' || !newMsg || newMsg.receiver_id !== myId) return

        // Update unread badge
        setHasUnreadChats(true)

        // Check if sender is muted
        try {
          const muteResult = await window.api.mute.isMuted(newMsg.sender_id)
          if (muteResult.success && muteResult.data) return // muted — no toast
        } catch { /* ignore errors, show toast anyway */ }

        // Fetch sender info for a nice notification
        let senderName = t('notifications.newMessage', 'Новое сообщение')
        let senderAvatar: string | null = null
        try {
          if (supabase) {
            const { data: sender } = await supabase
              .from('users')
              .select('username, avatar_url')
              .eq('id', newMsg.sender_id)
              .single()
            if (sender?.username) senderName = sender.username
            if (sender?.avatar_url) senderAvatar = sender.avatar_url
          }
        } catch { /* fallback to generic */ }

        if (stopped || isDisposed) return

        // Show internal toast if app window has focus
        if (document.hasFocus()) {
          toast.custom((toastId) => (
            <div 
              className="custom-chat-toast"
              onClick={() => {
                toast.dismiss(toastId)
                router.navigate('/chats', { state: { targetUserId: newMsg.sender_id } })
              }}
            >
              <div className="custom-chat-toast-accent" />
              
              <div className="custom-chat-toast-avatar">
                {senderAvatar ? (
                  <img src={senderAvatar} alt={senderName} />
                ) : (
                  <span>{senderName.charAt(0).toUpperCase()}</span>
                )}
              </div>

              <div className="custom-chat-toast-content">
                <div className="custom-chat-toast-header">
                  <span className="custom-chat-toast-badge">
                    <MessageSquare size={11} />
                    {t('overlay.newMessage', 'Новое сообщение')}
                  </span>
                  <span className="custom-chat-toast-name">{senderName}</span>
                </div>
                <p className="custom-chat-toast-desc">
                  {(newMsg.content?.length || 0) > 80
                    ? newMsg.content.substring(0, 80) + '...'
                    : newMsg.content || t('notifications.attachment', 'Вложение')}
                </p>
              </div>

              <button 
                className="custom-chat-toast-close"
                onClick={(e) => {
                  e.stopPropagation()
                  toast.dismiss(toastId)
                }}
                title={t('common.close', 'Закрыть')}
              >
                <X size={14} />
              </button>
            </div>
          ), { duration: 8000 })
        }
      })

      // 2. Presence Tracking (Online Status & Current Game)
      let localCurrentGame: string | null = null

      const existingChannel = client.getChannels().find(c => c.topic === 'realtime:online-users')
      if (existingChannel) {
        void client.removeChannel(existingChannel)
      }

      presenceChannel = client.channel('online-users')

      const updatePresenceMap = () => {
        if (!presenceChannel) return
        const state = presenceChannel.presenceState()
        const newMap: Record<string, { isOnline: boolean; currentGame?: string | null }> = {}
        Object.values(state).forEach((presences: any) => {
          const list = Array.isArray(presences) ? presences : [presences]
          const p = list.find((presence: any) => presence?.current_game) || list[0]
          if (p?.user_id) {
            newMap[p.user_id] = { isOnline: true, currentGame: p.current_game || null }
          }
        })
        usePresenceStore.getState().setOnlinePresenceMap(newMap)
      }

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          updatePresenceMap()
        })
        .on('presence', { event: 'join' }, () => {
          updatePresenceMap()
        })
        .on('presence', { event: 'leave' }, () => {
          updatePresenceMap()
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED' && !stopped && !isDisposed) {
            await updateLastSeen()
            await presenceChannel.track({
              user_id: myId,
              online_at: new Date().toISOString(),
              current_game: localCurrentGame
            })

            let handleFocusOrVisibility: (() => void) | null = null

            // Poll steam game frequently (every 10 seconds)
            const checkSteamGame = async () => {
              if (stopped || isDisposed) return
              try {
                const res = await window.api.getPlayerSummaries()
                if (res?.success && res?.data) {
                  const newGame = res.data.gameExtraInfo || null
                  if (newGame !== localCurrentGame) {
                    localCurrentGame = newGame
                    // Update local presence store immediately so own UI updates with 0ms delay
                    const currentMap = usePresenceStore.getState().onlineUsers
                    usePresenceStore.getState().setOnlinePresenceMap({
                      ...currentMap,
                      [myId]: { isOnline: true, currentGame: localCurrentGame }
                    })
                    if (presenceChannel) {
                      await presenceChannel.track({
                        user_id: myId,
                        online_at: new Date().toISOString(),
                        current_game: localCurrentGame
                      })
                    }
                  }
                } else if (res && !res.success) {
                  console.warn('[GameTracking] getPlayerSummaries failed:', res.error)
                }
              } catch (err) {
                console.warn('[GameTracking] Steam game check error:', err)
              }
            }

            void checkSteamGame()
            gameInterval = setInterval(checkSteamGame, 10000)

            handleFocusOrVisibility = () => {
              if (!document.hidden && !stopped && !isDisposed) {
                void checkSteamGame()
              }
            }
            window.addEventListener('focus', handleFocusOrVisibility)
            document.addEventListener('visibilitychange', handleFocusOrVisibility)

            activeCleanup = () => {
              stopped = true
              window.removeEventListener('beforeunload', handleUnload)
              if (handleFocusOrVisibility) {
                window.removeEventListener('focus', handleFocusOrVisibility)
                document.removeEventListener('visibilitychange', handleFocusOrVisibility)
              }
              if (gameInterval) clearInterval(gameInterval)
              if (heartbeatInterval) clearInterval(heartbeatInterval)
              if (cleanup) cleanup()
              if (chatCleanup) chatCleanup()
              if (presenceChannel) void client.removeChannel(presenceChannel)
            }
          }
        })

      // 3. Heartbeat for `last_seen` column
      void updateLastSeen()
      // Then every 2 minutes
      heartbeatInterval = setInterval(updateLastSeen, 2 * 60 * 1000)
      window.addEventListener('beforeunload', handleUnload)
    }

    client.auth.getSession().then(({ data: { session } }) => {
      if (!isDisposed) startSessionRealtime(session)
    })

    const {
      data: { subscription }
    } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        clearActiveSession()
        return
      }

      startSessionRealtime(session)
    })

    return () => {
      isDisposed = true
      subscription.unsubscribe()
      clearActiveSession()
    }
  }, [setHasUnreadChats, t])

  return null
}
