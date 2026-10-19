// ============================================================
// Dashboard Page — Modern Technical Overview (Linear-style)
// ============================================================

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Gamepad2,
  Clock,
  Trophy,
  TrendingUp,
  Star,
  AlertTriangle,
  X,
  Dna,
  Library,
  RefreshCw,
  Loader2,
  Target,
  Activity,
  Users,
  Tag,
  Play
} from 'lucide-react'
import { usePresenceStore } from '../../stores/presence.store'
import { supabase } from '../../services/supabase.client'
import { Badge, Button, SegmentedMeter } from '../../components/ui'
import './DashboardPage.css'

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
}

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] } }
}

interface TierInfo {
  tier: string
  nextTier: string
  target: number
  percent: number
  currentProgress: number
  tierRange: number
}

function getTierInfo(score: number): TierInfo {
  const tiers = [
    { min: 0, max: 1000, tier: 'NOVICE', nextTier: 'ADEPT', target: 1000 },
    { min: 1000, max: 2000, tier: 'ADEPT', nextTier: 'EXPERT', target: 2000 },
    { min: 2000, max: 3000, tier: 'EXPERT', nextTier: 'MASTER', target: 3000 },
    { min: 3000, max: 3500, tier: 'MASTER', nextTier: 'ELITE', target: 3500 },
    { min: 3500, max: 5000, tier: 'ELITE', nextTier: 'CHAMPION', target: 5000 },
    { min: 5000, max: 7500, tier: 'CHAMPION', nextTier: 'LEGEND', target: 7500 },
    { min: 7500, max: 10000, tier: 'LEGEND', nextTier: 'MYTHIC', target: 10000 },
  ]
  for (const t of tiers) {
    if (score < t.target) {
      const range = t.target - t.min
      const currentProgress = score - t.min
      const percent = Math.min(100, Math.max(0, Math.round((currentProgress / range) * 100)))
      return {
        tier: t.tier,
        nextTier: t.nextTier,
        target: t.target,
        percent,
        currentProgress,
        tierRange: range
      }
    }
  }
  const nextTarget = Math.ceil((score + 1000) / 2500) * 2500
  const tierRange = 2500
  const currentProgress = score % tierRange
  return {
    tier: 'MYTHIC',
    nextTier: 'ASCENDED',
    target: nextTarget,
    percent: 100,
    currentProgress,
    tierRange
  }
}

