import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Brain, Bot, Cpu, Zap } from 'lucide-react'
import './AiThinkingLoader.css'

const STEPS = [
  'recommendations.thinking.step1',
  'recommendations.thinking.step2',
  'recommendations.thinking.step3',
  'recommendations.thinking.step4',
  'recommendations.thinking.step5',
  'recommendations.thinking.step6'
]

export function AiThinkingLoader(): React.JSX.Element {
  const { t } = useTranslation()
  const [stepIdx, setStepIdx] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIdx(prev => (prev + 1) % STEPS.length)
    }, 2800)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="ai-loader-wrapper" style={{ marginTop: '24px' }}>
      {/* Hero AI Thinking Card */}
      <div className="ai-loader">
        <div className="ai-loader__glow" />

        {/* Futuristic Orbital AI Brain Core */}
        <div className="ai-loader__core">
          {/* Animated SVG Orbital Rings */}
          <svg className="ai-loader__svg-rings" viewBox="0 0 140 140">
            {/* Outer Counter-Rotating Ring */}
            <motion.circle
              cx="70"
              cy="70"
              r="64"
              fill="none"
              stroke="var(--accent-primary)"
              strokeWidth="1.5"
              strokeDasharray="12 8 4 8"
              opacity="0.5"
              animate={{ rotate: -360 }}
              transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
              style={{ transformOrigin: '70px 70px' }}
            />
            {/* Inner Clockwise Ring */}
            <motion.circle
              cx="70"
              cy="70"
              r="48"
              fill="none"
              stroke="var(--accent-primary)"
              strokeWidth="2"
              strokeDasharray="24 16"
              opacity="0.8"
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
              style={{ transformOrigin: '70px 70px' }}
            />
            {/* Pulsing Concentric Aura Ring */}
            <motion.circle
              cx="70"
              cy="70"
              r="38"
              fill="none"
              stroke="var(--accent-glow)"
              strokeWidth="3"
              animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformOrigin: '70px 70px' }}
            />
          </svg>

          {/* Central Pulsing Brain Icon Wrapper */}
          <motion.div 
            className="ai-loader__icon-wrapper"
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Brain className="ai-loader__brain-icon" />
          </motion.div>

          {/* Cyber-Orbital AI Particles */}
          <motion.div 
            className="ai-loader__particle ai-loader__particle--1"
            animate={{ y: [-4, 4, -4], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Bot size={13} />
          </motion.div>

          <motion.div 
            className="ai-loader__particle ai-loader__particle--2"
            animate={{ y: [4, -4, 4], opacity: [0.3, 0.9, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            <Zap size={12} />
          </motion.div>

          <motion.div 
            className="ai-loader__particle ai-loader__particle--3"
            animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          >
            <Cpu size={13} />
          </motion.div>
        </div>

        {/* Typography & Animated Status Messages */}
        <div className="ai-loader__content">
          <h2 className="ai-loader__title">
            {t('recommendations.thinking.title', 'ИИ подбирает идеальные игры...')}
          </h2>

          <div className="ai-loader__subtitle-container">
            <AnimatePresence mode="wait">
              <motion.div
                key={stepIdx}
                className="ai-loader__subtitle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <span>{t(STEPS[stepIdx])}</span>
                <span className="ai-loader__dot-spinner">
                  <span className="ai-loader__dot" />
                  <span className="ai-loader__dot" />
                  <span className="ai-loader__dot" />
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dynamic Scanning Progress Bar */}
          <div className="ai-loader__bar-track">
            <div className="ai-loader__bar-fill" />
          </div>
        </div>
      </div>

      {/* Skeleton Cards Preview Section */}
      <div className="recs-section" style={{ marginTop: '32px' }}>
        <div className="recs-section__header" style={{ marginBottom: '16px' }}>
          <div className="recs-skeleton-shimmer" style={{ width: '180px', height: '22px', borderRadius: '6px' }} />
        </div>

        <div className="recs-skeleton-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="recs-skeleton-card">
              <div className="recs-skeleton-shimmer" style={{ height: '140px', width: '100%' }} />
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="recs-skeleton-shimmer" style={{ height: '18px', width: '75%', borderRadius: '4px' }} />
                <div className="recs-skeleton-shimmer" style={{ height: '12px', width: '100%', borderRadius: '4px' }} />
                <div className="recs-skeleton-shimmer" style={{ height: '12px', width: '60%', borderRadius: '4px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                  <div className="recs-skeleton-shimmer" style={{ height: '24px', width: '64px', borderRadius: '12px' }} />
                  <div className="recs-skeleton-shimmer" style={{ height: '28px', width: '80px', borderRadius: '6px' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
