import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Icons from 'lucide-react'
import { Award, Trophy, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { BadgesCollectionModal } from './BadgesCollectionModal'
import { BadgeTierEvolutionModal } from './BadgeTierEvolutionModal'
import { LegendIcon } from './LegendIcon'
import { useBadges } from '../hooks/useBadges'
import './BadgeTooltip.css'

interface BadgesShowcaseProps {
  userId?: string
  steamId?: string
  isOwnProfile?: boolean
  className?: string
}

export function BadgesShowcase({ userId, steamId, isOwnProfile = false, className = '' }: BadgesShowcaseProps) {
  const { t } = useTranslation()
  const queryId = userId || steamId
  const { userBadges, userScore, evolvedTier, dismissEvolutionModal, loading } = useBadges(queryId, steamId, isOwnProfile)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [hoveredBadgeCode, setHoveredBadgeCode] = useState<string | null>(null)

  if (loading) {
    return null
  }

  // Filter visible badges (max 5 visible badges) and deduplicate strictly by code and localized name
  const seenCodes = new Set<string>()
  const seenNames = new Set<string>()

  const visibleBadges = userBadges
    .filter((b) => !b.is_hidden)
    .filter((b) => {
      const isTiered = b.badge_code === 'gamemind_rank' || b.badge.is_tiered
      const activeTier = b.activeTier
      const badgeName = isTiered && activeTier
        ? t(activeTier.name_key, `Tier ${activeTier.tier}`)
        : t(b.badge.name_key, b.badge_code)

      if (seenCodes.has(b.badge_code) || seenNames.has(badgeName)) {
        return false
      }
      seenCodes.add(b.badge_code)
      seenNames.add(badgeName)
      return true
    })
    .slice(0, 5)

  return (
    <>
      <div className={`badges-showcase-inline ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {/* Render earned badge pills */}
        {visibleBadges.map((ub) => {
          const isTiered = ub.badge_code === 'gamemind_rank' || ub.badge.is_tiered
          const activeTier = ub.activeTier

          const iconName = isTiered && activeTier ? activeTier.icon : ub.badge.icon
          const color = isTiered && activeTier ? activeTier.color : ub.badge.color
          const borderColor = isTiered && activeTier?.border_color ? activeTier.border_color : `${color}40`
          const glowColor = isTiered && activeTier?.glow_color ? activeTier.glow_color : undefined

          const badgeName = isTiered && activeTier
            ? `${t('badges.gamemind_rank.name', 'Ранг GameMind')}: ${t(activeTier.name_key, `Tier ${activeTier.tier}`)}`
            : t(ub.badge.name_key, ub.badge_code)

          const badgeDesc = isTiered && activeTier
            ? t(activeTier.desc_key, '')
            : t(ub.badge.desc_key, '')

          const isLegend = ub.badge_code === 'legend' || iconName === 'LegendIcon' || iconName === 'Sparkles'
          const IconComponent = isLegend ? LegendIcon : ((Icons as any)[iconName] || Trophy)
          const isHovered = hoveredBadgeCode === ub.badge_code

          return (
            <div
              key={ub.id}
              className="badge-tooltip-wrapper"
              onMouseEnter={() => setHoveredBadgeCode(ub.badge_code)}
              onMouseLeave={() => setHoveredBadgeCode(null)}
            >
              <span
                className={`profile-page__badge ${ub.badge_code === 'boss' ? 'profile-page__badge--boss' : ''} ${isTiered && activeTier ? `profile-page__badge--tier-${activeTier.tier}` : ''}`}
                style={{
                  backgroundColor: `${color}18`,
                  color: color,
                  border: `1px solid ${borderColor}`,
                  boxShadow: glowColor ? `0 0 12px ${glowColor}` : undefined,
                  cursor: 'pointer'
                }}
                onClick={() => setIsModalOpen(true)}
              >
                <IconComponent size={12} />
                <span>
                  {isTiered && activeTier
                    ? t(activeTier.name_key, `Tier ${activeTier.tier}`)
                    : badgeName}
                </span>
              </span>

              {/* Styled GameMind Floating Tooltip */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 6, x: '-50%' }}
                    animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
                    exit={{ opacity: 0, scale: 0.92, y: 6, x: '-50%' }}
                    transition={{ duration: 0.15 }}
                    className="badge-tooltip-popover"
                    style={{
                      border: `1px solid ${borderColor}`
                    }}
                  >
                    <div className="badge-tooltip-header">
                      <div
                        className="badge-tooltip-icon"
                        style={{
                          backgroundColor: `${color}25`,
                          color: color,
                          border: `1px solid ${borderColor}`
                        }}
                      >
                        <IconComponent size={13} />
                      </div>
                      <h4 className="badge-tooltip-title" style={{ color: color }}>
                        {badgeName}
                      </h4>
                    </div>

                    <p className="badge-tooltip-desc">{badgeDesc}</p>

                    {isTiered && activeTier && (
                      <div className="badge-tooltip-extra">
                        <span>{t('badges.gamemind_rank.currentScore', 'Текущий Score:')} {userScore} pts</span>
                        <span>{t('badges.gamemind_rank.tier', 'Уровень {{tier}}', { tier: activeTier.tier })}</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}

        {/* Collection Modal Button */}
        <div
          className="badge-tooltip-wrapper"
          onMouseEnter={() => setHoveredBadgeCode('collection_btn')}
          onMouseLeave={() => setHoveredBadgeCode(null)}
        >
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="profile-page__badge"
            style={{
              backgroundColor: 'var(--surface-raised, rgba(255, 255, 255, 0.05))',
              color: 'var(--text-secondary, #aaa)',
              border: '1px dashed var(--border-default, rgba(255, 255, 255, 0.18))',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Award size={12} />
            <span>{t('badges.collectionButton', 'Значки')}</span>
          </button>

          <AnimatePresence>
            {hoveredBadgeCode === 'collection_btn' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 6, x: '-50%' }}
                animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, scale: 0.92, y: 6, x: '-50%' }}
                transition={{ duration: 0.15 }}
                className="badge-tooltip-popover"
              >
                <div className="badge-tooltip-header">
                  <div className="badge-tooltip-icon" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff' }}>
                    <Info size={13} />
                  </div>
                  <h4 className="badge-tooltip-title">{t('badges.modal.title', 'Коллекция значков')}</h4>
                </div>
                <p className="badge-tooltip-desc">
                  {t('badges.modal.subtitle', 'Все значки, их статусы и условия получения')}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {isModalOpen && queryId && (
        <BadgesCollectionModal steamId={queryId} isOwnProfile={isOwnProfile} onClose={() => setIsModalOpen(false)} />
      )}

      {evolvedTier && (
        <BadgeTierEvolutionModal
          tier={evolvedTier}
          badgeCode="gamemind_rank"
          onClose={dismissEvolutionModal}
        />
      )}
    </>
  )
}
