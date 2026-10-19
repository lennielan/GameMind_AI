import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Trophy } from 'lucide-react'
import * as Icons from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { BadgeTier } from '@shared/types/badge.types'
import './BadgeTierEvolutionModal.css'

interface BadgeTierEvolutionModalProps {
  tier: BadgeTier
  badgeCode: string
  onClose: () => void
}

export function BadgeTierEvolutionModal({ tier, badgeCode: _badgeCode, onClose }: BadgeTierEvolutionModalProps) {
  const { t } = useTranslation()
  const IconComponent = (Icons as any)[tier.icon] || Trophy
  const tierName = t(tier.name_key, `Tier ${tier.tier}`)
  const tierDesc = t(tier.desc_key, '')

  return (
    <AnimatePresence>
      <div className="tier-evolution-overlay" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 30 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="tier-evolution-container"
          style={{
            border: `1px solid ${tier.border_color || tier.color}`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Background Glow */}
          <div
            className="tier-evolution-bg-glow"
            style={{ backgroundColor: tier.color }}
          />

          <div className="tier-evolution-header-badge">
            <Zap size={14} />
            <span>GameMind Rank Evolved</span>
          </div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="tier-evolution-icon-wrapper"
            style={{
              backgroundColor: `${tier.color}25`,
              color: tier.color,
              border: `2px solid ${tier.border_color || tier.color}`,
              '--glow-color': tier.glow_color || `${tier.color}40`
            } as React.CSSProperties}
          >
            <IconComponent size={54} />
          </motion.div>

          <h2 className="tier-evolution-title">{t('badges.gamemind_rank.evolution.title', 'Поздравляем!')}</h2>
          <p className="tier-evolution-subtitle">
            {t('badges.gamemind_rank.evolution.subtitle', 'Ваш ранг GameMind повысился!')}
          </p>

          <div className="tier-evolution-rank-card">
            <h3 className="tier-evolution-rank-name" style={{ color: tier.color }}>
              {tierName} (Tier {tier.tier})
            </h3>
            <p className="tier-evolution-rank-desc">{tierDesc}</p>
          </div>

          <button className="tier-evolution-btn" onClick={onClose}>
            {t('badges.gamemind_rank.evolution.continueBtn', 'Продолжить')}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