export function DashboardPage(): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  
  const [stats, setStats] = useState<any>(null)
  const [recentGames, setRecentGames] = useState<any[]>([])
  const [showPrivacyWarning, setShowPrivacyWarning] = useState(false)
  const [insight, setInsight] = useState<string | null>(null)
  const [loadingInsight, setLoadingInsight] = useState(false)
  
  const [profile, setProfile] = useState<any>(null)
  const [appProfile, setAppProfile] = useState<any>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isPageLoading, setIsPageLoading] = useState(true)
  
  const [generatingScore, setGeneratingScore] = useState(false)
  const [dashboardData, setDashboardData] = useState<any>(null)
  
  const { onlineUserIds, onlineUsers } = usePresenceStore()
  const [onlineFriends, setOnlineFriends] = useState<any[]>([])
  
  useEffect(() => {
    loadData()
    
    // Listen for sync status to detect privacy issues and refresh data
    const unsubscribe = window.api.onSyncStatus((status: any) => {
      if (status.privacyIssue) {
        setShowPrivacyWarning(true)
      }
      // Reload data when sync completes
      if (!status.isRunning && status.progress === 100) {
        loadData()
      }
    })
    
    window.addEventListener('online', loadData)
    
    return () => {
      unsubscribe()
      window.removeEventListener('online', loadData)
    }
  }, [])
  
  const loadData = async () => {
    try {
      let supabasePromise: Promise<any> = Promise.resolve(null)
      if (supabase) {
        const sb = supabase
        supabasePromise = sb.auth.getSession().then(async ({ data: { session } }) => {
          if (!session) {
            const cached = localStorage.getItem('cached_app_profile')
            return cached ? JSON.parse(cached) : null
          }
          const { data, error } = await sb.from('users').select('*').eq('id', session.user.id).single()
          if (data) {
            localStorage.setItem('cached_app_profile', JSON.stringify(data))
            return data
          }
          if (error) throw error
          return null
        }).catch((e) => {
          console.warn('Dashboard fetch error, using cache:', e)
          const cached = localStorage.getItem('cached_app_profile')
          return cached ? JSON.parse(cached) : null
        })
      } else {
        const cached = localStorage.getItem('cached_app_profile')
        supabasePromise = Promise.resolve(cached ? JSON.parse(cached) : null)
      }

      const [statsRes, recentRes, dashRes, friendsRes, profRes, appProfData] = await Promise.all([
        window.api.getStats().catch(() => ({ success: false, data: null })),
        window.api.getRecentGames(5).catch(() => ({ success: false, data: null })),
        window.api.dashboard.getData().catch(() => ({ success: false, data: null })),
        window.api.friends.getFriends().catch(() => ({ success: false, data: null })),
        window.api.getSteamProfile().catch(() => ({ success: false, data: null })),
        supabasePromise
      ])

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data)
        if (statsRes.data.totalGames > 0 && (!statsRes.data.totalAchievements || statsRes.data.totalAchievements === 0)) {
          setShowPrivacyWarning(true)
        } else if (statsRes.data.totalAchievements > 0) {
          setShowPrivacyWarning(false)
        }
      }

      if (recentRes.success && recentRes.data) setRecentGames(recentRes.data)
      if (dashRes.success && dashRes.data) setDashboardData(dashRes.data)
      if (friendsRes.success && friendsRes.data) setOnlineFriends(friendsRes.data)
      if (profRes.success && profRes.data) setProfile(profRes.data)
      if (appProfData) setAppProfile(appProfData)

      if (statsRes.success && statsRes.data && statsRes.data.totalGames > 0) {
        setLoadingInsight(true)
        window.api.dashboard.getWeeklyInsight()
          .then(insightRes => {
            if (insightRes?.success && insightRes.data) {
              setInsight(insightRes.data)
            }
          })
          .catch(err => {
            console.warn('Failed to load weekly insight', err)
          })
          .finally(() => {
            setLoadingInsight(false)
          })
      }
    } catch (e) {
      console.error('Failed to load dashboard data', e)
    } finally {
      setIsLoadingProfile(false)
      setIsPageLoading(false)
    }
  }

  const handleGenerateScore = async () => {
    const lastGen = localStorage.getItem('last_gamemind_score_ai_generation')
    if (lastGen) {
      const lastGenTime = parseInt(lastGen, 10)
      const diffMs = Date.now() - lastGenTime
      const diffMinutes = Math.floor(diffMs / 60000)
      if (diffMinutes < 60) {
        const remaining = 60 - diffMinutes
        toast.error(
          t('dashboard.scoreCooldown', 'Пожалуйста, подождите {{minutes}} мин. перед повторным расчетом.', { minutes: remaining }),
          { id: 'score-cooldown' }
        )
        return
      }
    }

    setGeneratingScore(true)
    try {
      const res = await window.api.ai.generateGameMindScore()
      if (res.success) {
        const profRes = await window.api.getSteamProfile()
        if (profRes.success && profRes.data) {
          setProfile(profRes.data)
          localStorage.setItem('last_gamemind_score_ai_generation', Date.now().toString())
          toast.success(t('dashboard.scoreSuccess', 'GameMind Score успешно рассчитан!'), { id: 'score-success' })
        }
      } else {
        toast.error(res.error || t('dashboard.scoreError', 'Не удалось рассчитать GameMind Score'), { id: 'score-error' })
      }
    } catch (e: any) {
      console.error(e)
      toast.error(e.message || t('dashboard.scoreError', 'Произошла непредвиденная ошибка'), { id: 'score-error' })
    } finally {
      setGeneratingScore(false)
    }
  }

  const handleRefreshInsight = async () => {
    if (loadingInsight) return
    setLoadingInsight(true)
    try {
      const res = await window.api.dashboard.getWeeklyInsight(true)
      if (res?.success && res.data) {
        setInsight(res.data)
        toast.success(
          isRu ? 'Аналитика недели обновлена' : 'Weekly insight updated',
          { id: 'insight-refresh' }
        )
      } else {
        toast.error(res?.error || (isRu ? 'Не удалось обновить аналитику' : 'Failed to update insight'), { id: 'insight-refresh-err' })
      }
    } catch (err: any) {
      console.warn('Failed to refresh weekly insight', err)
      toast.error(err?.message || (isRu ? 'Ошибка обновления' : 'Refresh error'), { id: 'insight-refresh-err' })
    } finally {
      setLoadingInsight(false)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) {
      return t('dashboard.goodMorning', 'Доброе утро')
    }
    if (hour >= 12 && hour < 18) {
      return t('dashboard.goodAfternoon', 'Добрый день')
    }
    if (hour >= 18 && hour < 23) {
      return t('dashboard.goodEvening', 'Добрый вечер')
    }
    return t('dashboard.goodNight', 'Доброй ночи')
  }

  const formatPlaytime = (minutes: number) => {
    if (!minutes) return `0${t('library.playtime', 'h')}`
    return `${(minutes / 60).toFixed(1)}${t('library.playtime', 'h')}`
  }

  const formatPlaytimeRU = (minutes: number) => {
    if (!minutes) return '0 мин.'
    if (minutes < 60) return `${minutes} мин.`
    const hours = Math.floor(minutes / 60)
    const remainingMins = minutes % 60
    if (remainingMins === 0) return `${hours} ч.`
    return `${hours} ч. ${remainingMins} мин.`
  }

  const formatPlaytimeEN = (minutes: number) => {
    if (!minutes) return '0 min'
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const remainingMins = minutes % 60
    if (remainingMins === 0) return `${hours}h`
    return `${hours}h ${remainingMins}m`
  }

  const isRu = (i18n.language || '').toLowerCase().startsWith('ru')
  const displayAvatar = appProfile?.avatar_url || profile?.avatarUrl
  const displayName = appProfile?.username || profile?.personaName
  const lastSessionMins = recentGames.length > 0
    ? (recentGames[0].lastSessionPlaytime || 0)
    : 0
  const scoreNum = profile?.gamemindScore ? Number(profile.gamemindScore) : 0
  const tierInfo = getTierInfo(scoreNum)

  const displayAnalysis = (() => {
    if (!profile?.gamemindAnalysis) {
      return t('dashboard.gamemindAnalysisDefault', 'Глубокий анализ игровых систем и механик для достижения максимального соревновательного преимущества.')
    }
    return profile.gamemindAnalysis
  })()

  const displayInsight = (() => {
    if (!insight) {
      return t(
        'dashboard.weeklyInsightDefault',
        'Неделя прошла в спокойном темпе. Отличный момент, чтобы стряхнуть пыль с бэклога или погрузиться в сюжетное приключение на пару часов.'
      )
    }
    return insight
  })()

  const getRecommendationReason = (rec: any) => {
    if (!rec) return ''
    if (
      rec.reasonKey === 'unplayed' ||
      rec.reason === "You haven't played this game yet." ||
      rec.reason === "Игра ещё не запускалась"
    ) {
      return t('dashboard.reasonUnplayed', 'Игра ещё не запускалась')
    }
    if (rec.reasonKey === 'favoriteGenre' || rec.reason?.startsWith('Matches your favorite genre:')) {
      const genre = rec.reasonParam || rec.reason.replace('Matches your favorite genre:', '').trim()
      return t('dashboard.reasonGenre', 'Соответствует любимому жанру: {{genre}}', { genre })
    }
    return rec.reason
  }

  if (isPageLoading) {
    return (
      <div className="dashboard">
        {/* Welcome Section Wireframe */}
        <div className="dashboard__welcome dashboard__skeleton-panel">
          <div className="dashboard__welcome-content">
            <div className="dashboard__welcome-left">
              <div className="dashboard__welcome-header">
                <div className="dashboard__skeleton-shimmer dashboard__welcome-avatar-skeleton" />
                <div className="dashboard__skeleton-col">
                  <div className="dashboard__skeleton-shimmer" style={{ width: '220px', height: '24px' }} />
                  <div className="dashboard__skeleton-shimmer" style={{ width: '180px', height: '14px' }} />
                </div>
              </div>
            </div>
            <div className="dashboard__welcome-right">
              <div className="dashboard__welcome-divider" />
              <div className="dashboard__welcome-preview" style={{ cursor: 'default' }}>
                <div className="dashboard__skeleton-shimmer" style={{ width: '130px', height: '14px', marginBottom: '8px' }} />
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div className="dashboard__skeleton-shimmer" style={{ width: '80px', height: '40px' }} />
                  <div className="dashboard__skeleton-col" style={{ flex: 1 }}>
                    <div className="dashboard__skeleton-shimmer" style={{ width: '100px', height: '14px' }} />
                    <div className="dashboard__skeleton-shimmer" style={{ width: '60px', height: '12px' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* GameMind Score Wireframe */}
        <div className="dashboard__gamemind-score dashboard__skeleton-panel">
          <div className="gamemind-score__top">
            <div className="gamemind-score__info" style={{ width: '100%' }}>
              <div className="dashboard__skeleton-shimmer" style={{ width: '160px', height: '16px', marginBottom: '8px' }} />
              <div className="dashboard__skeleton-shimmer" style={{ width: '220px', height: '22px', marginBottom: '6px' }} />
              <div className="dashboard__skeleton-shimmer" style={{ width: '70%', height: '14px' }} />
            </div>
            <div className="gamemind-score__action">
              <div className="dashboard__skeleton-shimmer" style={{ width: '90px', height: '48px' }} />
            </div>
          </div>
          <div className="gamemind-score__progress-section">
            <div className="dashboard__skeleton-shimmer" style={{ width: '100%', height: '20px', borderRadius: '3px' }} />
          </div>
        </div>

        {/* Stats Grid Wireframe */}
        <div className="dashboard__stats">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="stat-card">
              <div className="dashboard__skeleton-shimmer" style={{ width: '34px', height: '34px', flexShrink: 0 }} />
              <div className="stat-card__content">
                <div className="dashboard__skeleton-shimmer" style={{ width: '54px', height: '18px' }} />
                <div className="dashboard__skeleton-shimmer" style={{ width: '74px', height: '12px' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Smart Widgets Wireframe */}
        <div className="dashboard__grid dashboard__smart-grid">
          <div className="dashboard__card dashboard__card--large dashboard__skeleton-panel">
            <div className="dashboard__skeleton-shimmer" style={{ width: '180px', height: '18px', marginBottom: '14px' }} />
            <div className="dashboard__skeleton-col">
              <div className="dashboard__skeleton-shimmer" style={{ width: '96%', height: '14px' }} />
              <div className="dashboard__skeleton-shimmer" style={{ width: '88%', height: '14px' }} />
              <div className="dashboard__skeleton-shimmer" style={{ width: '65%', height: '14px' }} />
            </div>
          </div>
          <div className="dashboard__card dashboard__skeleton-panel">
            <div className="dashboard__skeleton-shimmer" style={{ width: '150px', height: '18px', marginBottom: '14px' }} />
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div className="dashboard__skeleton-shimmer" style={{ width: '96px', height: '46px', flexShrink: 0 }} />
              <div className="dashboard__skeleton-col" style={{ flex: 1 }}>
                <div className="dashboard__skeleton-shimmer" style={{ width: '120px', height: '14px' }} />
                <div className="dashboard__skeleton-shimmer" style={{ width: '160px', height: '12px' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="dashboard"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* Privacy Warning Banner */}
      <AnimatePresence>
        {showPrivacyWarning && (
          <motion.div 
            className="dashboard__privacy-warning"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <AlertTriangle size={16} />
            <div className="dashboard__privacy-warning-text">
              <strong>{t('privacy.warningTitle')}</strong>
              <span>{t('privacy.warningMessage')}</span>
            </div>
            <button 
              className="dashboard__privacy-warning-dismiss"
              onClick={() => setShowPrivacyWarning(false)}
              title={t('privacy.dismiss')}
              aria-label="Dismiss warning"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3.1. Welcome Section — Clean greeting and concise session status */}
      <motion.div 
        className="dashboard__welcome" 
        variants={fadeUp}
      >
        <div className="dashboard__welcome-content">
          <div className="dashboard__welcome-left">
            <div className="dashboard__welcome-header">
              {isLoadingProfile ? (
                <>
                  <div className="dashboard__skeleton-shimmer dashboard__welcome-avatar-skeleton" />
                  <div className="dashboard__skeleton-col">
                    <div className="dashboard__skeleton-shimmer" style={{ width: '220px', height: '24px' }} />
                    <div className="dashboard__skeleton-shimmer" style={{ width: '180px', height: '14px' }} />
                  </div>
                </>
              ) : (
                <>
                  {displayAvatar && (
                    <div className="dashboard__avatar-wrapper">
                      <img 
                        src={displayAvatar} 
                        alt="Avatar" 
                        className="dashboard__welcome-avatar"
                      />
                      <div className="dashboard__avatar-status" />
                    </div>
                  )}
                  <div className="dashboard__welcome-info">
                    <h1 className="dashboard__title">
                      {getGreeting()}{displayName ? `, ${displayName}` : ''}
                    </h1>

                    <p className="dashboard__subtitle">
                      {lastSessionMins > 0 ? (
                        t('dashboard.lastSessionAgo', {
                          time: isRu ? formatPlaytimeRU(lastSessionMins) : formatPlaytimeEN(lastSessionMins)
                        })
                      ) : stats?.totalGames ? (
                        isRu ? 'Длительность последней сессии вычисляется' : 'Last session duration is being calculated'
                      ) : (
                        t('dashboard.setupPrompt')
                      )}
                    </p>
                  </div>
                </>
              )}
            </div>

            {!isLoadingProfile && !stats?.totalGames && (
              <div className="dashboard__connect-wrapper">
                <Button 
                  variant="primary" 
                  size="md"
                  id="btn-connect-steam"
                  onClick={() => navigate('/settings', { state: { activeTab: 'steam' } })}
                  iconLeft={<Gamepad2 size={16} />}
                >
                  {t('dashboard.connectSteam')}
                </Button>
              </div>
            )}
          </div>

          {recentGames.length > 0 && (
            <div className="dashboard__welcome-right">
              <div className="dashboard__welcome-divider" />
              <div 
                className="dashboard__welcome-preview"
                onClick={() => window.api.steamProtocolAction('run', recentGames[0].appId)}
                role="button"
                tabIndex={0}
                title={t('dashboard.launch', 'Запуск')}
              >
                <div className="dashboard__quick-card-badge">
                  <span className="dashboard__quick-card-badge-label">
                    {t('dashboard.lastSessionTitle', 'Последняя сессия')}
                  </span>
                </div>
                <div className="dashboard__quick-card-content">
                  <img 
                    src={`https://steamcdn-a.akamaihd.net/steam/apps/${recentGames[0].appId}/capsule_184x69.jpg`}
                    alt={recentGames[0].name}
                    className="dashboard__quick-card-img"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/${recentGames[0].appId}/${recentGames[0].imgIconUrl}.jpg`
                    }}
                  />
                  <div className="dashboard__quick-card-info">
                    <span className="dashboard__quick-card-title">{recentGames[0].name}</span>
                    <div className="dashboard__quick-card-sub">
                      <span className="dashboard__quick-card-total font-mono text-xs text-zinc-400">
                        {isRu ? 'Всего:' : 'Total:'} <strong className="text-zinc-200 font-mono">{formatPlaytime(recentGames[0].playtimeForever)}</strong>
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="dashboard__quick-launch-btn"
                        iconLeft={<Play size={10} fill="currentColor" />}
                        onClick={(e) => {
                          e.stopPropagation()
                          window.api.steamProtocolAction('run', recentGames[0].appId)
                        }}
                      >
                        {t('dashboard.launch', 'Запуск')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* 3.1. GameMind Score Section — Pure rank title, clean tier badge, points label */}
      {stats?.totalGames > 0 && (
        <motion.div className="dashboard__gamemind-score" variants={fadeUp}>
          <div className="gamemind-score__top">
            <div className="gamemind-score__info">
              <div className="gamemind-score__tag-row">
                <span className="gamemind-score__label">
                  {t('dashboard.gamemindScoreTitle', 'GameMind Score')}
                </span>
                {profile?.gamemindScore && (
                  <Badge variant="accent" size="xs">
                    {`TIER: ${tierInfo.tier}`}
                  </Badge>
                )}
                {profile?.gamemindScore && (
                  <button 
                    className="gamemind-score__refresh-btn"
                    onClick={handleGenerateScore}
                    disabled={generatingScore}
                    title={t('dashboard.updateScore', 'Обновить')}
                    aria-label="Update Score"
                  >
                    <RefreshCw size={12} className={generatingScore ? 'animate-spin' : ''} />
                  </button>
                )}
              </div>

              {profile?.gamemindScore ? (
                <>
                  <h2 className="gamemind-score__title">{profile.gamemindTitle}</h2>
                  <p className="gamemind-score__analysis">{displayAnalysis}</p>
                </>
              ) : (
                <p className="gamemind-score__prompt">
                  {t('dashboard.gamemindScorePrompt', 'Узнайте свой ранг игрового интеллекта на основе статистики вашей библиотеки и ИИ-анализа.')}
                </p>
              )}
            </div>

            <div className="gamemind-score__action">
              {profile?.gamemindScore ? (
                <div className="gamemind-score__number-block">
                  <span className="gamemind-score__number-tag font-mono">SCORE</span>
                  <div className="gamemind-score__number font-mono tabular-nums">
                    {profile.gamemindScore}
                  </div>
                  <span className="gamemind-score__number-sub font-mono">
                    {t('dashboard.points', 'очков')}
                  </span>
                </div>
              ) : (
                <Button 
                  variant="secondary" 
                  size="md"
                  onClick={handleGenerateScore}
                  disabled={generatingScore || !stats?.totalGames}
                  isLoading={generatingScore}
                  iconLeft={!generatingScore ? <Dna size={16} /> : undefined}
                >
                  {t('dashboard.calculateScore', 'Рассчитать Score')}
                </Button>
              )}
            </div>
          </div>

          {/* Full-width bordered SegmentedMeter matching Player DNA */}
          {profile?.gamemindScore && (
            <div className="gamemind-score__progress-section">
              <div className="gamemind-score__progress-header font-mono text-xs">
                <span className="text-zinc-400">
                  {t('dashboard.pointsToNextRank', {
                    current: tierInfo.currentProgress,
                    target: tierInfo.tierRange,
                    nextRank: tierInfo.nextTier
                  })}
                </span>
                <span className="text-zinc-300 font-semibold tabular-nums">{tierInfo.percent}%</span>
              </div>
              <div className="gamemind-score__segmented-track">
                <SegmentedMeter
                  value={tierInfo.percent}
                  max={100}
                  segments={44}
                  size="sm"
                  showValue={false}
                  accentColor="current"
                  animated={true}
                />
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* 3.2. Stats Grid — Concise labels without truncation */}
      <motion.div className="dashboard__stats" variants={fadeUp}>
        <StatCard
          icon={<Library size={18} />}
          label={t('dashboard.stats.gamesCount')}
          value={stats ? stats.totalGames.toString() : '—'}
        />
        <StatCard
          icon={<Clock size={18} />}
          label={t('dashboard.stats.totalPlaytime')}
          value={stats ? formatPlaytime(stats.totalPlaytime) : '—'}
        />
        <StatCard
          icon={<Trophy size={18} />}
          label={t('dashboard.stats.achievements')}
          value={stats && stats.totalAchievements !== undefined ? stats.totalAchievements.toString() : '—'}
        />
        <StatCard
          icon={<Star size={18} />}
          label={t('dashboard.stats.gamesPlayed')}
          value={stats ? stats.playedGames.toString() : '—'}
        />
        <StatCard
          icon={<Gamepad2 size={18} />}
          label={t('dashboard.stats.avgPlaytime')}
          value={stats && stats.playedGames > 0 ? formatPlaytime(stats.totalPlaytime / stats.playedGames) : '—'}
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label={t('dashboard.stats.completionRate')}
          value={stats && stats.completionRate !== undefined ? `${stats.completionRate}%` : '—'}
        />
      </motion.div>

      {/* 3.3. Smart Dashboard Widgets — Natural titles and visual balance */}
      {stats?.totalGames > 0 && (
        dashboardData ? (
          <motion.div className="dashboard__grid dashboard__smart-grid" variants={fadeUp}>
            {/* Weekly Insight */}
            <div className="dashboard__card dashboard__card--large dashboard__insight-card">
              <div className="dashboard__card-header-bar">
                <div className="dashboard__card-title-group">
                  <Activity size={15} className="text-zinc-400" />
                  <span className="dashboard__card-heading">{t('dashboard.weeklyInsight', 'Аналитика недели')}</span>
                </div>
                <button 
                  className="gamemind-score__refresh-btn"
                  onClick={handleRefreshInsight}
                  disabled={loadingInsight}
                  title={t('dashboard.updateInsight', 'Обновить аналитику')}
                  aria-label="Update Weekly Insight"
                >
                  <RefreshCw size={12} className={loadingInsight ? 'animate-spin' : ''} />
                </button>
              </div>
              <div className="dashboard__insight-content-box">
                {loadingInsight ? (
                  <div className="dashboard__insight-loading">
                    <Loader2 size={14} className="animate-spin text-zinc-400" />
                    <span className="text-xs text-zinc-400">
                      {isRu ? 'Компаньон анализирует неделю...' : 'Companion is analyzing the week...'}
                    </span>
                  </div>
                ) : displayInsight ? (
                  <p className="dashboard__insight-text">{displayInsight}</p>
                ) : (
                  <div className="dashboard__empty-state-compact">
                    <p className="dashboard__insight-empty text-xs text-zinc-500">
                      {t('dashboard.insightsPlaceholder', 'ИИ-аналитика появится здесь после синхронизации вашей библиотеки')}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Next Target / Up Next Recommendation */}
            <div className="dashboard__card dashboard__up-next-card">
              <div className="dashboard__card-header-bar">
                <div className="dashboard__card-title-group">
                  <Target size={15} className="text-zinc-400" />
                  <span className="dashboard__card-heading">{t('dashboard.upNext', 'Следующая игра')}</span>
                </div>
                <Badge variant="accent" size="xs">
                  {t('dashboard.statusUnplayed', 'Не сыграно')}
                </Badge>
              </div>

              {dashboardData.deterministicRecommendation ? (
                <div 
                  className="up-next-item"
                  onClick={() => window.api.steamProtocolAction('run', dashboardData.deterministicRecommendation.appId)}
                  role="button"
                  tabIndex={0}
                  title={t('dashboard.launch', 'Запуск')}
                >
                  <div className="up-next-poster-container">
                    <img 
                      src={`https://steamcdn-a.akamaihd.net/steam/apps/${dashboardData.deterministicRecommendation.appId}/capsule_184x69.jpg`} 
                      alt={dashboardData.deterministicRecommendation.name} 
                      className="up-next-img"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://media.steampowered.com/steamcommunity/public/images/apps/${dashboardData.deterministicRecommendation.appId}/${dashboardData.deterministicRecommendation.imgIconUrl}.jpg`
                      }}
                    />
                  </div>
                  <div className="up-next-info">
                    <div className="up-next-header-row">
                      <h4 className="up-next-title">{dashboardData.deterministicRecommendation.name}</h4>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="up-next-launch-btn"
                        iconLeft={<Play size={10} fill="currentColor" />}
                        onClick={(e) => {
                          e.stopPropagation()
                          window.api.steamProtocolAction('run', dashboardData.deterministicRecommendation.appId)
                        }}
                      >
                        {t('dashboard.launch', 'Запуск')}
                      </Button>
                    </div>
                    <p className="up-next-desc">{getRecommendationReason(dashboardData.deterministicRecommendation)}</p>
                  </div>
                </div>
              ) : (
                <div className="dashboard__empty-state--compact">
                  <Target size={15} className="dashboard__empty-state-icon" />
                  <span className="dashboard__empty-state-text">
                    {isRu ? 'Нет выбранной цели' : 'No target selected'}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div className="dashboard__grid" variants={fadeUp} style={{ marginBottom: '20px' }}>
            <div className="dashboard__skeleton-block" style={{ minHeight: '150px' }} />
            <div className="dashboard__skeleton-block" style={{ minHeight: '150px' }} />
          </motion.div>
        )
      )}

      {/* 3.4. Row 2: Friends & Wishlist — Clean ultra-compact empty states */}
      {stats?.totalGames > 0 && (
        dashboardData ? (
          <motion.div className="dashboard__grid dashboard__smart-grid" variants={fadeUp}>
            {/* Friends Activity */}
            <div className="dashboard__card">
              <div className="dashboard__card-header-bar">
                <div className="dashboard__card-title-group">
                  <Users size={15} className="text-zinc-400" />
                  <span className="dashboard__card-heading">
                    {t('dashboard.friendsActivity', 'Друзья онлайн')} ({onlineFriends.filter((f: any) => onlineUserIds.has(f.id)).length})
                  </span>
                </div>
              </div>
              {(() => {
                const filteredFriends = onlineFriends.filter((f: any) => onlineUserIds.has(f.id))
                if (filteredFriends.length === 0) {
                  return (
                    <div className="dashboard__empty-state--compact">
                      <Users size={15} className="dashboard__empty-state-icon" />
                      <span className="dashboard__empty-state-text">
                        {t('dashboard.noFriendsPlaying', 'Сейчас никто из друзей не играет')}
                      </span>
                    </div>
                  )
                }
                return (
                  <div className="friends-list">
                    {filteredFriends.slice(0, 8).map((f: any, i: number) => {
                      const presence = onlineUsers[f.id]
                      const gameName = presence?.currentGame
                      return (
                        <div 
                          key={i} 
                          className="friend-item" 
                          onClick={() => navigate(`/profile/${f.id}`)}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="friend-avatar avatar-container">
                            {f.avatar_url && !f.avatar_url.startsWith('file://') ? (
                              <img src={f.avatar_url} alt={f.username} className="friend-avatar-img" />
                            ) : (
                              <span className="font-mono text-xs text-zinc-400">{f.username.charAt(0).toUpperCase()}</span>
                            )}
                            <div className="avatar-online-indicator" />
                          </div>
                          <div className="friend-meta">
                            <div className="friend-name">{f.username}</div>
                            {gameName ? (
                              <div className="friend-status playing font-mono text-xs">
                                {gameName}
                              </div>
                            ) : (
                              <div className="friend-status online font-mono text-xs">
                                Онлайн
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>

            {/* Wishlist Deals */}
            <div className="dashboard__card">
              <div className="dashboard__card-header-bar">
                <div className="dashboard__card-title-group">
                  <Tag size={15} className="text-zinc-400" />
                  <span className="dashboard__card-heading">
                    {t('dashboard.wishlistDeals', 'Скидки из желаемого')} ({dashboardData.wishlistDeals?.length || 0})
                  </span>
                </div>
              </div>
              {dashboardData.wishlistDeals && dashboardData.wishlistDeals.length > 0 ? (
                <div className="deals-list">
                  {dashboardData.wishlistDeals.map((w: any, i: number) => (
                    <div key={i} className="deal-item">
                      <span className="deal-name">{w.name}</span>
                      <Badge variant="success" size="xs">
                        -{w.discountPercent}%
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dashboard__empty-state--compact">
                  <Tag size={15} className="dashboard__empty-state-icon" />
                  <span className="dashboard__empty-state-text">
                    {t('dashboard.noDeals', 'Нет активных скидок')}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div className="dashboard__grid" variants={fadeUp} style={{ marginBottom: '20px' }}>
            <div className="dashboard__skeleton-block" style={{ minHeight: '150px' }} />
            <div className="dashboard__skeleton-block" style={{ minHeight: '150px' }} />
          </motion.div>
        )
      )}

      {/* Recent Activity List */}
      <motion.div className="dashboard__grid dashboard__grid--full" variants={fadeUp}>
        <div className="dashboard__card dashboard__card--large">
          <div className="dashboard__card-header-bar">
            <div className="dashboard__card-title-group">
              <Clock size={15} className="text-zinc-400" />
              <span className="dashboard__card-heading">
                {t('dashboard.recentActivity', 'Недавняя активность')} ({recentGames.length})
              </span>
            </div>
          </div>
          {recentGames.length > 0 ? (
            <div className="dashboard__recent-list">
              {recentGames.map(game => (
                <div 
                  key={game.appId} 
                  className="recent-game-row"
                  onClick={() => window.api.steamProtocolAction('run', game.appId)}
                  role="button"
                  tabIndex={0}
                  title={t('dashboard.launch', 'Запуск')}
                >
                  <div className="recent-game-row__image-container">
                    <img 
                      src={`https://steamcdn-a.akamaihd.net/steam/apps/${game.appId}/capsule_184x69.jpg`} 
                      alt={game.name}
                      className="recent-game-row__image"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/${game.appId}/${game.imgIconUrl}.jpg`
                      }}
                    />
                  </div>
                  <div className="recent-game-row__info">
                    <div className="recent-game-row__title">{game.name}</div>
                    <div className="recent-game-row__playtime font-mono tabular-nums">
                      <span className="text-zinc-200 font-medium">
                        {formatPlaytime(game.playtime2Weeks)}
                      </span>
                      <span className="text-zinc-500">
                        • {t('dashboard.recentlyPlayed')} ({t('dashboard.totalPlayed')}: {formatPlaytime(game.playtimeForever)})
                      </span>
                    </div>
                  </div>
                  <div className="recent-game-row__action">
                    <Button
                      variant="secondary"
                      size="sm"
                      iconLeft={<Play size={10} fill="currentColor" />}
                      onClick={(e) => {
                        e.stopPropagation()
                        window.api.steamProtocolAction('run', game.appId)
                      }}
                    >
                      {t('dashboard.launch', 'Запуск')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard__empty-state">
              <Gamepad2 size={24} className="dashboard__empty-state-icon" />
              <span className="dashboard__empty-state-text">
                {t('dashboard.emptyActivity')}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function StatCard({
  icon,
  label,
  value
}: {
  icon: React.ReactNode
  label: string
  value: string
}): React.JSX.Element {
  return (
    <motion.div className="stat-card" variants={fadeUp}>
      <div className="stat-card__icon-wrapper" aria-hidden="true">
        {icon}
      </div>
      <div className="stat-card__content">
        <span className="stat-card__value font-mono tabular-nums">{value}</span>
        <span className="stat-card__label">{label}</span>
      </div>
    </motion.div>
  )
}
