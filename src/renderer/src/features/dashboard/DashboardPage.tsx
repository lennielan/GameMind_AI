// ============================================================
// Dashboard Page — Main overview
// ============================================================

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Gamepad2,
  Clock,
  Trophy,
  TrendingUp,
  Library,
  Star,
  AlertTriangle,
  X
} from 'lucide-react'
import './DashboardPage.css'
import { SteamLoginModal } from '../../components/ui/SteamLoginModal'
import { UpdaterNotification } from '../../components/ui/UpdaterNotification'

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 }
  }
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } }
}

export function DashboardPage(): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  
  const [stats, setStats] = useState<any>(null)
  const [recentGames, setRecentGames] = useState<any[]>([])
  const [showPrivacyWarning, setShowPrivacyWarning] = useState(false)
  const [insight, setInsight] = useState<string | null>(null)
  const [loadingInsight, setLoadingInsight] = useState(false)
  
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
    
    return () => unsubscribe()
  }, [])
  
  const loadData = async () => {
    const statsRes = await window.api.getStats()
    if (statsRes.success && statsRes.data) {
      setStats(statsRes.data)
      // Show privacy warning if there are games but no achievements at all
      if (statsRes.data.totalGames > 0 && (!statsRes.data.totalAchievements || statsRes.data.totalAchievements === 0)) {
        setShowPrivacyWarning(true)
      } else if (statsRes.data.totalAchievements > 0) {
        setShowPrivacyWarning(false)
      }
    }
    
    const recentRes = await window.api.getRecentGames(5)
    if (recentRes.success && recentRes.data) {
      setRecentGames(recentRes.data)
    }

    if (statsRes.success && statsRes.data && statsRes.data.totalGames > 0) {
      setLoadingInsight(true)
      const insightRes = await window.api.getQuickInsights()
      if (insightRes.success && insightRes.data) {
        setInsight(insightRes.data)
      }
      setLoadingInsight(false)
    }
  }

  const formatPlaytime = (minutes: number) => {
    if (!minutes) return `0${t('library.playtime')}`
    return `${(minutes / 60).toFixed(1)}${t('library.playtime')}`
  }
  
  return (
    <motion.div
      className="dashboard"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* Steam Store Login Modal */}
      <SteamLoginModal />
      {/* Auto-Updater Notification */}
      <UpdaterNotification />
      {/* Privacy Warning Banner */}
      <AnimatePresence>
        {showPrivacyWarning && (
          <motion.div 
            className="dashboard__privacy-warning"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <AlertTriangle size={18} />
            <div className="dashboard__privacy-warning-text">
              <strong>{t('privacy.warningTitle')}</strong>
              <span>{t('privacy.warningMessage')}</span>
            </div>
            <button 
              className="dashboard__privacy-warning-dismiss"
              onClick={() => setShowPrivacyWarning(false)}
              title={t('privacy.dismiss')}
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome Section */}
      <motion.div className="dashboard__welcome" variants={fadeUp}>
        <div className="dashboard__welcome-content">
          <h1 className="dashboard__title">{t('dashboard.welcome')}</h1>
          <p className="dashboard__subtitle">
            {stats?.totalGames ? t('dashboard.summary') : t('dashboard.setupPrompt')}
          </p>
          {!stats?.totalGames && (
            <button 
              className="dashboard__connect-btn" 
              id="btn-connect-steam"
              onClick={() => navigate('/settings')}
            >
              <Gamepad2 size={18} />
              {t('dashboard.connectSteam')}
            </button>
          )}
        </div>
        <div className="dashboard__welcome-glow" />
      </motion.div>

      {/* Stats Grid */}
      <motion.div className="dashboard__stats" variants={fadeUp}>
        <StatCard
          icon={<Library size={20} />}
          label={t('dashboard.stats.gamesCount')}
          value={stats ? stats.totalGames.toString() : '—'}
          color="var(--accent-primary)"
        />
        <StatCard
          icon={<Clock size={20} />}
          label={t('dashboard.stats.totalPlaytime')}
          value={stats ? formatPlaytime(stats.totalPlaytime) : '—'}
          color="var(--info)"
        />
        <StatCard
          icon={<Trophy size={20} />}
          label={t('dashboard.stats.achievements')}
          value={stats && stats.totalAchievements !== undefined ? stats.totalAchievements.toString() : '—'}
          color="var(--warning)"
        />
        <StatCard
          icon={<Star size={20} />}
          label={t('dashboard.stats.gamesPlayed')}
          value={stats ? stats.playedGames.toString() : '—'}
          color="#c084fc"
        />
        <StatCard
          icon={<Gamepad2 size={20} />}
          label={t('dashboard.stats.avgPlaytime')}
          value={stats && stats.playedGames > 0 ? formatPlaytime(stats.totalPlaytime / stats.playedGames) : '—'}
          color="#f472b6"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label={t('dashboard.stats.completionRate')}
          value={stats && stats.completionRate !== undefined ? `${stats.completionRate}%` : '—'}
          color="var(--success)"
        />
      </motion.div>

      {/* Placeholder Sections */}
      <motion.div className="dashboard__grid" variants={fadeUp}>
        <div className="dashboard__card dashboard__card--large">
          <h2 className="dashboard__card-title">{t('dashboard.recentActivity')}</h2>
          {recentGames.length > 0 ? (
            <div className="dashboard__recent-list">
              {recentGames.map(game => (
                <div key={game.appId} className="recent-game-row">
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
                    <div className="recent-game-row__playtime">
                      <Clock size={12} />
                      {formatPlaytime(game.playtime2Weeks)} {t('dashboard.recentlyPlayed')} 
                      ({t('dashboard.totalPlayed')}: {formatPlaytime(game.playtimeForever)})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard__card-empty">
              <p>{t('dashboard.emptyActivity')}</p>
            </div>
          )}
        </div>
        <div className="dashboard__card">
          <h2 className="dashboard__card-title">{t('dashboard.quickInsights')}</h2>
          <div className="dashboard__card-empty">
            {loadingInsight ? (
              <p>Loading AI insights...</p>
            ) : insight ? (
              <p style={{ textAlign: 'left', fontStyle: 'italic', color: 'var(--text-secondary)' }}>"{insight}"</p>
            ) : (
              <p>{t('dashboard.insightsPlaceholder')}</p>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}): React.JSX.Element {
  return (
    <motion.div className="stat-card" variants={fadeUp}>
      <div className="stat-card__icon" style={{ color, background: `${color}15` }}>
        {icon}
      </div>
      <div className="stat-card__content">
        <span className="stat-card__value">{value}</span>
        <span className="stat-card__label">{label}</span>
      </div>
    </motion.div>
  )
}
