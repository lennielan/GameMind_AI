import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Brain, 
  Search, 
  Loader2, 
  X, 
  Compass, 
  Sparkles, 
  Library, 
  ShoppingBag, 
  AlertCircle,
  Rocket,
  Puzzle,
  Cpu,
  Dices,
  Users,
  RefreshCw,
  RotateCcw,
  Settings2
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { GameCard } from '../../components/ui/GameCard'
import { useSearchStore } from '../../stores/search.store'
import { AiUsageLimitModal } from '../../components/ai/AiUsageLimitModal'
import { useAiUsage } from '../../hooks/useAiUsage'
import { AiSearchRadarLoader } from './components/AiSearchRadarLoader'
import './SemanticSearchPage.css'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
}

const CHIP_KEYS = [
  { key: 'search.chips.space', text: 'Мрачный космос и выживание', Icon: Rocket },
  { key: 'search.chips.relax', text: 'Расслабляющие головоломки', Icon: Puzzle },
  { key: 'search.chips.cyberpunk', text: 'Сюжетный киберпанк', Icon: Cpu },
  { key: 'search.chips.roguelike', text: 'Хардкорный рогалик с крафтом', Icon: Dices },
  { key: 'search.chips.coop', text: 'Кооператив с друзьями', Icon: Users }
]

