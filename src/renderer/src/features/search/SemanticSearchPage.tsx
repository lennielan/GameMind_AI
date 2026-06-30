import { useState } from 'react'
import { Brain, Search, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { GameCard } from '../../components/ui/GameCard'
import './SemanticSearchPage.css'

export function SemanticSearchPage(): React.JSX.Element {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<{ localGames: any[], storeGames: any[] } | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsSearching(true)
    setHasSearched(true)
    
    try {
      const res = await window.api.semanticSearch(query)
      if (res.success) {
        setResults(res.data)
      } else {
        setResults(null)
      }
    } catch (err) {
      console.error(err)
      setResults(null)
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="semantic-search-page">
      <header className="semantic-search-page__header">
        <Brain className="semantic-search-page__icon" size={48} style={{ color: 'var(--accent-primary)' }} />
        <h1>{t('sidebar.aiSearch', 'Поиск ИИ')}</h1>
        <p className="semantic-search-page__subtitle">
          {t('search.subtitle', 'Опишите своими словами, во что вы хотите поиграть, и ИИ подберет идеальные игры из вашей библиотеки.')}
        </p>
      </header>

      <div className="semantic-search-page__search-container">
        <div className="semantic-search-page__input-wrapper">
          <input
            type="text"
            className="semantic-search-page__input"
            placeholder={t('search.placeholder', 'Например: мрачная игра про выживание в космосе')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button 
            className="semantic-search-page__button" 
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
          >
            {isSearching ? <Loader2 className="spin" size={18} /> : <Search size={18} />}
            <span>{t('search.button', 'Найти')}</span>
          </button>
        </div>
      </div>

      <div className="semantic-search-page__results-container">
        {isSearching ? (
          <div className="semantic-search-page__loading">
            <Loader2 className="spin" size={48} style={{ color: 'var(--accent-primary)', marginBottom: '16px' }} />
            <p>{t('search.analyzing', 'ИИ анализирует вашу библиотеку...')}</p>
          </div>
        ) : hasSearched && results ? (
          <div className="semantic-search-page__results-wrapper">
            {results.localGames.length > 0 ? (
              <div className="semantic-search-page__section">
                <h2>{t('search.inLibrary', 'В вашей библиотеке')}</h2>
                <div className="semantic-search-page__grid">
                  {results.localGames.map((game) => (
                    <GameCard 
                      key={game.appId} 
                      game={game} 
                      onClick={() => window.api.openExternal(`steam://rungameid/${game.appId}`)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="semantic-search-page__section">
                <h2>{t('search.inLibrary', 'В вашей библиотеке')}</h2>
                <p className="semantic-search-page__no-local">{t('search.noLocal', 'В вашей библиотеке нет подходящих игр.')}</p>
              </div>
            )}

            {results.storeGames && results.storeGames.length > 0 && (
              <div className="semantic-search-page__section semantic-search-page__section--store">
                <h2>{t('search.storeRecs', 'Рекомендации от ИИ (Магазин Steam)')}</h2>
                <div className="semantic-search-page__grid">
                  {results.storeGames.map((game) => (
                    <div key={game.appId} style={{ position: 'relative' }}>
                      <GameCard 
                        game={game} 
                        onClick={() => window.api.openExternal(`steam://store/${game.appId}`)}
                      />
                      <div className="semantic-search-page__price-badge">
                        {game.isFree ? 'Free' : game.priceFormatted || 'Steam'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {results.localGames.length === 0 && (!results.storeGames || results.storeGames.length === 0) && (
              <div className="semantic-search-page__empty">
                <Search size={64} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.5 }} />
                <h3>{t('search.noResults', 'Ничего не найдено')}</h3>
                <p>{t('search.tryDifferent', 'Попробуйте изменить или упростить запрос.')}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="semantic-search-page__empty">
            <Brain size={64} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.2 }} />
            <p style={{ color: 'var(--text-muted)' }}>{t('search.idle', 'Введите запрос выше, чтобы начать поиск.')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
