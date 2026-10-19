import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Search, Compass, Target, Sparkles } from 'lucide-react'
import './AiSearchRadarLoader.css'

const RADAR_STEPS = [
  { key: 'search.radar.step1', fallback: 'Векторизация поискового запроса...' },
  { key: 'search.radar.step2', fallback: 'Вычисление косинусного сходства векторов...' },
  { key: 'search.radar.step3', fallback: 'Сканирование бэклога и библиотеки Steam...' },
  { key: 'search.radar.step4', fallback: 'Поиск семантических соответствий в магазине...' },
  { key: 'search.radar.step5', fallback: 'Ранжирование результатов по релевантности...' }
]

export function AiSearchRadarLoader(): React.JSX.Element {
  const { t } = useTranslation()
  const [stepIdx, setStepIdx] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIdx(prev => (prev + 1) % RADAR_STEPS.length)
    }, 2600)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="ai-radar-loader-wrapper" style={{ marginTop: '24px' }}>
      <div className="ai-radar-loader">
        <div className="ai-radar-loader__glow" />

        {/* Radar Scope Visualizer */}
        <div className="ai-radar-loader__scope">
          <svg className="ai-radar-loader__svg" viewBox="0 0 150 150">
            {/* Concentric Grid Rings */}
            <circle cx="75" cy="75" r="70" fill="none" stroke="var(--border-subtle)" strokeWidth="1" />
            <circle cx="75" cy="75" r="50" fill="none" stroke="var(--border-subtle)" strokeWidth="1" strokeDasharray="4 4" />
            <circle cx="75" cy="75" r="30" fill="none" stroke="var(--border-subtle)" strokeWidth="1" />
            {/* Crosshair Axes */}
            <line x1="75" y1="5" x2="75" y2="145" stroke="var(--border-subtle)" strokeWidth="1" />
            <line x1="5" y1="75" x2="145" y2="75" stroke="var(--border-subtle)" strokeWidth="1" />
          </svg>

          {/* Sweeping Radar Beam */}
          <div className="ai-radar-loader__beam" />

          {/* Center Target Icon */}
          <motion.div 
            className="ai-radar-loader__icon-wrapper"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Compass className="ai-radar-loader__center-icon" />
          </motion.div>

          {/* Animated Target Blips */}
          <motion.div 
            className="ai-radar-loader__blip ai-radar-loader__blip--1"
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.4, 0.8] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
          <motion.div 
            className="ai-radar-loader__blip ai-radar-loader__blip--2"
            animate={{ opacity: [0.8, 0.2, 0.8], scale: [1.2, 0.8, 1.2] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
          <motion.div 
            className="ai-radar-loader__blip ai-radar-loader__blip--3"
            animate={{ opacity: [0.3, 0.9, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>

        {/* Content Typography */}
        <div className="ai-radar-loader__content">
          <h2 className="ai-radar-loader__title">
            {t('search.radar.title', 'ИИ выполняет семантический поиск...')}
          </h2>

          <div className="ai-radar-loader__subtitle-container">
            <AnimatePresence mode="wait">
              <motion.div
                key={stepIdx}
                className="ai-radar-loader__subtitle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <span>{t(RADAR_STEPS[stepIdx].key, RADAR_STEPS[stepIdx].fallback)}</span>
                <span className="ai-radar-loader__spinner-dots">
                  <span className="ai-radar-loader__dot" />
                  <span className="ai-radar-loader__dot" />
                  <span className="ai-radar-loader__dot" />
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="ai-radar-loader__bar-track">
            <div className="ai-radar-loader__bar-fill" />
          </div>
        </div>
      </div>

      {/* Skeleton Grid */}
      <div className="recs-section" style={{ marginTop: '32px' }}>
        <div className="recs-skeleton-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="recs-skeleton-card">
              <div className="recs-skeleton-shimmer" style={{ height: '140px', width: '100%' }} />
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="recs-skeleton-shimmer" style={{ height: '18px', width: '75%', borderRadius: '4px' }} />
                <div className="recs-skeleton-shimmer" style={{ height: '12px', width: '100%', borderRadius: '4px' }} />
                <div className="recs-skeleton-shimmer" style={{ height: '12px', width: '60%', borderRadius: '4px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
