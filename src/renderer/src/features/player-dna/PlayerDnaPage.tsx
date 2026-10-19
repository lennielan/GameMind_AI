import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Dna, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AiUsageLimitModal } from '../../components/ai/AiUsageLimitModal'
import { useAiUsage } from '../../hooks/useAiUsage'
import { useAppStore } from '../../stores/app.store'
import { Badge, Button, SegmentedMeter } from '../../components/ui'
import './PlayerDnaPage.css'

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } }
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
}

// Map trait names to their left/right labels for bilingual telemetry
const AXIS_LABELS: Record<string, { left: string; right: string }> = {
  'Story vs Gameplay': { left: 'Story', right: 'Gameplay' },
  'Relax vs Hardcore': { left: 'Relax', right: 'Hardcore' },
  'Solo vs Social': { left: 'Solo', right: 'Social' },
  'Reflex vs Tactics': { left: 'Reflex', right: 'Tactics' },
  // Russian equivalents
  'Сюжет vs Геймплей': { left: 'Сюжет', right: 'Геймплей' },
  'Релакс vs Хардкор': { left: 'Релакс', right: 'Хардкор' },
  'Соло vs Социум': { left: 'Соло', right: 'Социум' },
  'Рефлексы vs Тактика': { left: 'Рефлексы', right: 'Тактика' }
}

function getArchetypeId(persona: string): string {
  if (!persona) return '884-CS'
  let hash = 0
  for (let i = 0; i < persona.length; i++) {
    hash = (hash << 5) - hash + persona.charCodeAt(i)
    hash |= 0
  }
  const code = Math.abs(hash % 900) + 100
  return `${code}-CS`
}

