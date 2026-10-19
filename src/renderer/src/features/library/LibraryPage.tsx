import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo, useRef, startTransition, useDeferredValue } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Search, ChevronDown, Check, Star, Gamepad2 } from 'lucide-react'
import { GameCard } from '../../components/ui/GameCard'
import { FavoritesTab } from './FavoritesTab'
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
  const navigate = useNavigate()
  const [games, setGames] = useState<any[]>([])
  const [steamId, setSteamId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const [sortOption, setSortOption] = useState<'playtime' | 'alphaAsc' | 'alphaDesc' | 'achievementsCount' | 'achievementsPct'>('playtime')
  const [isLoading, setIsLoading] = useState(true)
  const [isSortOpen, setIsSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<'library' | 'favorites'>('library')
  const parentRef = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(1)

  useEffect(() => {
    if (!parentRef.current || activeTab !== 'library') return

    // Immediately calculate initial columns on mount or tab switch
    const width = parentRef.current.clientWidth
    if (width > 0) {
      const initialCols = Math.max(1, Math.floor((width + 20) / 220))
      setColumns(initialCols)
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Compute columns: min width is 200px, gap is 20px (var(--space-5))
        const w = entry.contentRect.width
        const cols = Math.max(1, Math.floor((w + 20) / 220))
        setColumns(cols)
      }
    })
    observer.observe(parentRef.current)
    return () => observer.disconnect()
  }, [activeTab])

  useEffect(() => {
    loadGames()
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (sortRef.current && !target.closest('.library__sort')) {
        setIsSortOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const sortOptions = [
    { value: 'playtime', label: t('library.sort.playtime') },
    { value: 'alphaAsc', label: t('library.sort.alphaAsc') },
    { value: 'alphaDesc', label: t('library.sort.alphaDesc') },
    { value: 'achievementsCount', label: t('library.sort.achievementsCount') },
    { value: 'achievementsPct', label: t('library.sort.achievementsPct') },
  ] as const

  const loadGames = async () => {
    setIsLoading(true)
    try {
      const settingsRes = await window.api.getAllSettings()
      if (settingsRes.success && settingsRes.data) {
        setSteamId(settingsRes.data.steamId || null)
      }

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
    let result = [...games]
    
    if (deferredSearchQuery) {
      const lower = deferredSearchQuery.toLowerCase()
      result = result.filter(g => g.name.toLowerCase().includes(lower))
    }

    result.sort((a, b) => {
      if (sortOption === 'playtime') {
        return (b.playtimeForever || 0) - (a.playtimeForever || 0)
      } else if (sortOption === 'alphaAsc') {
        return a.name.localeCompare(b.name)
      } else if (sortOption === 'alphaDesc') {
        return b.name.localeCompare(a.name)
      } else if (sortOption === 'achievementsCount') {
        return (b.unlockedAchievements || 0) - (a.unlockedAchievements || 0)
      } else if (sortOption === 'achievementsPct') {
        const pctA = a.totalAchievements ? (a.unlockedAchievements || 0) / a.totalAchievements : 0
        const pctB = b.totalAchievements ? (b.unlockedAchievements || 0) / b.totalAchievements : 0
        return pctB - pctA
      }
      return 0
    })

    return result
  }, [games, deferredSearchQuery, sortOption])

  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(filteredGames.length / columns),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 320, // Approximate height of GameCard + gap
    overscan: 2,
  })

  return (
    <motion.div
      className="library"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.1 } } }}
    >
      <div className="library__header">
        <div className="library__tabs">
          <button 
            className={`library__tab ${activeTab === 'library' ? 'active' : ''}`}
            onClick={() => setActiveTab('library')}
          >
            <Gamepad2 size={20} />
            {t('library.libraryTab', 'My Library')} <span className="library__count">({games.length})</span>
          </button>
          <button 
            className={`library__tab ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            <Star size={20} />
            {t('library.favorites.title', 'Favorites')}
          </button>
        </div>

        {activeTab === 'library' && (
          <motion.div className="library__controls" variants={fadeUp}>
            <div className="library__sort" ref={sortRef}>
              <button 
                type="button"
                className={`library__sort-btn ${isSortOpen ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setIsSortOpen((prev) => !prev)
                }}
              >
                <span className="library__sort-label">
                  {sortOptions.find(o => o.value === sortOption)?.label}
                </span>
                <ChevronDown size={16} className={`library__sort-icon ${isSortOpen ? 'open' : ''}`} />
              </button>

                {isSortOpen && (
                  <div className="library__sort-menu">
                    {sortOptions.map(option => (
                      <button
                        key={option.value}
                        className={`library__sort-item ${sortOption === option.value ? 'selected' : ''}`}
                        onClick={() => {
                          setIsSortOpen(false)
                          startTransition(() => {
                            setSortOption(option.value as any)
                          })
                        }}
                      >
                        <span>{option.label}</span>
                        {sortOption === option.value && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                )}
            </div>
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
        )}
      </div>

      {activeTab === 'library' ? (
        <motion.div 
          className="library__scroll-container" 
          ref={parentRef}
          style={{ height: 'calc(100vh - 200px)', overflowY: 'auto', paddingRight: '12px' }}
          variants={stagger}
        >
          {isLoading ? (
            <div className="library__loading">{t('common.loading', 'Загрузка...')}</div>
          ) : filteredGames.length > 0 ? (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const startIndex = virtualRow.index * columns
                const rowGames = filteredGames.slice(startIndex, startIndex + columns)

                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    className="library__grid"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                      paddingBottom: 'var(--space-5)', // Replaces the grid vertical gap
                    }}
                  >
                    {rowGames.map(game => (
                      <GameCard key={game.appId} game={game} />
                    ))}
                  </div>
                )
              })}
            </div>
          ) : !steamId ? (
            <div className="library__empty">
              <p>{t('library.connectSteamText', 'Чтобы увидеть свои игры, подключите аккаунт Steam.')}</p>
              <button 
                className="library__connect-btn"
                onClick={() => navigate('/settings', { state: { activeTab: 'steam' } })}
              >
                <Gamepad2 size={18} />
                <span>{t('library.connectSteamBtn', 'Подключить аккаунт')}</span>
              </button>
            </div>
          ) : (
            <div className="library__empty">
              <p>{t('library.noGamesFound', 'Игры не найдены.')}</p>
            </div>
          )}
        </motion.div>
      ) : (
        <FavoritesTab />
      )}
    </motion.div>
  )
}
