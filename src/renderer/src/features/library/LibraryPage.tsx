import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { GameCard } from '../../components/ui/GameCard'
import './LibraryPage.css'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 }
  }
}

export function LibraryPage(): React.JSX.Element {
  const { t } = useTranslation()
  const [games, setGames] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadGames()
  }, [])

  const loadGames = async () => {
    setIsLoading(true)
    try {
      const res = await window.api.getGames()
      if (res.success && res.data) {
        setGames(res.data)
      }
    } catch (e) {
      console.error('Failed to load games', e)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredGames = useMemo(() => {
    if (!searchQuery) return games
    const lower = searchQuery.toLowerCase()
    return games.filter(g => g.name.toLowerCase().includes(lower))
  }, [games, searchQuery])

  return (
    <motion.div
      className="library"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.1 } } }}
    >
      <div className="library__header">
        <motion.h1 className="library__title" variants={fadeUp}>
          {t('library.title')} <span className="library__count">({games.length})</span>
        </motion.h1>

        <motion.div className="library__controls" variants={fadeUp}>
          <div className="library__search">
            <Search size={18} className="library__search-icon" />
            <input
              type="text"
              placeholder={t('library.search')}
              className="library__search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </motion.div>
      </div>

      <motion.div className="library__grid" variants={stagger}>
        {isLoading ? (
          <div className="library__loading">Loading...</div>
        ) : filteredGames.length > 0 ? (
          filteredGames.map(game => (
            <GameCard key={game.appId} game={game} />
          ))
        ) : (
          <div className="library__empty">
            <p>No games found.</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
