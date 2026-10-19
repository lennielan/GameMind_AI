import React, { useState, useEffect, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bookmark, Loader2, Target, Compass, Play, Award, HelpCircle, EyeOff, ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { AiCompanionIcon } from './components/AiCompanionIcon'
import { WhyRecommendedModal } from './components/WhyRecommendedModal'
import { MoodSelect } from './components/MoodSelect'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { AiUsageLimitModal } from '../../components/ai/AiUsageLimitModal'
import { useAiUsage } from '../../hooks/useAiUsage'
import { AiThinkingLoader } from './components/AiThinkingLoader'
import { HardwareBadge } from '../../components/ui/HardwareBadge'
import { useAppStore } from '../../stores/app.store'
import './RecommendationsPage.css'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

function CarouselSection({ 
  title, 
  badge, 
  badgeStyle, 
  icon: Icon, 
  iconStyle, 
  items, 
  renderCard 
}: { 
  title: string; 
  badge?: string; 
  badgeStyle?: any; 
  icon: any; 
  iconStyle?: any; 
  items: any[]; 
  renderCard: (item: any) => React.ReactNode 
}) {
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(0);
  
  if (!items || items.length === 0) return null;

  const itemsPerPage = 3;
  const totalPages = Math.ceil(items.length / itemsPerPage);

  const pages: any[][] = [];
  for (let i = 0; i < items.length; i += itemsPerPage) {
    pages.push(items.slice(i, i + itemsPerPage));
  }

  const handlePrev = () => {
    if (page > 0) {
      setDirection(-1);
      setPage(p => p - 1);
    }
  };

  const handleNext = () => {
    if (page < totalPages - 1) {
      setDirection(1);
      setPage(p => p + 1);
    }
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 80 : dir < 0 ? -80 : 0,
      opacity: 0,
      scale: 0.98
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring', stiffness: 280, damping: 28, mass: 0.8 },
        opacity: { duration: 0.28, ease: 'easeOut' },
        scale: { duration: 0.28, ease: 'easeOut' }
      }
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -80 : 80,
      opacity: 0,
      scale: 0.98,
      transition: {
        x: { type: 'spring', stiffness: 280, damping: 28, mass: 0.8 },
        opacity: { duration: 0.2, ease: 'easeIn' },
        scale: { duration: 0.2, ease: 'easeIn' }
      }
    })
  };

  return (
    <section className="recs-section">
      <div className="recs-section__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Icon className="recs-section__icon" size={24} style={iconStyle} />
          <h2>{title}</h2>
          {badge && <span className="recs-section__badge" style={badgeStyle}>{badge}</span>}
        </div>
        
        {totalPages > 1 && (
          <div className="recs-carousel-controls">
            <div className="recs-carousel-pagination-dots" style={{ display: 'flex', gap: '6px', alignItems: 'center', marginRight: '8px' }}>
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setDirection(idx > page ? 1 : -1);
                    setPage(idx);
                  }}
                  style={{
                    width: idx === page ? '18px' : '6px',
                    height: '6px',
                    borderRadius: '3px',
                    background: idx === page ? 'var(--accent-primary)' : 'var(--border-strong)',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  aria-label={`Page ${idx + 1}`}
                />
              ))}
            </div>
            <button className="carousel-btn" onClick={handlePrev} disabled={page === 0} aria-label="Previous">
              <ChevronLeft size={20} />
            </button>
            <button className="carousel-btn" onClick={handleNext} disabled={page === totalPages - 1} aria-label="Next">
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
      
      <div className="recs-carousel-viewport" style={{ overflow: 'hidden', width: '100%', padding: '4px 0 16px 0', position: 'relative' }}>
        <AnimatePresence custom={direction} mode="wait" initial={false}>
          <motion.div 
            key={page}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="recs-carousel-page"
            style={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '24px'
            }}
          >
            {pages[page]?.map((rec, idx) => (
              <Fragment key={rec.appId || `${page}-${idx}`}>{renderCard(rec)}</Fragment>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}

export function RecommendationsPage(): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [recs, setRecs] = useState<{
    top_matches: any[]
    backlog: any[]
    wishlist: any[]
    unexpected_discoveries: any[]
  } | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const isGenerating = useAppStore(s => s.isGeneratingRecs)
  const setIsGenerating = useAppStore(s => s.setIsGeneratingRecs)
  const [mood, setMood] = useState<string>('none')
  const [error, setError] = useState<string | null>(null)
  const { usage, refreshUsage } = useAiUsage()
  const [limitStatus, setLimitStatus] = useState<any>(null)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalGameName, setModalGameName] = useState('')
  const [modalReasoning, setModalReasoning] = useState<any>(null)
  const [modalAppId, setModalAppId] = useState<number | null>(null)

  const [blacklistConfirmApp, setBlacklistConfirmApp] = useState<{ appId: number, gameName: string } | null>(null)
  const [blacklistedAppIds, setBlacklistedAppIds] = useState<number[]>([])

  const [favoriteNames, setFavoriteNames] = useState<Set<string>>(new Set())

  const [queueStatus, setQueueStatus] = useState<any>(null)

  useEffect(() => {
    loadRecommendations()
    loadFavorites()

    let unsub: (() => void) | null = null
    if (window.api.ai?.onQueueStatusUpdate) {
      unsub = window.api.ai.onQueueStatusUpdate((status) => {
        setQueueStatus(status)
      })
      window.api.ai.getQueueStatus().then(res => {
        if (res.success) setQueueStatus(res.data)
      })
    }
    
    const unsubStarted = window.api.onRecommendationsStarted?.(() => {
      setIsGenerating(true)
      setError(null)
    })
    
    const unsubUpdated = window.api.onRecommendationsUpdated?.(() => {
      loadRecommendations()
      refreshUsage()
      setIsGenerating(false)
    })
    
    const unsubFailed = window.api.onRecommendationsFailed?.((errMsg) => {
      setError(errMsg)
      setIsGenerating(false)
    })

    return () => { 
      if (unsub) unsub() 
      if (unsubStarted) unsubStarted()
      if (unsubUpdated) unsubUpdated()
      if (unsubFailed) unsubFailed()
    }
  }, [])

  const loadFavorites = async () => {
    try {
      const res = await window.api.favorites.getAll()
      if (res.success && res.data) {
        setFavoriteNames(new Set(res.data.map((f: any) => f.gameName)))
      }
    } catch (err) {
      console.error('Failed to load favorites', err)
    }
  }

  const toggleFavorite = async (rec: any) => {
    const isFav = favoriteNames.has(rec.gameName)
    
    // Optimistic UI update
    setFavoriteNames(prev => {
      const next = new Set(prev)
      if (isFav) next.delete(rec.gameName)
      else next.add(rec.gameName)
      return next
    })

    try {
      if (isFav) {
        const result = await window.api.favorites.remove(rec.gameName)
        if (!result.success) throw new Error(result.error || 'Failed to remove favorite')
      } else {
        const result = await window.api.favorites.add({ 
          appId: rec.appId, 
          gameName: rec.gameName,
          headerImage: rec.appId ? `https://steamcdn-a.akamaihd.net/steam/apps/${rec.appId}/header.jpg` : null,
          score: rec.score || 0,
          reasoning: typeof rec.reasoning === 'string' ? rec.reasoning : JSON.stringify(rec.reasoning),
          hardwareEvaluation: rec.hardwareEvaluation || rec.hardware_evaluation || null,
          context: 'recommendation'
        })
        if (!result.success) throw new Error(result.error || 'Failed to add favorite')
      }
    } catch (err) {
      console.error('Failed to toggle favorite', err)
      // Revert optimistic update on failure
      setFavoriteNames(prev => {
        const next = new Set(prev)
        if (isFav) next.add(rec.gameName)
        else next.delete(rec.gameName)
        return next
      })
    }
  }

  const loadRecommendations = async () => {
    setIsLoading(true)
    try {
      const [res, blacklistRes, statsRes] = await Promise.all([
        window.api.getRecommendations(),
        window.api.getBlacklist(),
        window.api.getStats().catch(() => ({ success: false, data: null }))
      ])

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data)
      }

      if (blacklistRes.success && blacklistRes.data) {
        setBlacklistedAppIds(blacklistRes.data.map((item: any) => item.appId))
      }

      if (res.success && res.data && (
        (res.data.top_matches && res.data.top_matches.length > 0) ||
        (res.data.backlog && res.data.backlog.length > 0) ||
        (res.data.wishlist && res.data.wishlist.length > 0) ||
        (res.data.unexpected_discoveries && res.data.unexpected_discoveries.length > 0)
      )) {
        setRecs(res.data)
        setError(null)
      } else {
        setRecs(null)
        if (res.error) setError(res.error)
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load recommendations')
    } finally {
      setIsLoading(false)
    }
  }

  const generateRecommendations = async () => {
    if (usage?.recommendations && !usage.recommendations.unlimited && usage.recommendations.remaining === 0) {
      setLimitStatus(usage.recommendations)
      return
    }
    // State is managed by IPC events now, but we can optimistically set it here:
    setIsGenerating(true)
    setError(null)
    
    try {
      const res = await window.api.generateRecommendations(mood === 'none' ? undefined : mood)
      if (!res.success) {
        if (res.error === 'AI_USAGE_LIMIT_REACHED') {
          setLimitStatus(usage?.recommendations || null)
        } else {
          setError(res.error || 'Failed to start recommendations generation')
        }
        setIsGenerating(false)
      }
    } catch (e: any) {
      setError(e.message || 'Failed to start recommendations generation')
      setIsGenerating(false)
    }
  }

  const handleBlacklistClick = (appId: number, gameName: string) => {
    setBlacklistConfirmApp({ appId, gameName })
  }

  const confirmBlacklist = async () => {
    if (!blacklistConfirmApp) return
    const { appId, gameName } = blacklistConfirmApp
    setBlacklistConfirmApp(null)

    try {
      const res = await window.api.addToBlacklist(appId, gameName)
      if (res.success) {
        setBlacklistedAppIds(prev => [...prev, appId])
          setFavoriteNames(prev => {
            const next = new Set(prev)
            next.delete(gameName)
            return next
          })
        } else {
        alert(res.error || 'Failed to hide game')
      }
    } catch (err) {
      console.error('Failed to blacklist game:', err)
    }
  }

  const handleUndoBlacklist = async (appId: number) => {
    try {
      const res = await window.api.removeFromBlacklist(appId)
      if (res.success) {
        setBlacklistedAppIds(prev => prev.filter(id => id !== appId))
      }
    } catch (err) {
      console.error('Failed to undo blacklist:', err)
    }
  }

  const getSummaryText = (reasoning: any): string => {
    if (!reasoning) return ''
    if (typeof reasoning === 'object') return reasoning.summary || ''
    try {
      const parsed = JSON.parse(reasoning)
      if (parsed && typeof parsed === 'object') {
        return parsed.summary || parsed.why || ''
      }
    } catch {
      // Plain text
    }
    return reasoning
  }

  const openWhyModal = (gameName: string, reasoning: any, appId?: number | null) => {
    setModalGameName(gameName)
    setModalReasoning(reasoning)
    setModalAppId(appId || null)
    setIsModalOpen(true)
  }

  if (isLoading && !isGenerating) {
    return (
      <div className="recs-page recs-page--centered">
        <Loader2 className="spinner" size={40} />
        <p>{t('recommendations.loading')}</p>
      </div>
    )
  }

  if (!recs && !isGenerating) {
    return (
      <div className="recs-page recs-page--centered">
        <motion.div className="recs-empty" variants={fadeUp} initial="hidden" animate="show">
          <div className="recs-empty__icon">
            <AiCompanionIcon variant="hero" size={64} />
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

          {stats?.totalGames > 0 && (
            <MoodSelect value={mood} onChange={setMood} emptyState />
          )}

          <button 
            className="recs-empty__btn"
            onClick={stats?.totalGames > 0 ? generateRecommendations : () => navigate('/settings', { state: { activeTab: 'steam' } })}
            disabled={isGenerating}
            title={stats?.totalGames === 0 ? t('dashboard.setupPrompt', 'Подключите ваш аккаунт Steam в настройках, чтобы начать работу') : ''}
          >
            {isGenerating ? (
              <>
                <Loader2 className="spinner" size={20} />
                {t('recommendations.generating')}
              </>
            ) : stats?.totalGames === 0 ? (
              <>
                <AiCompanionIcon size={20} />
                {t('dashboard.connectSteam', 'Подключить Steam')}
              </>
            ) : (
              <>
                <AiCompanionIcon size={20} />
                {t('recommendations.generateBtn')}
              </>
            )}
          </button>
        </motion.div>
        <AiUsageLimitModal status={limitStatus} onClose={() => setLimitStatus(null)} />
      </div>
    )
  }

  const renderCard = (rec: any, borderColorClass: string, isUnexpected: boolean = false) => {
    const isBlacklisted = blacklistedAppIds.includes(rec.appId)

    return (
      <motion.div key={rec.id || rec.appId} className="rec-card" variants={fadeUp} style={{ borderColor: borderColorClass }}>
        {isBlacklisted && (
          <div className="rec-card__blacklisted-overlay">
            <EyeOff size={32} className="rec-card__blacklisted-icon" />
            <h4 className="rec-card__blacklisted-title">{t('recommendations.blacklistedTitle', 'Игра скрыта')}</h4>
            <p className="rec-card__blacklisted-desc">{t('recommendations.blacklistedDesc', 'Она больше не будет рекомендоваться')}</p>
            <button className="rec-card__blacklisted-undo" onClick={() => handleUndoBlacklist(rec.appId)}>
              {t('common.undo', 'Отменить')}
            </button>
          </div>
        )}
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

          <button 
            className="rec-card__blacklist-btn" 
            onClick={() => {
              if (rec.appId) handleBlacklistClick(rec.appId, rec.gameName);
            }}
            data-tooltip={rec.appId ? t('recommendations.blacklistTooltip', 'Добавить в черный список') : t('recommendations.noAppId', 'Не найдено в Steam')}
            style={!rec.appId ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            disabled={!rec.appId}
          >
            <EyeOff size={14} />
          </button>
          <button
            className={`rec-card__favorite-btn ${favoriteNames.has(rec.gameName) ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(rec);
            }}
            data-tooltip={t('recommendations.favoriteTooltip', 'Добавить в избранное')}
          >
            <Star size={14} fill={favoriteNames.has(rec.gameName) ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div className="rec-card__content">
          {isUnexpected && (
            <span style={{ 
              color: 'var(--info)', 
              fontSize: '11px', 
              fontWeight: 700, 
              textTransform: 'uppercase', 
              letterSpacing: '1px',
              marginBottom: '6px',
              display: 'block'
            }}>
              {t('recommendations.unexpectedLabel', 'Неожиданное открытие')}
            </span>
          )}
          <h3 className="rec-card__title">{rec.gameName}</h3>
          <p className="rec-card__reasoning">{getSummaryText(rec.reasoning)}</p>
          
          <HardwareBadge evaluation={rec.hardwareEvaluation} style={{ marginTop: '8px', marginBottom: '12px' }} />

          <div className="rec-card__footer-actions" style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
            {rec.isOwned && rec.appId ? (
              <button className="rec-card__action" style={{ flex: 1 }} onClick={() => window.api.openExternal('steam://rungameid/' + rec.appId)}>
                <Play size={16} /> {t('recommendations.playNow', 'Запустить')}
              </button>
            ) : (
              <button className="rec-card__action" style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} onClick={() => {
                const url = rec.appId ? 'https://store.steampowered.com/app/' + rec.appId : 'https://store.steampowered.com/search/?term=' + encodeURIComponent(rec.gameName);
                window.api.openExternal(url);
              }}>
                <Play size={16} /> {t('recommendations.viewStore', 'В магазин')}
              </button>
            )}
            
            <button 
              className="rec-card__why-btn"
              onClick={() => openWhyModal(rec.gameName, rec.reasoning, rec.appId)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'all 0.2s'
              }}
            >
              <HelpCircle size={15} />
              {t('recommendations.whyBtn', 'Почему?')}
            </button>
          </div>
        </div>
      </motion.div>
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
        <div className="recs-header__actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <MoodSelect value={mood} onChange={setMood} />
          <button 
            className="recs-regenerate-btn"
            onClick={generateRecommendations}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="spinner" size={16} />
            ) : (
              <div className="recs-regenerate-btn__icon-badge">
                <AiCompanionIcon size={13} />
              </div>
            )}
            <span>{t('recommendations.regenerate')}</span>
          </button>
        </div>
      </div>

      {isGenerating ? (
        <div className="recs-generating-overlay" style={{ marginTop: '32px' }}>
          {queueStatus?.activeCount === 0 && queueStatus?.pendingCount > 0 && !usage?.recommendations?.unlimited && (
            <div className="queue-indicator" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px', background: 'var(--warning-subtle)', color: 'var(--warning)', borderRadius: '8px', marginBottom: '24px' }}>
              <Loader2 className="spinner" size={20} />
              <div>
                <strong>{t('queue.inQueueTitle', 'Вы в очереди')}</strong>
                <p style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>{t('queue.inQueueDesc', 'Сервер перегружен. Ожидание ответа... Ваша позиция: {{pos}}', { pos: queueStatus.pendingCount })}</p>
              </div>
            </div>
          )}
          
          <AiThinkingLoader />
        </div>
      ) : (() => {
        const isExcludedRec = (rec: any) => {
          if (!rec) return true
          return false
        }

        const getFilteredItems = (items: any[]) => {
          if (!items) return []
          return items.filter(rec => !isExcludedRec(rec))
        }

        return (
          <div className="recs-sections">
            <CarouselSection 
              title={t('recommendations.topMatches.title', 'Лучшие совпадения')}
              badge={t('recommendations.topMatches.badge', 'Идеально')}
              badgeStyle={{ background: 'var(--warning-subtle)', color: 'var(--warning)' }}
              icon={Award}
              iconStyle={{ color: 'var(--warning)' }}
              items={getFilteredItems(recs.top_matches)}
              renderCard={(rec) => renderCard(rec, 'rgba(251, 191, 36, 0.25)')}
            />

            <CarouselSection 
              title={t('recommendations.backlog.title')}
              badge={t('recommendations.backlog.badge')}
              icon={Target}
              items={getFilteredItems(recs.backlog)}
              renderCard={(rec) => renderCard(rec, 'rgba(var(--accent-primary-rgb), 0.15)')}
            />

            <CarouselSection 
              title={t('recommendations.wishlist.title')}
              badge={t('recommendations.wishlist.badge')}
              icon={Bookmark}
              iconStyle={{ color: 'var(--accent-secondary)' }}
              items={getFilteredItems(recs.wishlist)}
              renderCard={(rec) => renderCard(rec, 'rgba(236, 72, 153, 0.15)')}
            />

            <CarouselSection 
              title={t('recommendations.discovery.title')}
              badge={t('recommendations.discovery.badge')}
              badgeStyle={{ background: 'var(--info-subtle)', color: 'var(--info)' }}
              icon={Compass}
              iconStyle={{ color: 'var(--info)' }}
              items={getFilteredItems(recs.unexpected_discoveries)}
              renderCard={(rec) => renderCard(rec, 'rgba(56, 189, 248, 0.15)', true)}
            />
          </div>
        )
      })()}

      <WhyRecommendedModal 
        isOpen={isModalOpen}
        appId={modalAppId}
        gameName={modalGameName}
        reasoning={modalReasoning}
        onClose={() => setIsModalOpen(false)}
      />

      <ConfirmModal 
        isOpen={blacklistConfirmApp !== null}
        title={t('recommendations.blacklistConfirmTitle', 'Скрыть игру')}
        description={t('recommendations.blacklistConfirm', 'Вы уверены, что хотите скрыть "{{gameName}}"? Она больше не будет рекомендоваться.', { gameName: blacklistConfirmApp?.gameName || '' })}
        onConfirm={confirmBlacklist}
        onCancel={() => setBlacklistConfirmApp(null)}
        confirmText={t('common.hide', 'Скрыть')}
        cancelText={t('common.cancel', 'Отмена')}
        isDestructive={true}
      />
      <AiUsageLimitModal status={limitStatus} onClose={() => setLimitStatus(null)} />
    </motion.div>
  )
}



