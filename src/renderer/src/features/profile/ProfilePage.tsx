// ============================================================
// ProfilePage — Current user's own profile page
// ============================================================

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { supabase } from '../../services/supabase.client'
import { FriendsList, FriendProfile } from './components/FriendsList'
import { ProfileSkeleton } from './components/ProfileSkeleton'
import {
  Dna,
  LibrarySquare,
  Pencil,
  Users,
  Trophy,
  Clock,
  Loader2
} from 'lucide-react'
import { BadgesShowcase } from '../badges/components/BadgesShowcase'
import { SocialAuthPrompt } from '../../components/ui/SocialAuthPrompt'
import { usePresenceStore } from '../../stores/presence.store'
import './ProfilePage.css'

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}

export function ProfilePage(): React.JSX.Element {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { onlineUsers } = usePresenceStore()
  const [profile, setProfile] = useState<any>(null)
  const [friends, setFriends] = useState<FriendProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<{ totalGames: number; totalHours: number; totalAchievements: number }>({
    totalGames: 0,
    totalHours: 0,
    totalAchievements: 0
  })
  const [showcaseGames, setShowcaseGames] = useState<any[]>([])
  const [showcaseAchievements, setShowcaseAchievements] = useState<any[]>([])

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setLoading(true)
    try {
      // Load cloud profile from Supabase
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.id) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()
          if (data) {
            setProfile(data)
          }

          // Load friends
          try {
            const res = await window.api.friends.getFriends()
            if (res.success && res.data) {
              setFriends(res.data)
            }
          } catch (err) {
            console.error("Failed to load friends", err)
            setFriends([])
          }
        }
      }

      // Load local stats
      try {
        const gamesRes = await window.api.getGames()
        if (gamesRes.success && gamesRes.data) {
          const games = gamesRes.data
          const totalHoursCalc = games.reduce((sum: number, g: any) => sum + (g.playtimeForever || 0), 0)
          setStats({
            totalGames: games.length,
            totalHours: Math.round(totalHoursCalc / 60),
            totalAchievements: games.reduce((sum: number, g: any) => sum + (g.unlockedAchievements || 0), 0)
          })

          const topGames = games
            .filter((g: any) => g.playtimeForever > 0)
            .sort((a: any, b: any) => (b.playtimeForever || 0) - (a.playtimeForever || 0))
            .slice(0, 6)
          setShowcaseGames(topGames)
        }
      } catch {
        // Stats are optional, not critical
      }

      // Load showcase achievements
      try {
        const achRes = await window.api.getShowcaseAchievements()
        console.log('getShowcaseAchievements result:', achRes)
        if (achRes.success && achRes.data) {
          setShowcaseAchievements(achRes.data)
        }
      } catch (achErr) {
        console.error('Failed to load showcase achievements:', achErr)
      }
    } catch (e) {
      console.error('Failed to load profile:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <ProfileSkeleton />
  }

  const username = profile?.username || profile?.steam_nickname || t('profile.player', 'Игрок')
  const avatarUrl = profile?.avatar_url || null
  const numericId = profile?.numeric_id
  const dnaSummary = profile?.dna_summary

  if (!profile) {
    return <SocialAuthPrompt variant="profile" />
  }

  return (
    <motion.div
      className="profile-page"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
    >
      {/* ── Header Card ── */}
      <motion.div className="profile-page__header" variants={fadeUp}>
        <div style={{ position: 'relative' }}>
          <div className="profile-page__avatar">
            {avatarUrl && !avatarUrl.startsWith('file://') ? (
              <img src={avatarUrl} alt={username} />
            ) : (
              <span className="profile-page__avatar-letter">
                {username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="avatar-online-indicator avatar-online-indicator--large" />
        </div>

        <div className="profile-page__meta">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 className="profile-page__username" style={{ margin: 0 }}>{username}</h1>
            {(profile?.id && onlineUsers[profile.id]?.currentGame) ? (
              <div className="status-badge-premium status-badge-playing">
                <span className="status-dot" />
                <span>{t('friends.status.playing', 'Играет в {{game}}', { game: onlineUsers[profile.id].currentGame })}</span>
              </div>
            ) : (
              <div className="status-badge-premium status-badge-online">
                <span className="status-dot" />
                <span>{t('friends.status.online', 'Онлайн')}</span>
              </div>
            )}
          </div>
          {numericId && (
            <span className="profile-page__id">GameMind #{numericId}</span>
          )}
          <div className="profile-page__badges">
            <BadgesShowcase userId={profile?.id} steamId={profile?.steam_id || String(numericId || '')} isOwnProfile={true} />
          </div>
        </div>

        <button
          className="profile-page__edit-btn"
          onClick={() => navigate('/settings#profile-section')}
          title={t('profile.editProfile', 'Редактировать профиль')}
        >
          <Pencil size={14} />
          <span>{t('profile.edit', 'Редактировать')}</span>
        </button>
      </motion.div>

      {/* ── Stats Row ── */}
      <motion.div className="profile-page__section profile-page__section--full" variants={fadeUp} style={{ marginBottom: 'var(--space-5)' }}>
        <div className="profile-page__section-body">
          <div className="profile-page__stats">
            <div className="profile-page__stat">
              <span className="profile-page__stat-value">{stats.totalGames}</span>
              <span className="profile-page__stat-label">{t('profile.stats.gamesInLibrary', 'Игр в библиотеке')}</span>
            </div>
            <div className="profile-page__stat">
              <span className="profile-page__stat-value">{stats.totalHours.toLocaleString()}</span>
              <span className="profile-page__stat-label">{t('profile.stats.hoursPlayed', 'Часов наиграно')}</span>
            </div>
            <div className="profile-page__stat">
              <span className="profile-page__stat-value">{stats.totalAchievements}</span>
              <span className="profile-page__stat-label">{t('profile.stats.achievements', 'Достижений')}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Sections Grid ── */}
      <div className="profile-page__sections">
        {/* Player DNA */}
        <motion.div className="profile-page__section" variants={fadeUp}>
          <div className="profile-page__section-header">
            <Dna size={20} />
            <h3>Player DNA</h3>
          </div>
          <div className="profile-page__section-body">
            {dnaSummary ? (
              <div className="profile-page__dna-card">
                <h4 className="profile-page__dna-persona">{dnaSummary.persona || t('profile.dna.unknown', 'Неизвестно')}</h4>
                <p className="profile-page__dna-desc">{dnaSummary.description || t('profile.dna.forming', 'ДНК формируется...')}</p>
              </div>
            ) : (
              <div className="profile-page__placeholder">
                <Dna size={40} className="profile-page__placeholder-icon" />
                <h4>{t('profile.dna.notGenerated', 'ДНК не сгенерирован')}</h4>
                <p>{t('profile.dna.generatePrompt', 'Перейдите в раздел Player DNA, чтобы сгенерировать свой игровой профиль.')}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Friends */}
        <motion.div className="profile-page__section" variants={fadeUp}>
          <div className="profile-page__section-header">
            <Users size={20} />
            <h3>{t('profile.friends.title', 'Друзья')}</h3>
          </div>
          <div className="profile-page__section-body">
            <FriendsList friends={friends} limit={6} isCompact={true} isLoading={loading} />
          </div>
        </motion.div>

        {/* Library Preview */}
        <motion.div className="profile-page__section" variants={fadeUp}>
          <div className="profile-page__section-header">
            <LibrarySquare size={20} />
            <h3>{t('profile.library.title', 'Библиотека')}</h3>
          </div>
          <div className="profile-page__section-body">
            {showcaseGames.length > 0 ? (
              <div className="profile-showcase-grid">
                {showcaseGames.map((game) => (
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
              <div className="profile-page__placeholder">
                <LibrarySquare size={40} className="profile-page__placeholder-icon" />
                <h4>{t('profile.library.preview', 'Предпросмотр библиотеки')}</h4>
                <p>{t('profile.library.previewDesc', 'Здесь будут отображаться ваши любимые игры и последние сессии.')}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Achievements */}
        <motion.div className="profile-page__section" variants={fadeUp}>
          <div className="profile-page__section-header">
            <Trophy size={20} />
            <h3>{t('profile.achievements.title', 'Достижения')}</h3>
          </div>
          <div className="profile-page__section-body">
            {showcaseAchievements.length > 0 ? (
              <div className="profile-showcase-grid">
                {showcaseAchievements.map((ach: any) => (
                  <div key={`${ach.app_id}-${ach.api_name}`} className="profile-showcase-item achievement-showcase-item" title={ach.description}>
                    <img 
                      src={ach.icon || ach.icon_gray || 'https://steamcommunity-a.akamaihd.net/public/images/skin_1/appBG.png'} 
                      alt={ach.display_name || ach.api_name} 
                      className="achievement-icon"
                    />
                    <div className="profile-showcase-item-info">
                      <span className="profile-showcase-item-name truncate">{ach.display_name || ach.api_name}</span>
                      <span className="profile-showcase-item-playtime truncate">
                        {ach.game_name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="profile-page__placeholder">
                <Trophy size={40} className="profile-page__placeholder-icon" />
                <h4>{t('profile.achievements.showcase', 'Витрина достижений')}</h4>
                <p>{t('profile.achievements.showcaseDesc', 'Здесь будут отображаться ваши самые редкие и последние достижения.')}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Activity / Timeline */}
        <motion.div className="profile-page__section profile-page__section--full" variants={fadeUp}>
          <div className="profile-page__section-header">
            <Clock size={20} />
            <h3>{t('profile.activity.title', 'Активность')}</h3>
          </div>
          <div className="profile-page__section-body">
            <div className="profile-page__placeholder">
              <Clock size={40} className="profile-page__placeholder-icon" />
              <h4>{t('profile.activity.feed', 'Лента активности')}</h4>
              <p>{t('profile.activity.feedDesc', 'Журнал последних игровых сессий, полученных достижений и обновлений ДНК.')}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
