import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Clock, Gamepad2, Trophy, PlusSquare, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatsProps {
  stats: {
    hoursPlayed: number;
    gamesPlayed: number;
    achievementsUnlocked: number;
    newGamesAdded: number;
    gamemindScoreDelta: number | null;
  }
}

export const JournalStatsCards = ({ stats }: StatsProps) => {
  const { t } = useTranslation()

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <motion.div className="journal-stats-grid" variants={container} initial="hidden" animate="show">
      <motion.div className="stat-card" variants={item}>
        <div className="stat-icon-wrapper"><Clock size={24} /></div>
        <div className="stat-info">
          <span className="stat-label">{t('journal.hours')}</span>
          <span className="stat-value">{stats.hoursPlayed.toFixed(1)}</span>
        </div>
      </motion.div>

      <motion.div className="stat-card" variants={item}>
        <div className="stat-icon-wrapper"><Gamepad2 size={24} /></div>
        <div className="stat-info">
          <span className="stat-label">{t('journal.games')}</span>
          <span className="stat-value">{stats.gamesPlayed}</span>
        </div>
      </motion.div>

      <motion.div className="stat-card" variants={item}>
        <div className="stat-icon-wrapper"><Trophy size={24} /></div>
        <div className="stat-info">
          <span className="stat-label">{t('journal.achievements')}</span>
          <span className="stat-value">{stats.achievementsUnlocked}</span>
        </div>
      </motion.div>

      <motion.div className="stat-card" variants={item}>
        <div className="stat-icon-wrapper"><PlusSquare size={24} /></div>
        <div className="stat-info">
          <span className="stat-label">{t('journal.newGames')}</span>
          <span className="stat-value">{stats.newGamesAdded}</span>
        </div>
      </motion.div>

      {stats.gamemindScoreDelta !== null && (
        <motion.div className="stat-card" variants={item}>
          <div className="stat-icon-wrapper">
            {stats.gamemindScoreDelta > 0 ? (
              <TrendingUp size={24} className="score-up" />
            ) : stats.gamemindScoreDelta < 0 ? (
              <TrendingDown size={24} className="score-down" />
            ) : (
              <Minus size={24} />
            )}
          </div>
          <div className="stat-info">
            <span className="stat-label">{t('journal.gamemindScore')}</span>
            <span className="stat-value">{stats.gamemindScoreDelta > 0 ? '+' : ''}{stats.gamemindScoreDelta}</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
