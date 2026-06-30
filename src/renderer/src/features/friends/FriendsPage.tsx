import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase.client'
import { Users, Cloud, Loader2, ArrowRight, Search, UserPlus, Check, X, Dna } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './FriendsPage.css'
import { CoopMatchModal } from './components/CoopMatchModal'

export interface UserProfile {
  id: string
  steam_id: string
  username: string
  numeric_id: number
  dna_summary: any
  created_at: string
}

export function FriendsPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends')

  // Data states
  const [friends, setFriends] = useState<UserProfile[]>([])
  const [requests, setRequests] = useState<UserProfile[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<string[]>([])
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  // Matchmaking state
  const [selectedFriend, setSelectedFriend] = useState<UserProfile | null>(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        loadData()
      } else {
        setLoading(false)
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

  const loadData = async () => {
    setLoading(true)
    try {
      const [f, reqs, outReqs] = await Promise.all([
        window.api.friends.getFriends(),
        window.api.friends.getPendingRequests(),
        window.api.friends.getOutgoingRequests()
      ])
      if (f.success && f.data) setFriends(f.data)
      if (reqs.success && reqs.data) setRequests(reqs.data)
      if (outReqs.success && outReqs.data) setOutgoingRequests(outReqs.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setIsSearching(true)
    const result = await window.api.friends.searchUsers(searchQuery)
    if (result.success && result.data) setSearchResults(result.data)
    setIsSearching(false)
  }

  const handleSendRequest = async (userId: string) => {
    const result = await window.api.friends.sendFriendRequest(userId)
    if (result.success && result.data) {
      setOutgoingRequests([...outgoingRequests, userId])
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

  if (loading && !session) {
    return (
      <div className="friends-page friends-page--loading">
        <Loader2 className="animate-spin" size={32} />
        <p>{t('friends.loading')}</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="friends-page friends-page--gatekeeper">
        <div className="gatekeeper-card">
          <div className="gatekeeper-icon-wrapper">
            <Cloud className="gatekeeper-icon text-primary" size={48} />
          </div>
          <h2 className="gatekeeper-title">{t('friends.gatekeeperTitle')}</h2>
          <p className="gatekeeper-description" dangerouslySetInnerHTML={{ __html: t('friends.gatekeeperDesc') }} />
          <button 
            className="gatekeeper-btn"
            onClick={() => navigate('/settings')}
          >
            {t('friends.createAccount')}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="friends-page">
      <header className="friends-page__header">
        <div className="friends-page__title-group">
          <Users size={28} className="text-primary" />
          <h1>{t('friends.title')}</h1>
        </div>
        
        <div className="friends-tabs">
          <button 
            className={`friends-tab ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            {t('friends.tabList', { count: friends.length })}
          </button>
          <button 
            className={`friends-tab ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            {t('friends.tabRequests')} {requests.length > 0 && <span className="badge">{requests.length}</span>}
          </button>
          <button 
            className={`friends-tab ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            {t('friends.tabSearch')}
          </button>
        </div>
      </header>
      
      <main className="friends-page__content">
        {loading && activeTab !== 'search' ? (
          <div className="friends-page--loading">
            <Loader2 className="animate-spin" size={32} />
          </div>
        ) : (
          <>
            {/* TAB: FRIENDS */}
            {activeTab === 'friends' && (
              <div className="friends-list">
                {friends.length === 0 ? (
                  <div className="friends-empty">
                    <Users size={48} />
                    <h3>{t('friends.noFriends')}</h3>
                    <p>{t('friends.noFriendsDesc')}</p>
                    <button onClick={() => setActiveTab('search')} className="btn-primary">
                      {t('friends.findFriends')}
                    </button>
                  </div>
                ) : (
                  <div className="users-grid">
                    {friends.map(friend => (
                      <div key={friend.id} className="user-card" onClick={() => setSelectedFriend(friend)}>
                        <div className="user-card__avatar">
                          {friend.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="user-card__info">
                          <h4>{friend.username}</h4>
                          <span className="user-card__id">#{friend.numeric_id || t('friends.notLinked')}</span>
                        </div>
                        <button className="user-card__action btn-match">
                          <Dna size={16} />
                          {t('friends.aiMatch')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: REQUESTS */}
            {activeTab === 'requests' && (
              <div className="requests-list">
                {requests.length === 0 ? (
                  <div className="friends-empty">
                    <h3>{t('friends.noRequests')}</h3>
                  </div>
                ) : (
                  <div className="users-grid">
                    {requests.map(req => (
                      <div key={req.id} className="user-card">
                        <div className="user-card__avatar">
                          {req.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="user-card__info">
                          <h4>{req.username}</h4>
                          <span className="user-card__id">{t('friends.wantsToAdd')}</span>
                        </div>
                        <div className="user-card__actions-group">
                          <button 
                            className="btn-icon btn-success" 
                            onClick={(e) => { e.stopPropagation(); handleAcceptRequest(req.id); }}
                            title={t('friends.accept')}
                          >
                            <Check size={18} />
                          </button>
                          <button 
                            className="btn-icon btn-danger" 
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
              <div className="search-section">
                <form onSubmit={handleSearch} className="search-form">
                  <div className="search-input-wrapper">
                    <Search className="search-icon" size={20} />
                    <input 
                      type="text" 
                      placeholder={t('friends.searchPlaceholder')} 
                      value={searchQuery}
                      maxLength={6}
                      pattern="\d*"
                      onChange={(e) => setSearchQuery(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <button type="submit" className="btn-primary" disabled={isSearching || !searchQuery.trim()}>
                    {isSearching ? <Loader2 className="animate-spin" size={18} /> : t('friends.btnFind')}
                  </button>
                </form>

                <div className="search-results users-grid">
                  {searchResults.map(user => {
                    const isFriend = friends.some(f => f.id === user.id)
                    const isPendingOutgoing = outgoingRequests.includes(user.id)
                    const isPendingIncoming = requests.some(r => r.id === user.id)

                    return (
                      <div key={user.id} className="user-card">
                        <div className="user-card__avatar">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="user-card__info">
                          <h4>{user.username}</h4>
                          <span className="user-card__id">#{user.numeric_id || t('friends.notLinked')}</span>
                        </div>
                        
                        {isFriend ? (
                          <span className="status-badge status-badge--success">{t('friends.statusFriend')}</span>
                        ) : isPendingIncoming ? (
                          <button className="btn-primary btn-small" onClick={() => handleAcceptRequest(user.id)}>
                            {t('friends.btnAccept')}
                          </button>
                        ) : isPendingOutgoing ? (
                          <span className="status-badge status-badge--pending">{t('friends.statusPending')}</span>
                        ) : (
                          <button className="btn-primary btn-small" onClick={() => handleSendRequest(user.id)}>
                            <UserPlus size={16} />
                            {t('friends.btnAdd')}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* AI Coop Match Modal */}
      {selectedFriend && (
        <CoopMatchModal 
          friend={selectedFriend} 
          onClose={() => setSelectedFriend(null)} 
        />
      )}
    </div>
  )
}
