import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { supabase } from '../../services/supabase.client'
import { Lock, ArrowLeft, Dna, LibrarySquare, Users, Trophy, Clock, MessageSquare, UserPlus, UserMinus, Check, X, Crown, Ban } from 'lucide-react'
import { toast } from 'sonner'
import { FriendsList, FriendProfile } from './components/FriendsList'
import { ProfileSkeleton } from './components/ProfileSkeleton'
import { usePresenceStore } from '../../stores/presence.store'
import { CloudUserProfile } from '../../../../shared/types/user.types'
import { BadgesShowcase } from '../badges/components/BadgesShowcase'
import { ManageBadgesModal } from '../badges/components/ManageBadgesModal'
import './UserProfilePage.css'
import { formatLastSeenUppercase } from '../../utils/format-last-seen'

function getPlural(value: number, one: string, two: string, five: string): string {
  const n = Math.abs(value) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return five;
  if (n1 > 1 && n1 < 5) return two;
  if (n1 === 1) return one;
  return five;
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}

export function UserProfilePage(): React.JSX.Element {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { onlineUserIds, onlineUsers } = usePresenceStore()
  const [profile, setProfile] = useState<CloudUserProfile | null>(null)
  const [friends, setFriends] = useState<FriendProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [friendshipState, setFriendshipState] = useState<'none' | 'friends' | 'pending_outgoing' | 'pending_incoming'>('none')
  const [isBoss, setIsBoss] = useState(false)
  const [showManageBadgesModal, setShowManageBadgesModal] = useState(false)

  useEffect(() => {
    async function checkBossStatus() {
      try {
        if (!supabase) {
          setIsBoss(false)
          return
        }
        const { data: { session } } = await supabase.auth.getSession()
        const myId = session?.user?.id
        if (!myId) {
          setIsBoss(false)
          return
        }

        const { data: myUser } = await supabase.from('users').select('numeric_id, username, steam_id, role').eq('id', myId).single()

        if (myUser?.role === 'admin') {
          setIsBoss(true)
        } else {
          setIsBoss(false)
        }
      } catch {
        setIsBoss(false)
      }
    }
    checkBossStatus()
  }, [])

  const handleBossBlockUser = async () => {
    if (!userId) return
    const confirmed = window.confirm(t('profile.bossAction.blockConfirm', 'Вы уверены, что хотите заблокировать этого пользователя?'))
    if (!confirmed) return

    try {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession()
        const myId = session?.user?.id
        if (myId && userId) {
          // Persist block in Supabase user_blocks
          await supabase.from('user_blocks').upsert(
            { blocker_id: myId, blocked_id: userId, created_at: new Date().toISOString() },
            { onConflict: 'blocker_id,blocked_id' }
          )
          // Update status in Supabase friends table
          await supabase
            .from('friends')
            .update({ status: 'blocked' })
            .or(`and(user_id.eq.${myId},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${myId})`)
        }
      }

      if ((window as any).api?.mute?.muteUser) {
        await (window as any).api.mute.muteUser(userId, 'forever')
      }
      toast.success(t('profile.bossAction.blockedSuccess', 'Пользователь заблокирован!'))
    } catch (err: any) {
      toast.error(err.message || 'Ошибка блокировки')
    }
  }

  useEffect(() => {
    async function loadProfile() {
      if (!supabase || !userId) {
        setLoading(false)
        return
      }
      setLoading(true)

      const { data: { session } } = await supabase.auth.getSession()
      const myId = session?.user?.id
      if (myId === userId) {
        setIsOwner(true)
        navigate('/profile/me', { replace: true })
        return
      }

      const { data, error } = await supabase.rpc('get_user_profile', { p_id: userId })
      if (data) {
        setProfile(data)

        // Fetch relationship status
        if (myId) {
          const { data: friendship } = await supabase
            .from('friends')
            .select('user_id, friend_id, status')
            .or(`and(user_id.eq.${myId},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${myId})`)
            .maybeSingle()

          if (friendship) {
            if (friendship.status === 'accepted') {
              setFriendshipState('friends')
            } else if (friendship.status === 'pending') {
              if (friendship.user_id === myId) {
                setFriendshipState('pending_outgoing')
              } else {
                setFriendshipState('pending_incoming')
              }
            }
          } else {
            setFriendshipState('none')
          }
        }

        // Fetch friends for this user
        const { data: friendsData } = await supabase.rpc('get_user_friends', { p_user_id: userId })

        if (friendsData) {
          setFriends(friendsData)
        }
      } else {
        console.error('Failed to load profile:', error)
      }
      setLoading(false)
    }
    loadProfile()
  }, [userId])

  const handleSendFriendRequest = async () => {
    if (!userId) return
    setFriendshipState('pending_outgoing')
    await window.api.friends.sendFriendRequest(userId)
  }

  const handleCancelOrRemoveFriend = async () => {
    if (!userId) return
    setFriendshipState('none')
    await window.api.friends.removeFriend(userId)
  }

  const handleAcceptFriendRequest = async () => {
    if (!userId) return
    setFriendshipState('friends')
    await window.api.friends.acceptFriendRequest(userId)
  }

  if (loading) {
    return <ProfileSkeleton />
  }

  if (!profile) {
    return (
      <div className="user-profile-page user-profile-page--centered">
        <p>{t('profile.userNotFound', 'Пользователь не найден.')}</p>
        <button className="user-profile__btn" onClick={() => navigate(-1)}>{t('profile.back', 'Назад')}</button>
      </div>
    )
  }

  const {
    username,
    avatar_url,
    is_library_public,
    is_dna_public,
    is_achievements_public,
    is_online_public,
    dna_summary
  } = profile

  const canViewLibrary = isOwner || is_library_public !== false
  const canViewDna = isOwner || is_dna_public !== false
  const canViewAchievements = isOwner || is_achievements_public !== false

  const stats_games = profile.stats_games || 0
  const stats_hours = profile.stats_hours || 0
  const stats_achievements = profile.stats_achievements || 0
  const showcase_games = (profile as any).showcase_games || []
  const showcase_achievements = (profile as any).showcase_achievements || []

  return (
    <motion.div 
      className="user-profile-page"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.1 } } }}
    >
      <motion.button className="user-profile__back" onClick={() => navigate(-1)} variants={fadeUp}>
        <ArrowLeft size={16} /> {t('profile.back', 'Назад')}
      </motion.button>

      {/* Header */}
      <motion.div className="user-profile__header" variants={fadeUp}>
        <div className="user-profile__avatar-wrapper avatar-container" style={{ position: 'relative' }}>
          <div className="user-profile__avatar">
            {profile.avatar_url && !profile.avatar_url.startsWith('file://') ? (
              <img src={profile.avatar_url} alt={profile.username || 'Avatar'} />
            ) : (
              <span>{profile.username?.charAt(0)?.toUpperCase() || '?'}</span>
            )}
          </div>
          {(userId && (onlineUserIds.has(userId) || isOwner)) && <div className="avatar-online-indicator avatar-online-indicator--large" />}
        </div>
        <div className="user-profile__info" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 className="user-profile__name" style={{ margin: 0 }}>{profile.username || t('friends.status.unnamed', 'Без имени')}</h1>
            {(userId && (onlineUserIds.has(userId) || isOwner)) ? (
              (userId && onlineUsers[userId]?.currentGame) ? (
                <div className="status-badge-premium status-badge-playing">
                  <span className="status-dot" />
                  <span>{t('friends.status.playing', 'Играет в {{game}}', { game: onlineUsers[userId].currentGame })}</span>
                </div>
              ) : (
                <div className="status-badge-premium status-badge-online">
                  <span className="status-dot" />
                  <span>{t('friends.status.online', 'Онлайн')}</span>
                </div>
              )
            ) : (
              <div className="friend-status text-secondary" style={{ fontSize: '13px' }}>
                {formatLastSeenUppercase(t, profile?.last_seen, profile?.created_at)}
              </div>
            )}
          </div>
          {profile.numeric_id && (
            <span className="user-profile__code">GameMind #{profile.numeric_id}</span>
          )}
          <div className="profile-page__badges">
            <BadgesShowcase userId={profile.id} steamId={profile.steam_id || String(profile.numeric_id || '')} isOwnProfile={isOwner} />
          </div>
        </div>
        {!isOwner && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'nowrap', flexShrink: 0 }}>
            {friendshipState === 'none' && (
              <button 
                className="user-profile__btn user-profile__btn--primary"
                onClick={handleSendFriendRequest}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
              >
                <UserPlus size={16} />
                {t('friends.btnAdd', 'Добавить в друзья')}
              </button>
            )}

            {friendshipState === 'pending_outgoing' && (
              <button 
                className="user-profile__btn user-profile__btn--danger"
                onClick={handleCancelOrRemoveFriend}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
              >
                <UserMinus size={16} />
                {t('friends.cancelRequest', 'Отменить заявку')}
              </button>
            )}

            {friendshipState === 'pending_incoming' && (
              <>
                <button 
                  className="user-profile__btn user-profile__btn--success"
                  onClick={handleAcceptFriendRequest}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  <Check size={16} />
                  {t('friends.btnAccept', 'Принять заявку')}
                </button>
                <button 
                  className="user-profile__btn user-profile__btn--danger"
                  onClick={handleCancelOrRemoveFriend}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  <X size={16} />
                  {t('friends.btnReject', 'Отклонить заявку')}
                </button>
              </>
            )}

            {profile.chat_privacy === 'friends_only' && friendshipState !== 'friends' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', background: 'var(--surface-raised)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <Lock size={14} style={{ color: 'var(--text-muted)' }} />
                <span>{t('profile.privacyRestricted', 'Настройки приватности пользователя не позволяют написать ему.')}</span>
              </div>
            ) : (
              <button 
                className="user-profile__btn user-profile__btn--primary"
                onClick={() => navigate('/chats', { state: { targetUserId: userId } })}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--accent-primary)', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
              >
                <MessageSquare size={16} />
                {t('profile.sendMessage', 'Написать')}
              </button>
            )}

            {isBoss && (
              <>
                <button 
                  className="user-profile__btn"
                  onClick={handleBossBlockUser}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                  title={t('profile.bossAction.blockTooltip', 'Заблокировать пользователя')}
                >
                  <Ban size={16} />
                  {t('profile.bossAction.block', 'Заблокировать')}
                </button>

                <button 
                  className="user-profile__btn"
                  onClick={() => setShowManageBadgesModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                  title={t('profile.bossAction.manageBadgesTooltip', 'Управление значками пользователя')}
                >
                  <Crown size={16} />
                  {t('profile.bossAction.manageBadges', 'Выдать значок')}
                </button>
              </>
            )}
          </div>
        )}

        {showManageBadgesModal && (
          <ManageBadgesModal
            targetUserId={profile?.id || userId}
            targetSteamId={profile?.steam_id || String(profile?.numeric_id || '')}
            targetUsername={profile?.username}
            onClose={() => setShowManageBadgesModal(false)}
          />
        )}
      </motion.div>

      {/* ── Stats Row ── */}
      <motion.div className="user-profile__section user-profile__section--full" variants={fadeUp} style={{ marginBottom: 'var(--space-5)' }}>
        <div className="user-profile__content" style={{ padding: 'var(--space-3)' }}>
          <div className="profile-page__stats">
            <div className="profile-page__stat">
              <span className="profile-page__stat-value">{canViewLibrary ? (stats_games || 0) : <Lock size={20} />}</span>
              <span className="profile-page__stat-label">{t('profile.stats.gamesInLibrary', 'Игр в библиотеке')}</span>
            </div>
            <div className="profile-page__stat">
              <span className="profile-page__stat-value">{canViewLibrary ? (stats_hours || 0) : <Lock size={20} />}</span>
              <span className="profile-page__stat-label">{t('profile.stats.hoursPlayed', 'Часов наиграно')}</span>
            </div>
            <div className="profile-page__stat">
              <span className="profile-page__stat-value">{canViewAchievements ? (stats_achievements || 0) : <Lock size={20} />}</span>
              <span className="profile-page__stat-label">{t('profile.stats.achievements', 'Достижений')}</span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="user-profile__sections">
        {/* Library Section */}
        <motion.section className="user-profile__section" variants={fadeUp}>
          <div className="user-profile__section-header">
            <LibrarySquare size={20} />
            <h2>{t('profile.library.title', 'Библиотека игр')}</h2>
          </div>
          {canViewLibrary ? (
            <div className="user-profile__content">
              {showcase_games.length > 0 ? (
                <div className="profile-showcase-grid">
                  {showcase_games.map((game: any) => (
                    <div key={game.appId} className="profile-showcase-item">
                      <img 
                        src={`https://steamcdn-a.akamaihd.net/steam/apps/${game.appId}/capsule_231x87.jpg`} 
                        alt={game.name} 
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          if (game.imgIconUrl) {
                            target.src = `http://media.steampowered.com/steamcommunity/public/images/apps/${game.appId}/${game.imgIconUrl}.jpg`
                          }
                        }}
                      />
                      <div className="profile-showcase-item-info">
                        <span className="profile-showcase-item-name truncate" title={game.name}>{game.name}</span>
                        <span className="profile-showcase-item-playtime">
                          {Math.round((game.playtimeForever || 0) / 60)} ч
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="profile-page__placeholder" style={{ padding: '24px 0', minHeight: 'auto' }}>
                  <LibrarySquare size={32} className="profile-page__placeholder-icon" style={{ opacity: 0.2 }} />
                  <p className="text-secondary" style={{ marginTop: '12px' }}>{t('profile.library.empty', 'У пользователя пока нет игр в витрине.')}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="user-profile__private">
              <Lock size={48} className="text-secondary" />
              <h3>{t('profile.library.privateTitle', 'Приватная библиотека')}</h3>
              <p>{t('profile.library.privateDesc', 'Этот пользователь скрыл свою библиотеку игр.')}</p>
            </div>
          )}
        </motion.section>

        {/* DNA Section */}
        <motion.section className="user-profile__section" variants={fadeUp}>
          <div className="user-profile__section-header">
            <Dna size={20} />
            <h2>Player DNA</h2>
          </div>
          {canViewDna ? (
            <div className="user-profile__content">
              {dna_summary ? (
                <div className="profile-page__dna-card">
                  <h4 className="profile-page__dna-persona">{dna_summary.persona || t('profile.dna.unknown', 'Неизвестно')}</h4>
                  <p className="profile-page__dna-desc">{dna_summary.description || t('profile.dna.forming', 'ДНК профиль еще формируется...')}</p>
                </div>
              ) : (
                <p className="text-secondary">{t('profile.dna.notGeneratedUser', 'Пользователь еще не сгенерировал свой Player DNA.')}</p>
              )}
            </div>
          ) : (
            <div className="user-profile__private">
              <Lock size={48} className="text-secondary" />
              <h3>{t('profile.dna.privateTitle', 'Приватный DNA')}</h3>
              <p>{t('profile.dna.privateDesc', 'Этот пользователь скрыл свой Player DNA.')}</p>
            </div>
          )}
        </motion.section>

        {/* Friends Section */}
        <motion.section className="user-profile__section" variants={fadeUp}>
          <div className="user-profile__section-header">
            <Users size={20} />
            <h2>{t('profile.friends.title', 'Друзья')}</h2>
          </div>
          <div className="user-profile__content">
            <FriendsList friends={friends} limit={6} isCompact={true} isLoading={loading} />
          </div>
        </motion.section>

        {/* Achievements Section */}
        <motion.section className="user-profile__section" variants={fadeUp}>
          <div className="user-profile__section-header">
            <Trophy size={20} />
            <h2>{t('profile.achievements.title', 'Достижения')}</h2>
          </div>
          {canViewAchievements ? (
            <div className="user-profile__content">
              {showcase_achievements.length > 0 ? (
                <div className="profile-showcase-grid">
                  {showcase_achievements.map((ach: any) => (
                    <div key={`${ach.appId}-${ach.apiName}`} className="profile-showcase-item achievement-showcase-item" title={ach.description}>
                      <img 
                        src={ach.icon || ach.iconGray || 'https://steamcommunity-a.akamaihd.net/public/images/skin_1/appBG.png'} 
                        alt={ach.displayName || ach.apiName} 
                        className="achievement-icon"
                      />
                      <div className="profile-showcase-item-info">
                        <span className="profile-showcase-item-name truncate">{ach.displayName || ach.apiName}</span>
                        <span className="profile-showcase-item-playtime truncate">
                          {ach.gameName}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="profile-page__placeholder" style={{ padding: '24px 0', minHeight: 'auto' }}>
                  <Trophy size={32} className="profile-page__placeholder-icon" style={{ opacity: 0.2 }} />
                  <p className="text-secondary" style={{ marginTop: '12px' }}>{t('profile.achievements.empty', 'У пользователя пока нет достижений в витрине.')}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="user-profile__private">
              <Lock size={48} className="text-secondary" />
              <h3>{t('profile.achievements.privateTitle', 'Приватные достижения')}</h3>
              <p>{t('profile.achievements.privateDesc', 'Этот пользователь скрыл свои достижения.')}</p>
            </div>
          )}
        </motion.section>

        {/* Activity Section */}
        <motion.section className="user-profile__section user-profile__section--full" variants={fadeUp}>
          <div className="user-profile__section-header">
            <Clock size={20} />
            <h2>{t('profile.activity.title', 'Активность')}</h2>
          </div>
          {is_online_public ?? true ? (
            <div className="user-profile__content">
              <p className="text-secondary">{t('profile.activity.loading', 'Лента активности загружается (В разработке)')}</p>
            </div>
          ) : (
            <div className="user-profile__private">
              <Lock size={48} className="text-secondary" />
              <h3>{t('profile.activity.privateTitle', 'Скрытая активность')}</h3>
              <p>{t('profile.activity.privateDesc', 'Этот пользователь скрыл свою ленту активности.')}</p>
            </div>
          )}
        </motion.section>
      </div>
    </motion.div>
  )
}
