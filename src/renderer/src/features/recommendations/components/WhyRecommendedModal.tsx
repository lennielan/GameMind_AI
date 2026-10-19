import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Dna, Gamepad2, RefreshCw, Layers } from 'lucide-react'
import { AiCompanionIcon } from './AiCompanionIcon'
import { useTranslation } from 'react-i18next'
import styles from './WhyRecommendedModal.module.css'

interface StructuredReasoning {
  summary: string
  why: string
  dna_match: string
  features: string
}

interface WhyRecommendedModalProps {
  isOpen: boolean
  appId?: number | null
  gameName: string
  reasoning: StructuredReasoning | string | null
  onClose: () => void
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.28, ease: [0.16, 1, 0.3, 1] }
  })
}

export function WhyRecommendedModal({
  isOpen,
  appId,
  gameName,
  reasoning,
  onClose
}: WhyRecommendedModalProps): React.JSX.Element | null {
  const { t } = useTranslation()
  const [fetchedReasoning, setFetchedReasoning] = useState<StructuredReasoning | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Helper to parse initial reasoning
  let initialStructured: StructuredReasoning | null = null
  let fallbackText = ''

  if (reasoning) {
    if (typeof reasoning === 'object') {
      initialStructured = reasoning as StructuredReasoning
    } else {
      try {
        const parsed = JSON.parse(reasoning)
        if (parsed && typeof parsed === 'object' && 'why' in parsed) {
          initialStructured = parsed as StructuredReasoning
        } else {
          fallbackText = reasoning
        }
      } catch {
        fallbackText = reasoning
      }
    }
  }

  // Determine if we need to fetch (if 'why' is empty and it's not a fallback text)
  const needsFetch = isOpen && appId && (!initialStructured || !initialStructured.why) && !fetchedReasoning

  useEffect(() => {
    if (needsFetch && appId) {
      fetchReasoning()
    }
  }, [needsFetch, appId])

  const fetchReasoning = async () => {
    if (!appId) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await window.api.generateReasoning(appId, gameName)
      if (res.success && res.data && res.data.reasoning) {
        setFetchedReasoning(res.data.reasoning)
      } else {
        setError(res.error || 'Failed to generate details')
      }
    } catch (e: any) {
      setError(e.message || 'Error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Use fetched, or initial, or null
  const activeStructured = fetchedReasoning || initialStructured

  if (!isOpen) return null

  // Helper to render DNA tags if comma separated
  const renderDnaContent = (dnaString: string) => {
    if (!dnaString) return null
    if (dnaString.includes(',')) {
      const tags = dnaString.split(',').map(s => s.trim()).filter(Boolean)
      return (
        <div className={styles.tagList}>
          {tags.map((tag, idx) => (
            <span key={idx} className={styles.dnaTag}>
              {tag}
            </span>
          ))}
        </div>
      )
    }
    return <p className={styles.sectionContent}>{dnaString}</p>
  }

  return (
    <AnimatePresence>
      <div className={styles.overlay} onClick={onClose}>
        <motion.div
          className={styles.modal}
          onClick={e => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerContent}>
              <div className={styles.eyebrowBadge}>
                <AiCompanionIcon size={12} className={styles.eyebrowIcon} />
                <span>{t('recommendations.whyModal.eyebrow', 'ИИ Анализ совместимости')}</span>
              </div>
              <h2 className={styles.title}>
                {t('recommendations.whyModal.titlePrefix', 'Почему именно')}{' '}
                <span className={styles.highlightName}>{gameName}</span>?
              </h2>
            </div>
            <button 
              className={styles.closeButton} 
              onClick={onClose} 
              aria-label={t('common.close', 'Закрыть')}
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className={styles.body}>
            {isLoading ? (
              <div className={styles.loadingState}>
                <div className={styles.loaderAura}>
                  <motion.div 
                    className={styles.spinner}
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                  >
                    <RefreshCw size={26} />
                  </motion.div>
                </div>
                <p className={styles.loadingText}>
                  {t('recommendations.whyModal.loading', 'Анализируем совместимость...')}
                </p>
              </div>
            ) : error ? (
              <div className={styles.errorState}>
                <p>{error}</p>
                <button className={styles.actionButton} onClick={fetchReasoning}>
                  {t('recommendations.whyModal.retry', 'Попробовать снова')}
                </button>
              </div>
            ) : activeStructured && (activeStructured.why || activeStructured.summary) ? (
              <div className={styles.cardsContainer}>
                {/* Reason 1: Why AI chose this game */}
                <motion.div 
                  className={styles.sectionCard}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  custom={0}
                >
                  <div className={styles.sectionHeader}>
                    <div className={`${styles.sectionIconBadge} ${styles.badgeWhy}`}>
                      <AiCompanionIcon size={14} />
                    </div>
                    <h4 className={styles.sectionTitle}>
                      {t('recommendations.whyModal.why', 'Почему ИИ выбрал эту игру')}
                    </h4>
                  </div>
                  <p className={styles.sectionContent}>
                    {activeStructured.why || activeStructured.summary}
                  </p>
                </motion.div>

                {/* Reason 2: Player DNA match */}
                {activeStructured.dna_match && (
                  <motion.div 
                    className={styles.sectionCard}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    custom={1}
                  >
                    <div className={styles.sectionHeader}>
                      <div className={`${styles.sectionIconBadge} ${styles.badgeDna}`}>
                        <Dna size={14} />
                      </div>
                      <h4 className={styles.sectionTitle}>
                        {t('recommendations.whyModal.dna', 'Соответствие вашему ДНК Игрока')}
                      </h4>
                    </div>
                    {renderDnaContent(activeStructured.dna_match)}
                  </motion.div>
                )}

                {/* Reason 3: Key gameplay features */}
                {activeStructured.features && (
                  <motion.div 
                    className={styles.sectionCard}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    custom={2}
                  >
                    <div className={styles.sectionHeader}>
                      <div className={`${styles.sectionIconBadge} ${styles.badgeFeatures}`}>
                        <Gamepad2 size={14} />
                      </div>
                      <h4 className={styles.sectionTitle}>
                        {t('recommendations.whyModal.features', 'Особенности игрового процесса')}
                      </h4>
                    </div>
                    <p className={styles.sectionContent}>
                      {activeStructured.features}
                    </p>
                  </motion.div>
                )}
              </div>
            ) : (
              <div className={styles.fallbackText}>
                {fallbackText || activeStructured?.summary || t('recommendations.whyModal.noDetails', 'Подробное описание отсутствует для этой рекомендации.')}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <button className={styles.actionButton} onClick={onClose}>
              {t('recommendations.whyModal.close', 'Понятно')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
