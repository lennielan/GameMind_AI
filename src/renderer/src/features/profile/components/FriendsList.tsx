// ============================================================
// FriendsList Component
// ============================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import { usePresenceStore } from '../../../stores/presence.store'
import { useTranslation } from 'react-i18next'
import { formatLastSeen } from '../../../utils/format-last-seen'
import './FriendsList.css'

export interface FriendProfile {
  id: string
  username: string
  avatar_url?: string | null
  numeric_id?: number
  last_seen?: string | null
  created_at?: string | null
}

interface FriendsListProps {
  friends: FriendProfile[]
  limit?: number
  isCompact?: boolean
  isLoading?: boolean
}

/**
 * Handcrafted Gamepad/Joystick Icon SVG
 * Vector-rendered, themes seamlessly with CSS custom properties (colors, glow, dropshadow)
 */
function JoystickIcon({ size = 12, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`friends-list__game-icon ${className}`}
      aria-hidden="true"
    >
      <path d="M6 12h4m-2-2v4" />
      <line x1="15" y1="11" x2="15.01" y2="11" strokeWidth="3" />
      <line x1="18" y1="13" x2="18.01" y2="13" strokeWidth="3" />
      <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.051-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
    </svg>
  )
}

export function FriendsList({ friends, limit = 6, isCompact = false, isLoading = false }: FriendsListProps): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [showAll, setShowAll] = useState(false)
  const { onlineUserIds, onlineUsers } = usePresenceStore()

  if (isLoading) {
    return (
      <div className="friends-list__loading">
        <span className="text-secondary">{t('friends.status.loading', 'Загрузка друзей...')}</span>
      </div>
    )
  }

  if (!friends || friends.length === 0) {
    return (
      <div className="friends-list__empty">
        <Users size={32} className="text-tertiary" />
        <span className="text-secondary">{t('friends.status.empty', 'Список друзей пуст')}</span>
      </div>
    )
  }

  const displayedFriends = isCompact && !showAll ? friends.slice(0, limit) : friends
  const hasMore = isCompact && friends.length > limit

  return (
    <div className={`friends-list ${isCompact ? 'friends-list--compact' : 'friends-list--full'}`}>
      <div className="friends-list__grid">
        {displayedFriends.map(friend => {
          const isOnline = onlineUserIds.has(friend.id)
          const currentGame = onlineUsers[friend.id]?.currentGame
          return (
            <div 
              key={friend.id} 
              className="friends-list__item"
              onClick={() => navigate(`/profile/${friend.id}`)}
              title={friend.username}
            >
              <div className="friends-list__avatar">
                {friend.avatar_url && !friend.avatar_url.startsWith('file://') ? (
                  <img src={friend.avatar_url} alt={friend.username} />
                ) : (
                  <span>{friend.username.charAt(0).toUpperCase()}</span>
                )}
                {isOnline && <div className="friends-list__online-dot" />}
              </div>
              <div className="friends-list__info">
                <span className="friends-list__name" title={friend.username}>{friend.username}</span>
                {!isCompact && (
                  <span className={`friends-list__last-seen ${currentGame ? 'friends-list__game-status' : ''}`}>
                    {isOnline ? (
                      currentGame ? (
                        <>
                          <span className="friends-list__game-icon-wrap">
                            <JoystickIcon size={12} />
                          </span>
                          <span>{t('friends.status.playing', 'Играет в {{game}}', { game: currentGame })}</span>
                        </>
                      ) : (
                        t('friends.status.online', 'Онлайн')
                      )
                    ) : (
                      formatLastSeen(t, friend.last_seen, friend.created_at)
                    )}
                  </span>
                )}
                {isCompact && isOnline && currentGame && (
                  <div className="friends-list__game-status friends-list__game-status--compact" title={currentGame}>
                    <span className="friends-list__game-icon-wrap">
                      <JoystickIcon size={12} />
                    </span>
                    <span className="friends-list__game-name">{currentGame}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      
      {hasMore && !showAll && (
        <button 
          className="friends-list__show-more"
          onClick={() => setShowAll(true)}
        >
          {t('friends.status.showAll', 'Показать всех')} ({friends.length})
        </button>
      )}
    </div>
  )
}
