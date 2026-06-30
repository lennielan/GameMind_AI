import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Sparkles, Loader2, Target, Compass, Play } from 'lucide-react'
import './RecommendationsPage.css'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

export function RecommendationsPage(): React.JSX.Element {
  const { t } = useTranslation()
  const [recs, setRecs] = useState<{ backlog: any[], discovery: any[], wishlist?: any[] } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRecommendations()
  }, [])

  const loadRecommendations = async () => {
    setIsLoading(true)
    try {
      const res = await window.api.getRecommendations()
      if (res.success && res.data && (res.data.backlog.length > 0 || res.data.discovery.length > 0)) {
        setRecs(res.data)
      } else {
        setRecs(null)
      }
    } catch (e) {
      console.error('Failed to load recommendations', e)
    } finally {
      setIsLoading(false)
    }
  }

  const generateRecommendations = async () => {
    setIsGenerating(true)
    setError(null)
    try {
      const res = await window.api.generateRecommendations()
      if (res.success) {
        await loadRecommendations()
      } else {
        setError(res.error || 'Failed to generate recommendations')
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred')
    } finally {
      setIsGenerating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="recs-page recs-page--centered">
        <Loader2 className="spinner" size={40} />
        <p>{t('recommendations.loading')}</p>
      </div>
    )
  }

  if (!recs) {
    return (
      <div className="recs-page recs-page--centered">
        <motion.div className="recs-empty" variants={fadeUp} initial="hidden" animate="show">
          <div className="recs-empty__icon">
            <Sparkles size={64} />
          </div>
          <h1 className="recs-empty__title">{t('recommendations.emptyTitle')}</h1>
          <p className="recs-empty__description">
            {t('recommendations.emptyDescription')}
          </p>
          
          {error && (
            <div className="recs-error">
              {error}
            </div>
          )}

          <button 
            className="recs-empty__btn"
            onClick={generateRecommendations}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="spinner" size={20} />
                {t('recommendations.generating')}
              </>
            ) : (
              <>
                <Sparkles size={20} />
                {t('recommendations.generateBtn')}
              </>
            )}
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <motion.div 
      className="recs-page"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      <div className="recs-header">
        <div>
          <h1 className="recs-title">{t('recommendations.title')}</h1>
          {error && <p className="recs-error">{error}</p>}
        </div>
        <button 
          className="recs-regenerate-btn"
          onClick={generateRecommendations}
          disabled={isGenerating}
        >
          {isGenerating ? <Loader2 className="spinner" size={16} /> : <Sparkles size={16} />}
          {t('recommendations.regenerate')}
        </button>
      </div>

      <div className="recs-sections">
        {/* Backlog Section */}
        <section className="recs-section">
          <div className="recs-section__header">
            <Target className="recs-section__icon" size={24} />
            <h2>{t('recommendations.backlog.title')}</h2>
            <span className="recs-section__badge">{t('recommendations.backlog.badge')}</span>
          </div>
          <div className="recs-grid">
            {recs.backlog.map((rec: any, i: number) => (
              <motion.div key={i} className="rec-card" variants={fadeUp}>
                <div className="rec-card__image-container">
                  <img 
                    src={rec.appId ? `https://steamcdn-a.akamaihd.net/steam/apps/${rec.appId}/header.jpg` : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%231e1e2d"/><text x="50%" y="50%" font-family="sans-serif" font-size="12" fill="%23a0a0b0" text-anchor="middle" dy=".3em">No Image</text></svg>'}
                    alt={rec.gameName}
                    className="rec-card__image"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.src.includes('capsule') && rec.appId) {
                        target.src = `https://steamcdn-a.akamaihd.net/steam/apps/${rec.appId}/capsule_231x87.jpg`;
                      } else if (!target.src.includes('placeholder')) {
                        target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%231e1e2d"/><text x="50%" y="50%" font-family="sans-serif" font-size="12" fill="%23a0a0b0" text-anchor="middle" dy=".3em">No Image</text></svg>';
                      }
                    }}
                  />
                  <div className="rec-card__score">
                    <span className="score-value">{rec.score}%</span>
                    <span className="score-label">{t('recommendations.match')}</span>
                  </div>
                </div>
                <div className="rec-card__content">
                  <h3 className="rec-card__title">{rec.gameName}</h3>
                  <p className="rec-card__reasoning">{rec.reasoning}</p>
                  {rec.hardwareEvaluation && (
                    <div className="rec-card__hardware-badge" style={{ 
                      marginTop: '12px', 
                      marginBottom: '12px',
                      padding: '6px 12px', 
                      background: 'rgba(255,255,255,0.05)', 
                      borderRadius: '6px', 
                      fontSize: '12px', 
                      display: 'inline-block',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      {rec.hardwareEvaluation}
                    </div>
                  )}
                  <button className="rec-card__action" onClick={() => window.api.openExternal('steam://rungameid/' + rec.appId)}>
                    <Play size={16} /> {t('recommendations.playNow')}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Wishlist Section */}
        {recs.wishlist && recs.wishlist.length > 0 && (
          <section className="recs-section">
            <div className="recs-section__header">
              <Sparkles className="recs-section__icon" size={24} style={{ color: 'var(--accent-secondary)' }} />
              <h2>{t('recommendations.wishlist.title')}</h2>
              <span className="recs-section__badge">{t('recommendations.wishlist.badge')}</span>
            </div>
            <div className="recs-grid">
              {recs.wishlist.map((rec: any, i: number) => (
                <motion.div key={i} className="rec-card" variants={fadeUp} style={{ borderColor: 'rgba(236, 72, 153, 0.2)' }}>
                  <div className="rec-card__image-container">
                    <img 
                      src={rec.appId ? `https://steamcdn-a.akamaihd.net/steam/apps/${rec.appId}/header.jpg` : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%231e1e2d"/><text x="50%" y="50%" font-family="sans-serif" font-size="12" fill="%23a0a0b0" text-anchor="middle" dy=".3em">No Image</text></svg>'}
                      alt={rec.gameName}
                      className="rec-card__image"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (!target.src.includes('capsule') && rec.appId) {
                          target.src = `https://steamcdn-a.akamaihd.net/steam/apps/${rec.appId}/capsule_231x87.jpg`;
                        } else if (!target.src.includes('placeholder')) {
                          target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%231e1e2d"/><text x="50%" y="50%" font-family="sans-serif" font-size="12" fill="%23a0a0b0" text-anchor="middle" dy=".3em">No Image</text></svg>';
                        }
                      }}
                    />
                    <div className="rec-card__score">
                      <span className="score-value" style={{ color: 'var(--accent-secondary)' }}>{rec.score}%</span>
                      <span className="score-label">{t('recommendations.match')}</span>
                    </div>
                  </div>
                  <div className="rec-card__content">
                    <h3 className="rec-card__title">{rec.gameName}</h3>
                    <p className="rec-card__reasoning">{rec.reasoning}</p>
                    {rec.hardwareEvaluation && (
                      <div className="rec-card__hardware-badge" style={{ 
                        marginTop: '12px', 
                        marginBottom: '12px',
                        padding: '6px 12px', 
                        background: 'rgba(255,255,255,0.05)', 
                        borderRadius: '6px', 
                        fontSize: '12px', 
                        display: 'inline-block',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        {rec.hardwareEvaluation}
                      </div>
                    )}
                    <button className="rec-card__action" style={{ background: 'rgba(236, 72, 153, 0.1)', color: 'var(--accent-secondary)' }} onClick={() => window.api.openExternal('https://store.steampowered.com/app/' + rec.appId)}>
                      <Play size={16} /> {t('recommendations.viewStore')}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Discovery Section */}
        {recs.discovery && recs.discovery.length > 0 && (
          <section className="recs-section">
            <div className="recs-section__header">
              <Compass className="recs-section__icon" size={24} style={{ color: 'var(--info)' }} />
              <h2>{t('recommendations.discovery.title')}</h2>
              <span className="recs-section__badge">{t('recommendations.discovery.badge')}</span>
            </div>
            <div className="recs-grid">
              {recs.discovery.map((rec: any, i: number) => (
                <motion.div key={i} className="rec-card" variants={fadeUp} style={{ borderColor: 'rgba(56, 189, 248, 0.2)' }}>
                  <div className="rec-card__image-container">
                    <img 
                      src={rec.appId ? `https://steamcdn-a.akamaihd.net/steam/apps/${rec.appId}/header.jpg` : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%231e1e2d"/><text x="50%" y="50%" font-family="sans-serif" font-size="12" fill="%23a0a0b0" text-anchor="middle" dy=".3em">No Image</text></svg>'}
                      alt={rec.gameName}
                      className="rec-card__image"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (!target.src.includes('capsule') && rec.appId) {
                          target.src = `https://steamcdn-a.akamaihd.net/steam/apps/${rec.appId}/capsule_231x87.jpg`;
                        } else if (!target.src.includes('placeholder')) {
                          target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%231e1e2d"/><text x="50%" y="50%" font-family="sans-serif" font-size="12" fill="%23a0a0b0" text-anchor="middle" dy=".3em">No Image</text></svg>';
                        }
                      }}
                    />
                    <div className="rec-card__score">
                      <span className="score-value" style={{ color: 'var(--info)' }}>{rec.score}%</span>
                      <span className="score-label">{t('recommendations.match')}</span>
                    </div>
                  </div>
                  <div className="rec-card__content">
                    <h3 className="rec-card__title">{rec.gameName}</h3>
                    <p className="rec-card__reasoning">{rec.reasoning}</p>
                    {rec.hardwareEvaluation && (
                      <div className="rec-card__hardware-badge" style={{ 
                        marginTop: '12px', 
                        marginBottom: '12px',
                        padding: '6px 12px', 
                        background: 'rgba(255,255,255,0.05)', 
                        borderRadius: '6px', 
                        fontSize: '12px', 
                        display: 'inline-block',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        {rec.hardwareEvaluation}
                      </div>
                    )}
                    <button className="rec-card__action" style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--info)' }} onClick={() => window.api.openExternal('https://store.steampowered.com/app/' + rec.appId)}>
                      <Play size={16} /> {t('recommendations.viewStore')}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>
    </motion.div>
  )
}