export function PlayerDnaPage(): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const isGeneratingDna = useAppStore((s) => s.isGeneratingDna)

  const [dnaData, setDnaData] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { usage, refreshUsage } = useAiUsage()
  const [limitStatus, setLimitStatus] = useState<any>(null)

  useEffect(() => {
    loadDna()

    // Listen for background DNA generation completion
    const cleanupUpdated = window.api.onDnaUpdated?.(() => {
      loadDna()
      void refreshUsage()
    })

    // Listen for background DNA generation failure
    const cleanupFailed = window.api.onDnaFailed?.((errMsg: string) => {
      setError(errMsg)
      setIsLoading(false)
    })

    return () => {
      cleanupUpdated?.()
      cleanupFailed?.()
    }
  }, [])

  const loadDna = async () => {
    setIsLoading(true)
    try {
      const [res, statsRes] = await Promise.all([
        window.api.getDna(),
        window.api.getStats().catch(() => ({ success: false, data: null }))
      ])

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data)
      }

      if (res.success && res.data) {
        setDnaData(res.data)
      }
    } catch (e) {
      console.error('Failed to load DNA', e)
    } finally {
      setIsLoading(false)
    }
  }

  const generateDna = async () => {
    if (usage?.['player-dna'] && !usage['player-dna'].unlimited && usage['player-dna'].remaining === 0) {
      setLimitStatus(usage['player-dna'])
      return
    }
    setError(null)
    try {
      const res = await window.api.generateDna()
      if (!res.success) {
        if (res.error === 'AI_USAGE_LIMIT_REACHED') setLimitStatus(usage?.['player-dna'] || null)
        setError(res.error || 'Failed to generate DNA')
        if (res.error?.includes('API key')) {
          setTimeout(() => navigate('/settings'), 3000)
        }
      }
    } catch (e: any) {
      setError(e.message || t('auth.errors.genericError', 'An unexpected error occurred'))
    }
  }

  if (isLoading) {
    return (
      <div className="dna-page dna-page--centered">
        <div className="dna-loader-box">
          <RefreshCw className="dna-loader-spin" size={28} />
          <Badge variant="muted" size="sm" bracketed>
            TELEMETRY // LOADING_DNA
          </Badge>
          <span className="dna-loader-text">{t('dna.loading', 'Загрузка профиля ДНК...')}</span>
        </div>
      </div>
    )
  }

  if (!dnaData) {
    return (
      <div className="dna-page dna-page--centered">
        <motion.div className="dna-empty" variants={fadeUp} initial="hidden" animate="show">
          <div className="dna-empty__icon-wrap">
            <Dna size={36} className="dna-empty__icon" />
          </div>

          <Badge variant="muted" size="xs" bracketed>
            STATUS // NO_DNA_RECORD
          </Badge>

          <h1 className="dna-empty__title">{t('dna.emptyTitle', 'Профиль ДНК еще не сформирован')}</h1>
          <p className="dna-empty__description">
            {t('dna.emptyDescription', 'ИИ GameMind проанализирует вашу игровую статистику, паттерны игровых сессий и историю достижений для создания уникального игрового профиля.')}
          </p>

          {error && (
            <div className="dna-error-banner">
              <Badge variant="danger" size="xs" bracketed dot>
                ERROR
              </Badge>
              <span>{error}</span>
            </div>
          )}

          <div className="dna-empty__action">
            <Button
              variant="primary"
              size="md"
              iconLeft={isGeneratingDna ? undefined : <RefreshCw size={15} />}
              isLoading={isGeneratingDna}
              onClick={stats && stats.totalGames > 0 ? generateDna : () => navigate('/settings', { state: { activeTab: 'steam' } })}
              disabled={isGeneratingDna}
            >
              {isGeneratingDna
                ? t('dna.generating', 'Анализ игровой библиотеки...')
                : stats && stats.totalGames === 0
                ? t('dashboard.connectSteam', 'Подключить Steam')
                : t('dna.generateBtn', 'Сформировать ДНК')}
            </Button>
          </div>
        </motion.div>
        <AiUsageLimitModal status={limitStatus} onClose={() => setLimitStatus(null)} />
      </div>
    )
  }

  const { summary, traits } = dnaData
  const archetypeId = getArchetypeId(summary.persona || '')

  return (
    <motion.div className="dna-page" variants={stagger} initial="hidden" animate="show">
      {/* 1. Hero Profile Card */}
      <motion.div className="dna-hero" variants={fadeUp}>
        <div className="dna-hero__content">
          <div className="dna-hero__badge-row">
            <Badge variant="accent" size="xs" bracketed prefix="DNA_PROFILE //">
              {`ARCHETYPE_ID: ${archetypeId}`}
            </Badge>
            <Badge variant="muted" size="xs" bracketed>
              ANALYTICS // V2.4
            </Badge>
          </div>
          <h1 className="dna-hero__persona">
            {summary.persona ? summary.persona.toUpperCase() : 'ИГРОВОЙ АРХЕТИП'}
          </h1>
          <p className="dna-hero__description">{summary.description}</p>
        </div>
        <div className="dna-hero__dna-icon-wrap" aria-hidden="true">
          <Dna size={36} className="dna-hero__dna-icon" />
        </div>
      </motion.div>

      {/* 2. Main Analytics Grid */}
      <div className="dna-grid">
        {/* Core Traits with SegmentedMeter Hardware VU Scales */}
        <motion.div className="dna-card dna-card--traits" variants={fadeUp}>
          <div className="dna-card__header">
            <div className="dna-card__title-row">
              <h2 className="dna-card__title">{t('dna.coreTraits', 'Основные черты')}</h2>
              <Badge variant="muted" size="xs" bracketed>
                TELEMETRY // SCALES
              </Badge>
            </div>
          </div>

          <div className="dna-traits-list">
            {traits.map((trait: any) => {
              const isDualAxis = trait.traitName.includes(' vs ')
              const labels = AXIS_LABELS[trait.traitName] || { left: trait.traitName, right: '' }

              const labelMap: Record<string, string> = {
                'Story': 'story', 'Gameplay': 'gameplay', 'Сюжет': 'story', 'Геймплей': 'gameplay',
                'Relax': 'relax', 'Hardcore': 'hardcore', 'Релакс': 'relax', 'Хардкор': 'hardcore',
                'Solo': 'solo', 'Social': 'social', 'Соло': 'solo', 'Социум': 'social',
                'Reflex': 'reflexes', 'Tactics': 'tactics', 'Рефлексы': 'reflexes', 'Тактика': 'tactics'
              }

              const leftText = isDualAxis
                ? t(`dna.axes.${labelMap[labels.left] || labels.left}`, labels.left).toUpperCase()
                : trait.traitName.toUpperCase()

              const rightText = isDualAxis && labels.right
                ? t(`dna.axes.${labelMap[labels.right] || labels.right}`, labels.right).toUpperCase()
                : undefined

              return (
                <div key={trait.id || trait.traitName} className="dna-trait-item">
                  <SegmentedMeter
                    value={trait.traitValue}
                    max={100}
                    segments={24}
                    size="md"
                    leftLabel={leftText}
                    rightLabel={rightText}
                    accentColor="current"
                  />
                  {trait.reasoning && (
                    <p className="dna-trait-reasoning">{trait.reasoning}</p>
                  )}
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Top Genres and Playstyle Details */}
        <motion.div className="dna-card dna-card--details" variants={fadeUp}>
          {/* Top Genres Section */}
          <div className="dna-section">
            <div className="dna-card__title-row">
              <h2 className="dna-card__title">{t('dna.topGenres', 'Топ жанры')}</h2>
              <Badge variant="muted" size="xs" bracketed>
                TOP_GENRES
              </Badge>
            </div>
            <div className="dna-genres">
              {summary.topGenres && summary.topGenres.length > 0 ? (
                summary.topGenres.map((genre: string, idx: number) => (
                  <Badge key={idx} variant="outline" size="sm" bracketed>
                    {genre.toUpperCase()}
                  </Badge>
                ))
              ) : (
                <span className="dna-no-data-text">[ NO_GENRE_DATA ]</span>
              )}
            </div>
          </div>

          {/* Playstyle Section */}
          <div className="dna-section" style={{ marginTop: '20px' }}>
            <div className="dna-card__title-row">
              <h2 className="dna-card__title">{t('dna.playstyle', 'Стиль игры')}</h2>
              <Badge variant="muted" size="xs" bracketed>
                PLAYSTYLE_LOG
              </Badge>
            </div>
            <div className="dna-playstyle-box">
              <p className="dna-playstyle-text">{summary.playstyle}</p>
            </div>
          </div>

          {/* Regenerate Action */}
          <div className="dna-card__actions">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              iconLeft={isGeneratingDna ? undefined : <RefreshCw size={14} />}
              isLoading={isGeneratingDna}
              onClick={generateDna}
              disabled={isGeneratingDna}
            >
              {isGeneratingDna
                ? t('dna.generating', 'Анализ игровой библиотеки...')
                : t('dna.regenerate', 'Обновить ДНК')}
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Error Modal */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="dna-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setError(null)}
          >
            <motion.div
              className="dna-modal-content"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="dna-modal-header">
                <Badge variant="danger" size="xs" bracketed dot>
                  SYS_ALERT // GENERATION_FAILED
                </Badge>
              </div>
              <h2 className="dna-modal-title">{t('dna.errorTitle', 'Сбой формирования ДНК')}</h2>
              <p className="dna-modal-desc">{error}</p>
              <div className="dna-modal-actions">
                <Button variant="secondary" size="md" onClick={() => setError(null)}>
                  {t('common.close', 'Закрыть')}
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    setError(null)
                    generateDna()
                  }}
                >
                  {t('common.retry', 'Повторить')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AiUsageLimitModal status={limitStatus} onClose={() => setLimitStatus(null)} />
    </motion.div>
  )
}
