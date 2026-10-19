import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase.client'
import { User, Users, Cloud, Loader2, ArrowRight, Search, UserPlus, UserMinus, Check, X, Dna, Sparkles, MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import styles from './FriendsPage.module.css'
import { CoopMatchModal } from './components/CoopMatchModal'
import { GroupMatchModal } from './components/GroupMatchModal'
import { FriendsSkeleton } from './components/FriendsSkeleton'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { SocialAuthPrompt } from '../../components/ui/SocialAuthPrompt'
import { usePresenceStore } from '../../stores/presence.store'
import { useAppStore } from '../../stores/app.store'

import { CloudUserProfile } from '../../../../shared/types/user.types'

export function FriendsPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { onlineUserIds } = usePresenceStore()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends')

  // Data states
  const [userProfile, setUserProfile] = useState<CloudUserProfile | null>(null)
  const [friends, setFriends] = useState<CloudUserProfile[]>([])
  const [requests, setRequests] = useState<CloudUserProfile[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<CloudUserProfile[]>([])
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [hasSearched, setHasSearched] = useState(false)
  
  // Modal states
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [friendToRemove, setFriendToRemove] = useState<string | null>(null)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CloudUserProfile[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  // Matchmaking state
  const [selectedFriend, setSelectedFriend] = useState<CloudUserProfile | null>(null)
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [selectedGroupFriends, setSelectedGroupFriends] = useState<CloudUserProfile[]>([])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        supabase.from('users').select('*').eq('id', session.user.id).single().then(({ data }) => {
          if (data) setUserProfile(data)
        })

        // Try to load cached data for instant UI
        const cachedFriends = localStorage.getItem('gamemind_friends')
        if (cachedFriends) {
          try { setFriends(JSON.parse(cachedFriends)) } catch(e) {}
        }
        const cachedReqs = localStorage.getItem('gamemind_requests')
        if (cachedReqs) {
          try { setRequests(JSON.parse(cachedReqs)) } catch(e) {}
        }
        
        window.api.cloud.setSession(session.access_token, session.refresh_token)
        loadData()
      } else {
        setLoading(false)
        setIsInitialLoad(false)
      }
    })

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadData()
    })

    return () => subscription.unsubscribe()
  }, [])

  // Listen to realtime updates
  useEffect(() => {
    if (!session) return

    const cleanup = window.api.friends.onRealtimeUpdate(() => {
      // GlobalRealtimeListener handles the toasts, we just reload data

      // Reload data silently to keep UI fresh
      loadDataSilently()
    })

    return cleanup
  }, [session, t])

  const loadData = async () => {
    // Only show full loading screen if we have no cached friends
    if (friends.length === 0) {
      setLoading(true)
    }
    await loadDataSilently()
    setLoading(false)
    setIsInitialLoad(false)
  }

  const loadDataSilently = async () => {
    try {
      const [f, reqs, outReqs] = await Promise.all([
        window.api.friends.getFriends(),
        window.api.friends.getPendingRequests(),
        window.api.friends.getOutgoingRequests()
      ])
      if (f.success && f.data) {
        setFriends(f.data)
        localStorage.setItem('gamemind_friends', JSON.stringify(f.data))
      }
      if (reqs.success && reqs.data) {
        setRequests(reqs.data)
        localStorage.setItem('gamemind_requests', JSON.stringify(reqs.data))
      }
      if (outReqs.success && outReqs.data) setOutgoingRequests(outReqs.data)
    } catch (e) {
      console.error(e)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setIsSearching(true)
    setHasSearched(true)
    const result = await window.api.friends.searchUsers(searchQuery)
    if (result.success && result.data) setSearchResults(result.data)
    setIsSearching(false)
  }

  const handleSendRequest = async (userId: string) => {
    const result = await window.api.friends.sendFriendRequest(userId)
    if (result.success && result.data) {
      loadData()
    }
  }

  const handleAcceptRequest = async (userId: string) => {
    const result = await window.api.friends.acceptFriendRequest(userId)
    if (result.success && result.data) {
      loadData()
    }
  }

  const handleRejectRequest = async (userId: string) => {
    const result = await window.api.friends.removeFriend(userId)
    if (result.success && result.data) {
      loadData()
    }
  }

  const handleRemoveFriend = async (userId: string) => {
    setFriendToRemove(userId)
  }

  const confirmRemove = async () => {
    if (!friendToRemove) return
    const userId = friendToRemove
    setFriendToRemove(null)
    const result = await window.api.friends.removeFriend(userId)
    if (result.success) {
      toast.success(t('friends.removed', 'Пользователь удален из друзей'))
      loadData()
    } else {
      toast.error(t('friends.removeError', 'Ошибка при удалении из друзей'))
    }
  }

  const toggleGroupSelection = (friend: CloudUserProfile) => {
    if (selectedGroupFriends.some(f => f.id === friend.id)) {
      setSelectedGroupFriends(prev => prev.filter(f => f.id !== friend.id))
    } else {
      if (selectedGroupFriends.length >= 3) {
        toast.error(t('friends.groupMatchLimit', 'You can select up to 3 friends for a group match.'))
        return
      }
      setSelectedGroupFriends(prev => [...prev, friend])
    }
  }

  if (loading && !session) {
    return (
      <div className={`${styles['friends-page']} ${styles['friends-page--loading']}`}>
        <Loader2 className={styles['animate-spin']} size={32} />
        <p>{t('friends.loading')}</p>
      </div>
    )
  }

  if (!session) {
    return <SocialAuthPrompt variant="friends" />
  }

  return (
    <div className={styles['friends-page']}>
      <header className={styles['friends-page__header']}>
        <div className={styles['friends-page__title-group']}>
          <Users size={28} className={styles['text-primary']} />
          <h1>{t('friends.title')}</h1>
        </div>
        
        <div className={styles['friends-tabs']}>
          <button 
            className={`${styles['friends-tab']} ${activeTab === 'friends' ? styles.active : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            {t('friends.tabList', { count: friends.length })}
          </button>
          <button 
            className={`${styles['friends-tab']} ${activeTab === 'requests' ? styles.active : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            {t('friends.tabRequests')} {requests.length > 0 && <span className={styles.badge}>{requests.length}</span>}
          </button>
          <button 
            className={`${styles['friends-tab']} ${activeTab === 'search' ? styles.active : ''}`}
            onClick={() => setActiveTab('search')}
          >
            {t('friends.tabSearch')}
          </button>
        </div>
      </header>
      
      <main className={styles['friends-page__content']}>
        {loading && activeTab !== 'search' ? (
          <FriendsSkeleton count={8} />
        ) : (
          <>
            {/* TAB: FRIENDS */}
            {activeTab === 'friends' && (
              <div className={styles['friends-list']}>
                <motion.div layout style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
                  <AnimatePresence mode="popLayout" initial={false}>
                    {!isMultiSelectMode ? (
                      <motion.button
                        layout
                        key="start-match"
                        initial={{ opacity: 0, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, filter: 'blur(4px)' }}
                        transition={{ duration: 0.2 }}
                        className={`${styles['btn-secondary']} ${styles['btn-small']}`}
                        onClick={() => setIsMultiSelectMode(true)}
                        style={{ margin: 0 }}
                      >
                        <Users size={16} />
                        {t('friends.groupMatch', 'Group Match')}
                      </motion.button>
                    ) : (
                      <motion.button
                        layout
                        key="cancel-match"
                        initial={{ opacity: 0, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, filter: 'blur(4px)' }}
                        transition={{ duration: 0.2 }}
                        className={`${styles['btn-secondary']} ${styles['btn-small']}`}
                        style={{ margin: 0, backgroundColor: 'var(--surface-sunken)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
                        onClick={() => {
                          setIsMultiSelectMode(false)
                          setSelectedGroupFriends([])
                        }}
                      >
                        <X size={16} />
                        {t('friends.cancelGroupMatch', 'Cancel Group Match')}
                      </motion.button>
                    )}
                    
                    {isMultiSelectMode && (
                      <motion.div 
                        layout
                        key="generate-match"
                        initial={{ opacity: 0, filter: 'blur(4px)', x: -10 }}
                        animate={{ opacity: 1, filter: 'blur(0px)', x: 0 }}
                        exit={{ opacity: 0, filter: 'blur(4px)', x: -10 }}
                        transition={{ duration: 0.2 }}
                        style={{ flex: 1 }}
                      >
                        <button 
                          className={`${styles['btn-primary']} ${styles['btn-small']}`} 
                          onClick={() => setShowGroupModal(true)}
                          style={{ width: '100%', margin: 0 }}
                          disabled={selectedGroupFriends.length < 2}
                        >
                          <Sparkles size={16} />
                          {selectedGroupFriends.length < 2 
                            ? t('friends.selectMore', 'Select at least 2 friends') 
                            : t('friends.generateGroupMatch', 'Generate Group Match ({{count}})', { count: selectedGroupFriends.length })}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
                {isInitialLoad && loading && friends.length === 0 ? (
                  <FriendsSkeleton count={8} />
                ) : friends.length === 0 ? (
                  <div className={styles['friends-empty']}>
                    <Users size={48} />
                    <h3>{t('friends.noFriends')}</h3>
                    <p>{t('friends.noFriendsDesc')}</p>
                    <button onClick={() => setActiveTab('search')} className={styles['btn-primary']}>
                      {t('friends.findFriends')}
                    </button>
                  </div>
                ) : (
                  <div className={styles['users-grid']}>
                    {friends.map(friend => {
                      const isSelected = selectedGroupFriends.some(f => f.id === friend.id)
                      return (
                        <div 
                          key={friend.id} 
                          className={`${styles['user-card']} ${isSelected ? 'selected' : ''}`} 
                          onClick={() => {
                            if (isMultiSelectMode) {
                              toggleGroupSelection(friend)
                            } else {
                              navigate(`/profile/${friend.id}`)
                            }
                          }}
                          style={isSelected ? { borderColor: 'var(--primary)', background: 'var(--bg-card-hover)' } : {}}
                        >
                          <div className={`${styles['user-card__avatar']} avatar-container`}>
                            {friend.avatar_url && !friend.avatar_url.startsWith('file://') ? (
                              <img src={friend.avatar_url} alt={friend.username} style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%'}} />
                            ) : (
                              friend.username.charAt(0).toUpperCase()
                            )}
                            {onlineUserIds.has(friend.id) && <div className="avatar-online-indicator" />}
                          </div>
                          <div className={styles['user-card__info']}>
                            <h4>{friend.username}</h4>
                            <span className={styles['user-card__id']}>#{friend.numeric_id || t('friends.notLinked')}</span>
                          </div>
                          {isMultiSelectMode ? (
                            <div style={{ color: isSelected ? 'var(--primary)' : 'var(--text-secondary)' }}>
                              {isSelected ? <Check size={20} /> : <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--text-secondary)' }} />}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                              <button 
                                className={`${styles['btn-secondary']} ${styles['btn-small']}`}
                                style={{ flex: 1, margin: 0, justifyContent: 'center', minWidth: '45%' }}
                                onClick={(e) => { e.stopPropagation(); navigate(`/profile/${friend.id}`) }}
                              >
                                <User size={16} style={{ flexShrink: 0 }} />
                                <span>{t('friends.viewProfile', 'Профиль')}</span>
                              </button>
                              <button 
                                className={`${styles['btn-match']} ${styles['btn-small']}`}
                                style={{ flex: 1, margin: 0, justifyContent: 'center', minWidth: '45%' }}
                                onClick={(e) => { e.stopPropagation(); setSelectedFriend(friend) }}
                              >
                                <Dna size={16} style={{ flexShrink: 0 }} />
                                <span>{t('friends.aiMatch', 'Синхронизация')}</span>
                              </button>
                              <button 
                                className={`${styles['btn-secondary']} ${styles['btn-small']}`}
                                style={{ flex: '1 1 100%', margin: 0, justifyContent: 'center' }}
                                onClick={(e) => { e.stopPropagation(); navigate('/chats', { state: { targetUserId: friend.id } }) }}
                              >
                                <MessageSquare size={16} style={{ flexShrink: 0 }} />
                                <span>{t('friends.message', 'Написать')}</span>
                              </button>
                              <button 
                                className={`${styles['btn-secondary']} ${styles['btn-small']}`}
                                style={{ flex: '1 1 100%', margin: 0, justifyContent: 'center', color: 'var(--text-danger)' }}
                                onClick={(e) => { e.stopPropagation(); handleRemoveFriend(friend.id) }}
                              >
                                <UserMinus size={16} style={{ flexShrink: 0 }} />
                                <span>{t('friends.remove', 'Удалить из друзей')}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: REQUESTS */}
            {activeTab === 'requests' && (
              <div className={styles['friends-list']}>
                {isInitialLoad && loading && requests.length === 0 ? (
                  <FriendsSkeleton count={8} />
                ) : requests.length === 0 ? (
                  <div className={styles['friends-empty']}>
                    <h3>{t('friends.noRequests')}</h3>
                  </div>
                ) : (
                  <div className={styles['users-grid']}>
                    {requests.map(req => (
                        <div key={req.id} className={`${styles['user-card']} ${styles['request-card']}`}>
                          <div className={`${styles['user-card__avatar']} avatar-container`}>
                            {req.avatar_url && !req.avatar_url.startsWith('file://') ? (
                              <img src={req.avatar_url} alt={req.username} style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%'}} />
                          ) : (
                            req.username.charAt(0).toUpperCase()
                          )}
                          {onlineUserIds.has(req.id) && <div className="avatar-online-indicator" />}
                        </div>
                        <div className={styles['user-card__info']}>
                          <h4>{req.username}</h4>
                          <span className={styles['user-card__id']}>{t('friends.wantsToAdd')}</span>
                        </div>
                        <div className={styles['user-card__actions-group']}>
                          <button 
                            className={`${styles['btn-icon']} ${styles['btn-success']}`} 
                            onClick={(e) => { e.stopPropagation(); handleAcceptRequest(req.id); }}
                            title={t('friends.accept')}
                          >
                            <Check size={18} />
                          </button>
                          <button 
                            className={`${styles['btn-icon']} ${styles['btn-danger']}`} 
                            onClick={(e) => { e.stopPropagation(); handleRejectRequest(req.id); }}
                            title={t('friends.reject')}
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: SEARCH */}
            {activeTab === 'search' && (
              <div className={styles['search-section']}>
                <form onSubmit={handleSearch} className={styles['search-form']}>
                  <div className={styles['search-input-wrapper']}>
                    <Search className={styles['search-icon']} size={20} />
                    <input 
                      type="text" 
                      placeholder={t('friends.searchPlaceholder')} 
                      value={searchQuery}
                      maxLength={6}
                      pattern="\d*"
                      onChange={(e) => {
                        setSearchQuery(e.target.value.replace(/\D/g, ''))
                        setHasSearched(false)
                      }}
                    />
                  </div>
                  <button type="submit" className={styles['btn-primary']} disabled={isSearching || !searchQuery.trim()}>
                    {isSearching ? (
                      <div className={styles['dots-loader']}>
                        <span className={styles['dot']} />
                        <span className={styles['dot']} />
                        <span className={styles['dot']} />
                      </div>
                    ) : (
                      t('friends.btnFind')
                    )}
                  </button>
                </form>

                {isSearching ? (
                  <div className={styles['search-results-loading']}>
                    <div className={styles['search-spinner']} />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className={`${styles['search-results']} ${styles['users-grid']}`}>
                    {searchResults.map(user => {
                      const isFriend = friends.some(f => f.id === user.id)
                      const isPendingIncoming = requests.some(r => r.id === user.id)
                      const isPendingOutgoing = outgoingRequests.some(r => r.id === user.id)
                      const isCurrentUser = user.id === useAppStore.getState().user?.id
                      return (
                        <div key={user.id} className={styles['user-card']} onClick={() => navigate(`/profile/${user.id}`)} style={{ cursor: 'pointer' }}>
                          <div className={`${styles['user-card__avatar']} avatar-container`}>
                            {user.avatar_url && !user.avatar_url.startsWith('file://') ? (
                              <img src={user.avatar_url} alt={user.username} style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%'}} />
                            ) : (
                              user.username.charAt(0).toUpperCase()
                            )}
                            {onlineUserIds.has(user.id) && <div className="avatar-online-indicator" />}
                          </div>
                          <div className={styles['user-card__info']}>
                            <h4>{user.username}</h4>
                            <span className={styles['user-card__id']}>#{user.numeric_id || t('friends.notLinked')}</span>
                          </div>
                          
                          {isFriend ? (
                            <span className={`${styles['status-badge']} ${styles['status-badge--success']}`}>{t('friends.statusFriend')}</span>
                          ) : isPendingIncoming ? (
                            <button className={`${styles['btn-primary']} ${styles['btn-small']}`} onClick={(e) => { e.stopPropagation(); handleAcceptRequest(user.id); }}>
                              {t('friends.btnAcceptReturn', 'Принять заявку в ответ')}
                            </button>
                          ) : isPendingOutgoing ? (
                            <span className={`${styles['status-badge']} ${styles['status-badge--pending']}`}>{t('friends.statusPending')}</span>
                          ) : (
                            <button className={`${styles['btn-primary']} ${styles['btn-small']}`} onClick={(e) => { e.stopPropagation(); handleSendRequest(user.id); }}>
                              <UserPlus size={16} />
                              {t('friends.btnAdd')}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <motion.div 
                    className={styles['search-empty-state']}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className={styles['search-empty-state__icon-wrapper']}>
                      <Sparkles size={48} className={`${styles['search-empty-state__icon']} ${styles['text-primary']}`} />
                    </div>
                    <h3>{hasSearched ? t('friends.search.userNotFound', 'Пользователь не найден') : t('friends.search.title', 'Найдите своих друзей!')}</h3>
                    <p>{hasSearched 
                      ? t('friends.search.notFoundDesc', 'Убедитесь, что вы ввели правильный 6-значный GameMind ID.') 
                      : t('friends.search.description', 'Введите уникальный GameMind ID вашего друга в строку поиска выше, чтобы добавить его в друзья и начать сравнивать ваши игровые профили с помощью ИИ!')}</p>
                    {!hasSearched && (
                      <div className={styles['search-empty-hints']}>
                        <span>{t('friends.search.findIdHint', 'Свой ID можно найти в профиле')}</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* AI Coop Match Modal */}
      {selectedFriend && (
        <CoopMatchModal 
          friend={selectedFriend} 
          userProfile={userProfile}
          onClose={() => setSelectedFriend(null)} 
        />
      )}

      {/* AI Group Match Modal */}
      {showGroupModal && (
        <GroupMatchModal 
          friends={selectedGroupFriends} 
          userProfile={userProfile}
          onClose={() => setShowGroupModal(false)} 
        />
      )}

      <ConfirmModal
        isOpen={!!friendToRemove}
        title={t('friends.confirmRemoveTitle', 'Удалить из друзей?')}
        description={t('friends.confirmRemove', 'Вы уверены, что хотите удалить этого пользователя из друзей?')}
        confirmText={t('friends.remove', 'Удалить из друзей')}
        cancelText={t('common.cancel', 'Отмена')}
        isDestructive={true}
        onConfirm={confirmRemove}
        onCancel={() => setFriendToRemove(null)}
      />
    </div>
  )
}