export function SemanticSearchPage(): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { usage, refreshUsage } = useAiUsage()
  const [limitStatus, setLimitStatus] = useState<any>(null)
  const {
    query, setQuery,
    isSearching, setIsSearching,
    results, setResults,
    error, setError,
    hasSearched, setHasSearched
  } = useSearchStore()

  const [favoriteNames, setFavoriteNames] = useState<Set<string>>(new Set())
  const [blacklistedAppIds, setBlacklistedAppIds] = useState<number[]>([])
  const [queueStatus, setQueueStatus] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  
  const searchRequestIdRef = React.useRef<number>(0)

  useEffect(() => {
    let unsub: (() => void) | null = null
    const loadUserData = async () => {
      try {
        const [favRes, blackRes, statsRes] = await Promise.all([
          window.api.favorites.getAll(),
          window.api.getBlacklist(),
          window.api.getStats().catch(() => ({ success: false, data: null }))
        ])
        if (favRes.success && favRes.data) {
          setFavoriteNames(new Set(favRes.data.map((f: any) => f.gameName)))
        }
        if (blackRes.success && blackRes.data) {
          setBlacklistedAppIds(blackRes.data.map((item: any) => item.appId))
        }
        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data)
        }
      } catch (e) {
        console.error('Failed to load user data for semantic search:', e)
      }
    }
    loadUserData()

    if (window.api.ai?.onQueueStatusUpdate) {
      unsub = window.api.ai.onQueueStatusUpdate((status) => {
        setQueueStatus(status)
      })
      window.api.ai.getQueueStatus().then(res => {
        if (res.success) setQueueStatus(res.data)
      })
    }
    return () => { if (unsub) unsub() }
  }, [])

  const toggleFavorite = async (game: any) => {
    const isFav = favoriteNames.has(game.name)
    
    setFavoriteNames(prev => {
      const next = new Set(prev)
      if (isFav) next.delete(game.name)
      else next.add(game.name)
      return next
    })

    try {
      if (isFav) {
        const res = await window.api.favorites.remove(game.name)
        if (!res.success) throw new Error(res.error)
      } else {
        const res = await window.api.favorites.add({ 
          appId: game.appId, 
          gameName: game.name,
          headerImage: game.appId ? `https://steamcdn-a.akamaihd.net/steam/apps/${game.appId}/header.jpg` : null,
          score: 100,
          reasoning: "Selected from AI Search",
          context: 'search'
        })
        if (!res.success) throw new Error(res.error)
      }
    } catch (e) {
      console.error('Failed to toggle favorite', e)
      setFavoriteNames(prev => {
        const next = new Set(prev)
        if (isFav) next.add(game.name)
        else next.delete(game.name)
        return next
      })
    }
  }

  const handleBlacklist = async (game: any) => {
    if (!game.appId) return
    
    setBlacklistedAppIds(prev => [...prev, game.appId])
    try {
      const res = await window.api.addToBlacklist(game.appId, game.name)
      if (!res.success) throw new Error(res.error)
    } catch (e) {
      console.error('Failed to blacklist', e)
      setBlacklistedAppIds(prev => prev.filter(id => id !== game.appId))
    }
  }

  const handleUndoBlacklist = async (game: any) => {
    if (!game.appId) return

    setBlacklistedAppIds(prev => prev.filter(id => id !== game.appId))
    try {
      const res = await window.api.removeFromBlacklist(game.appId)
      if (!res.success) throw new Error(res.error)
    } catch (e) {
      console.error('Failed to undo blacklist', e)
      setBlacklistedAppIds(prev => [...prev, game.appId])
    }
  }

  const executeSearchWithQuery = async (searchQuery: string) => {
    if (!searchQuery.trim()) return
    if (usage?.['semantic-search'] && !usage['semantic-search'].unlimited && usage['semantic-search'].remaining === 0) {
      setLimitStatus(usage['semantic-search'])
      return
    }

    const currentReqId = ++searchRequestIdRef.current

    setIsSearching(true)
    setHasSearched(true)
    setError(null)
    
    try {
      const res = await window.api.semanticSearch(searchQuery)
      console.log('[RENDERER IPC RECEIVED]', res)
      
      if (currentReqId !== searchRequestIdRef.current) return // Drop stale result
      
      if (res.success) {
        const payload = res.data || res;
        const local = Array.isArray(payload.localGames) ? payload.localGames : [];
        const store = Array.isArray(payload.storeGames) ? payload.storeGames : (Array.isArray(payload.storeRecommendations) ? payload.storeRecommendations : []);
        
        console.log('[DEBUG STORE GAMES ARRAY]:', store);
        setResults({ localGames: local, storeGames: store });
      } else {
        if (res.error === 'AI_USAGE_LIMIT_REACHED') setLimitStatus(usage?.['semantic-search'] || null)
        setError(res.error || t('search.errors.genericError', 'Превышен лимит запросов ИИ или ошибка сети. Попробуйте через 10 секунд'))
        setResults(null)
      }
    } catch (err: any) {
      if (currentReqId !== searchRequestIdRef.current) return // Drop stale result
      
      console.error(err)
      setError(err.message || t('search.errors.connectionError', 'Превышен лимит запросов ИИ или ошибка сети. Попробуйте через 10 секунд'))
      setResults(null)
    } finally {
      if (currentReqId === searchRequestIdRef.current) {
        setIsSearching(false)
        await refreshUsage()
      }
    }
  }

  const handleSearch = () => {
    executeSearchWithQuery(query)
  }

  const handleChipClick = (chipText: string) => {
    const cleanText = chipText.trim()
    setQuery(cleanText)
    executeSearchWithQuery(cleanText)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const getLocalizedErrorMessage = (rawError: string | null): string => {
    if (!rawError) return t('search.errors.genericError', 'Произошла ошибка при поиске.')
    const lower = rawError.toLowerCase()
    if (
      lower.includes('лимит') ||
      lower.includes('rate limit') ||
      lower.includes('10 секунд') ||
      lower.includes('10 seconds') ||
      lower.includes('429') ||
      lower.includes('503')
    ) {
      return t(
        'search.errors.rateLimit',
        'Превышен лимит запросов ИИ или ошибка сети. Попробуйте через 10 секунд.'
      )
    }
    if (lower.includes('пустой ответ') || lower.includes('empty response')) {
      return t('search.errors.emptyResponse', 'ИИ вернул пустой ответ. Попробуйте через 10 секунд.')
    }
    if (lower.includes('сервер временно перегружен') || lower.includes('overloaded')) {
      return t(
        'search.errors.serverOverloaded',
        'Бесплатный сервер временно перегружен. Пожалуйста, подождите около минуты и попробуйте снова, либо добавьте свой личный API-ключ в Настройках.'
      )
    }
    if (
      lower.includes('network') ||
      lower.includes('сеть') ||
      lower.includes('сетей') ||
      lower.includes('соединения') ||
      lower.includes('fetch') ||
      lower.includes('timed out')
    ) {
      return t('search.errors.connectionError', 'Ошибка соединения с ИИ-сервером.')
    }
    return rawError
  }

  return (
    <motion.div 
      className="semantic-search-page"
      initial="hidden"
      animate="show"
      variants={fadeUp}
    >
      <header className="semantic-search-page__header">
        <div className="semantic-search-page__icon-badge">
          <Brain size={36} />
        </div>
        <h1>{t('sidebar.aiSearch', 'Поиск ИИ')}</h1>
        <p className="semantic-search-page__subtitle">
          {t('search.subtitle', 'Опишите своими словами, во что вы хотите поиграть, и ИИ подберет идеальные игры из вашей библиотеки.')}
        </p>
      </header>

      <div className="semantic-search-page__search-container">
        <div className="semantic-search-page__input-wrapper">
          <Search className="semantic-search-page__search-icon-left" size={20} />
          <input
            type="text"
            className="semantic-search-page__input"
            placeholder={stats?.totalGames === 0 ? t('dashboard.setupPrompt', 'Подключите ваш аккаунт Steam в настройках, чтобы начать работу') : t('search.placeholder', 'Например: мрачная игра про выживание в космосе')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={stats?.totalGames === 0}
          />
          {query && (
            <button 
              className="semantic-search-page__clear-btn"
              onClick={() => setQuery('')}
              title="Clear"
            >
              <X size={16} />
            </button>
          )}
          <button 
            className="semantic-search-page__button" 
            onClick={stats?.totalGames > 0 ? handleSearch : () => navigate('/settings', { state: { activeTab: 'steam' } })}
            disabled={isSearching || (!query.trim() && stats?.totalGames !== 0)}
            title={stats?.totalGames === 0 ? t('dashboard.connectSteam', 'Подключить Steam') : ''}
          >
            {isSearching ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
            <span>{stats?.totalGames === 0 ? t('dashboard.connectSteam', 'Подключить Steam') : t('search.button', 'Найти')}</span>
          </button>
        </div>

        {/* Suggestion Prompt Chips */}
        <div className="semantic-search-page__chips">
          {CHIP_KEYS.map((chip, i) => {
            const IconComp = chip.Icon
            const localizedText = t(chip.key, chip.text)
            return (
              <button 
                key={i} 
                className="semantic-search-page__chip"
                onClick={() => handleChipClick(localizedText)}
              >
                <IconComp size={14} className="semantic-search-page__chip-icon" />
                <span>{localizedText}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="semantic-search-page__results-container">
        {isSearching ? (
          <div className="semantic-search-page__loading-overlay">
            {queueStatus?.activeCount === 0 && queueStatus?.pendingCount > 0 && !usage?.['semantic-search']?.unlimited && (
              <div className="queue-indicator" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px', background: 'var(--warning-subtle)', color: 'var(--warning)', borderRadius: '8px', marginBottom: '24px' }}>
                <Loader2 className="spinner" size={20} />
                <div>
                  <strong>{t('queue.inQueueTitle', 'Вы в очереди')}</strong>
                  <p style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>{t('queue.inQueueDesc', 'Сервер перегружен. Ожидание ответа... Ваша позиция: {{pos}}', { pos: queueStatus.pendingCount })}</p>
                </div>
              </div>
            )}
            <AiSearchRadarLoader />
          </div>
        ) : error ? (
          <div className="semantic-search-page__empty">
            <motion.div 
              className="semantic-search-page__error-card"
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <div className="semantic-search-page__error-glow" />
              
              <div className="semantic-search-page__error-icon-wrapper">
                <div className="semantic-search-page__error-icon-pulse" />
                <AlertCircle size={36} className="semantic-search-page__error-icon" />
              </div>

              <div className="semantic-search-page__error-content">
                <h3 className="semantic-search-page__error-title">
                  {t('search.errorTitle', 'Ошибка поиска')}
                </h3>
                
                <div className="semantic-search-page__error-message-box">
                  <p className="semantic-search-page__error-desc">
                    {getLocalizedErrorMessage(error)}
                  </p>
                </div>

                <p className="semantic-search-page__error-hint">
                  {t('search.errorHint', 'Попробуйте повторить попытку через несколько секунд или изменить формулировку запроса.')}
                </p>
              </div>

              <div className="semantic-search-page__error-actions">
                <button 
                  className="semantic-search-page__retry-btn" 
                  onClick={handleSearch}
                  disabled={isSearching}
                >
                  <RefreshCw size={16} className={isSearching ? 'spin' : 'semantic-search-page__retry-icon'} />
                  <span>{t('search.retry', 'Повторить')}</span>
                </button>

                <button 
                  className="semantic-search-page__secondary-btn"
                  onClick={() => {
                    setError(null)
                    setResults(null)
                    setHasSearched(false)
                    setQuery('')
                  }}
                >
                  <RotateCcw size={16} />
                  <span>{t('search.clearQuery', 'Очистить запрос')}</span>
                </button>

                <button 
                  className="semantic-search-page__secondary-btn"
                  onClick={() => navigate('/settings', { state: { activeTab: 'ai', providerSetup: true } })}
                  title={t('search.openSettings', 'Настройки ИИ')}
                >
                  <Settings2 size={16} />
                  <span>{t('search.openSettings', 'Настройки ИИ')}</span>
                </button>
              </div>
            </motion.div>
          </div>
        ) : hasSearched && results ? (
          <motion.div 
            className="semantic-search-page__results-wrapper"
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            {results.isInvalidQuery ? (
              <div className="semantic-search-page__empty">
                <div className="semantic-search-page__idle-card">
                  <Search size={48} style={{ color: 'var(--text-tertiary)', marginBottom: '16px' }} />
                  <h3>{t('search.invalidTitle', 'Некорректный запрос')}</h3>
                  <p>{t('search.invalidDesc', 'Пожалуйста, введите осмысленный запрос, связанный с видеоиграми (например: "игры про зомби с крафтом").')}</p>
                </div>
              </div>
            ) : (
              <>
                {/* Local Library Results */}
                {results.localGames.length > 0 ? (
                  <div className="semantic-search-page__section">
                    <div className="semantic-search-page__section-title">
                      <h2>
                        <Library size={22} style={{ color: 'var(--accent-primary)' }} />
                        {t('search.inLibrary', 'В вашей библиотеке')}
                      </h2>
                      <span className="semantic-search-page__section-badge">
                        {results.localGames.length}
                      </span>
                    </div>
                    <div className="semantic-search-page__grid">
                      {results.localGames.map((game) => (
                        <GameCard 
                          key={game.appId} 
                          game={game} 
                          onClick={() => window.api.openExternal(`steam://rungameid/${game.appId}`)}
                          isFavorite={favoriteNames.has(game.name)}
                          onFavoriteClick={() => toggleFavorite(game)}
                          isBlacklisted={blacklistedAppIds.includes(game.appId)}
                          onBlacklistClick={() => handleBlacklist(game)}
                          onUndoBlacklist={() => handleUndoBlacklist(game)}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="semantic-search-page__section">
                    <div className="semantic-search-page__section-title">
                      <h2>
                        <Library size={22} style={{ color: 'var(--text-secondary)' }} />
                        {t('search.inLibrary', 'В вашей библиотеке')}
                      </h2>
                    </div>
                    <p className="semantic-search-page__no-local">{t('search.noLocal', 'В вашей библиотеке нет подходящих игр.')}</p>
                  </div>
                )}

                {/* Steam Store Recommendations */}
                {results.storeGames && results.storeGames.length > 0 && (
                  <div className="semantic-search-page__section semantic-search-page__section--store">
                    <div className="semantic-search-page__section-title">
                      <h2>
                        <ShoppingBag size={22} style={{ color: 'var(--accent-primary)' }} />
                        {t('search.storeRecs', 'Рекомендации от ИИ (Магазин Steam)')}
                      </h2>
                      <span className="semantic-search-page__section-badge" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-primary)' }}>
                        {results.storeGames.length}
                      </span>
                    </div>
                    <div className="semantic-search-page__grid">
                      {results.storeGames.map((game) => (
                        <div key={game.appId}>
                          <GameCard 
                            game={game} 
                            onClick={() => window.api.openExternal(`steam://store/${game.appId}`)}
                            isFavorite={favoriteNames.has(game.name)}
                            onFavoriteClick={() => toggleFavorite(game)}
                            isBlacklisted={blacklistedAppIds.includes(game.appId)}
                            onBlacklistClick={() => handleBlacklist(game)}
                            onUndoBlacklist={() => handleUndoBlacklist(game)}
                          >
                            <div className="semantic-search-page__price-badge">
                              {game.isFree ? 'Free' : game.priceFormatted || 'Steam'}
                            </div>
                          </GameCard>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {results.localGames.length === 0 && (!results.storeGames || results.storeGames.length === 0) && (
                  <div className="semantic-search-page__empty">
                    <div className="semantic-search-page__idle-card">
                      <Search size={48} style={{ color: 'var(--text-tertiary)', marginBottom: '16px' }} />
                      <h3>{t('search.noResults', 'Ничего не найдено')}</h3>
                      <p>{t('search.tryDifferent', 'Попробуйте изменить или упростить запрос.')}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        ) : (
          <div className="semantic-search-page__empty">
            <div className="semantic-search-page__idle-card">
              <div className="semantic-search-page__idle-icon">
                <Compass size={32} />
              </div>
              <p>{t('search.idle', 'Введите запрос выше или выберите один из готовых вариантов, чтобы начать поиск.')}</p>
            </div>
          </div>
        )}
      </div>
      <AiUsageLimitModal status={limitStatus} onClose={() => setLimitStatus(null)} />
    </motion.div>
  )
}
