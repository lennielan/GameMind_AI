import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

interface TopGame { name: string; hours: number; percentOfTotal: number; appId: number; }

interface Props {
  games: TopGame[]
}

export const JournalTopGames = ({ games }: Props) => {
  const { t } = useTranslation()

  if (!games || games.length === 0) return null

  const maxHours = Math.max(...games.map(g => g.hours))

  return (
    <motion.div 
      className="journal-section top-games-section"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <h3 style={{ textAlign: 'center', marginBottom: '24px' }}>{t('journal.topGames')}</h3>
      <div className="top-games-list">
        {games.map((game, idx) => (
          <div key={game.appId} className={`top-game-item rank-${idx + 1}`}>
            <div className="top-game-info">
              <span className="game-rank">#{idx + 1}</span>
              <span className="game-name">{game.name}</span>
              <span className="game-hours">{game.hours.toFixed(1)} {t('journal.hours')}</span>
            </div>
            <div className="game-bar-track">
              <motion.div 
                className="game-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max((game.hours / maxHours) * 100, 2)}%` }}
                transition={{ duration: 1, delay: 0.5 + (idx * 0.1) }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
