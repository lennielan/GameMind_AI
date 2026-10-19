import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Icons from 'lucide-react'
import { X, Target, CheckCircle2, Lock, Trophy, Cpu } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useBadges } from '../hooks/useBadges'
import { LegendIcon } from './LegendIcon'
import { GAMEMIND_RANK_TIERS, getTierForScore } from '@shared/config/badge.config'
import './BadgesCollectionModal.css'

interface BadgesCollectionModalProps {
  steamId: string
  isOwnProfile?: boolean
  onClose: () => void
}

export function BadgesCollectionModal({ steamId, isOwnProfile = false, onClose }: BadgesCollectionModalProps) {
  const { t } = useTranslation()
  const { allBadges, userBadges, userScore, loading } = useBadges(steamId, undefined, isOwnProfile)

  const earnedBadgeCodes = new Set(userBadges.map((ub) => ub.badge_code))

  // Exclude special role/admin badges (boss, developer, cbt) from general collection unless already earned
  const displayableBadges = allBadges.filter((badge) => {
    const isEarned = earnedBadgeCodes.has(badge.code_name)
    if (['boss', 'developer', 'cbt'].includes(badge.code_name)) {
      return isEarned
    }
    return true
  })

  return (
    <AnimatePresence>
      <div className="badges-modal-overlay" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2 }}
          className="badges-modal-container"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="badges-modal-header">
            <div>
              <h2 className="badges-modal-title">{t('badges.modal.title', 'Коллекция значков')}</h2>
              <p className="badges-modal-subtitle">
                {t('badges.modal.unlocked', 'Открыто')}: {earnedBadgeCodes.size} / {displayableBadges.length}
              </p>
            </div>
            <button className="badges-modal-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {/* Body / Grid */}
          <div className="badges-modal-body">
            {loading ? (
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <div className="badges-modal-loading-spinner" />
              </div>
            ) : (
              displayableBadges.map((badge) => {
                const isEarned = earnedBadgeCodes.has(badge.code_name)
                const userBadge = userBadges.find((ub) => ub.badge_code === badge.code_name)
                const isTiered = badge.code_name === 'gamemind_rank' || badge.is_tiered

                if (isTiered) {
                  const tiers = badge.tiers || GAMEMIND_RANK_TIERS
                  const activeTier = getTierForScore(userScore, tiers)
                  const TierIconComponent = (Icons as any)[activeTier.icon] || Trophy
                  const tierName = t(activeTier.name_key, `Tier ${activeTier.tier}`)
                  const nextTier = tiers.find((t) => t.tier === activeTier.tier + 1)

                  const minScore = activeTier.min_score
                  const maxScore = activeTier.max_score
                  const currentInRange = userScore - minScore
                  const rangeSpan = Math.max(1, maxScore - minScore + 1)
                  const progressPct = nextTier
                    ? Math.min(100, Math.max(0, (currentInRange / rangeSpan) * 100))
                    : 100

                  const ptsRemaining = nextTier ? Math.max(0, nextTier.min_score - userScore) : 0

                  return (
                    <div
                      key={badge.id}
                      className={`badge-card badge-card--tiered badge-card--tier-${activeTier.tier}`}
                      style={{
                        borderColor: activeTier.border_color || activeTier.color,
                        boxShadow: activeTier.glow_color ? `0 0 20px ${activeTier.glow_color}` : undefined
                      }}
                    >
                      <div className="badge-card-header">
                        <div
                          className={`badge-card-icon badge-card-icon--tier-${activeTier.tier}`}
                          style={{
                            backgroundColor: `${activeTier.color}20`,
                            color: activeTier.color,
                            border: `1px solid ${activeTier.border_color || activeTier.color}`
                          }}
                        >
                          <TierIconComponent size={24} />
                        </div>

                        <div className="badge-card-info">
                          <h3 className="badge-card-name badge-card-name--tiered">
                            <span className="badge-card-name__prefix">{t('badges.gamemind_rank.name', 'Ранг GameMind')}: </span>
                            <span className="badge-card-name__tier" style={{ color: activeTier.color }}>
                              {tierName} ({t('badges.gamemind_rank.tier', 'Уровень {{tier}}', { tier: activeTier.tier })})
                            </span>
                          </h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span className="badge-card-status badge-card-status--earned">
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={12} /> {t('badges.statusEarned', 'Разблокировано')}
                              </span>
                            </span>
                            <span className="badge-tier-companion-pill">
                              <Cpu size={11} /> {t('badges.gamemind_rank.ladderCurrent', 'Синхронизация:')} T{activeTier.tier}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="badge-card-desc">{t(activeTier.desc_key, '')}</p>

                      {/* Tier Progress Bar Box */}
                      <div className="badge-tier-progress-box">
                        <div className="badge-tier-progress-header">
                          <span className="badge-tier-progress-title">
                            {t('badges.gamemind_rank.currentScore', 'Текущий Score:')}
                          </span>
                          <span className="badge-tier-progress-value">{userScore} pts</span>
                        </div>
                        <div className="badge-tier-progress-bar-bg">
                          <div
                            className="badge-tier-progress-bar-fill"
                            style={{
                              width: `${progressPct}%`,
                              backgroundColor: activeTier.color
                            }}
                          />
                        </div>
                        <div className="badge-tier-next-info">
                          {nextTier ? (
                            <>
                              <span>
                                {t('badges.gamemind_rank.nextTier', 'Следующий ранг:')}{' '}
                                <strong>{t(nextTier.name_key, '')}</strong> ({nextTier.min_score} pts)
                              </span>
                              <span>{t('badges.gamemind_rank.ptsLeft', '{{pts}} pts осталось', { pts: ptsRemaining })}</span>
                            </>
                          ) : (
                            <span>{t('badges.gamemind_rank.maxRank', 'Максимальный ранг достигнут!')}</span>
                          )}
                        </div>
                      </div>

                      {/* AI Companion Evolution Matrix / Tier Ladder */}
                      <div className="badge-tier-ladder">
                        <div className="badge-tier-ladder-header">
                          <span className="badge-tier-ladder-title">
                            <Cpu size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '5px' }} />
                            {t('badges.gamemind_rank.ladderTitle', 'Эволюция ИИ-Компаньона')}
                          </span>
                          <span className="badge-tier-ladder-active-indicator">
                            {t('badges.gamemind_rank.ladderCurrent', 'Синхронизация:')} Tier {activeTier.tier} / {tiers.length}
                          </span>
                        </div>
                        <div className="badge-tier-ladder-grid">
                          {tiers.map((tItem) => {
                            const isTierUnlocked = userScore >= tItem.min_score
                            const isCurrent = tItem.tier === activeTier.tier
                            const isNext = nextTier?.tier === tItem.tier
                            const StepIcon = (Icons as any)[tItem.icon] || Trophy
                            const stepName = t(tItem.name_key, `T${tItem.tier}`)
                            return (
                              <div
                                key={tItem.tier}
                                className={`tier-ladder-step tier-ladder-step--tier-${tItem.tier} ${isCurrent ? 'tier-ladder-step--current' : ''} ${isTierUnlocked ? 'tier-ladder-step--unlocked' : 'tier-ladder-step--locked'} ${isNext ? 'tier-ladder-step--next' : ''}`}
                                title={`${stepName} (${tItem.min_score}+ pts)`}
                              >
                                <div
                                  className="tier-ladder-step-icon-box"
                                  style={{
                                    borderColor: isTierUnlocked || isCurrent ? tItem.border_color || tItem.color : undefined,
                                    color: isTierUnlocked || isCurrent ? tItem.color : undefined,
                                    backgroundColor: isTierUnlocked || isCurrent ? `${tItem.color}18` : undefined
                                  }}
                                >
                                  <StepIcon size={13} />
                                  {isCurrent && <span className="tier-ladder-step-pulse" />}
                                </div>
                                <span className="tier-ladder-step-num">T{tItem.tier}</span>
                                <span className="tier-ladder-step-name">{stepName}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <div className="badge-card-how-to-get" style={{ marginTop: '14px' }}>
                        <Target size={14} className="badge-card-how-to-get-icon" />
                        <div className="badge-card-how-to-get-text">
                          <span className="badge-card-how-to-get-label">{t('badges.howToGetTitle', 'Как получить:')}</span>
                          <span>{t('badges.gamemind_rank.howToGet', 'Повышайте GameMind Score (игры, достижения, наигранные часы), чтобы открывать новые ранги.')}</span>
                        </div>
                      </div>
                    </div>
                  )
                }

                const isLegend = badge.code_name === 'legend' || badge.icon === 'LegendIcon' || badge.icon === 'Sparkles'
                const IconComponent = isLegend ? LegendIcon : ((Icons as any)[badge.icon] || Icons.HelpCircle)
                const nameKey = badge.name_key
                const descKey = badge.desc_key
                const howToGetKey = `badges.${badge.code_name}.howToGet`

                return (
                  <div
                    key={badge.id}
                    className={`badge-card ${badge.code_name === 'boss' ? 'badge-card--boss' : ''} ${badge.code_name === 'legend' ? 'badge-card--legend' : ''} ${!isEarned ? 'badge-card--locked' : ''}`}
                  >
                    <div className="badge-card-header">
                      <div
                        className={`badge-card-icon ${badge.code_name === 'legend' ? 'badge-card-icon--legend' : ''}`}
                        style={{
                          backgroundColor: isEarned ? `${badge.color}20` : 'rgba(255,255,255,0.05)',
                          color: isEarned ? badge.color : 'var(--text-tertiary)',
                          border: `1px solid ${isEarned ? `${badge.color}40` : 'rgba(255,255,255,0.1)'}`
                        }}
                      >
                        <IconComponent size={22} color={isEarned ? badge.color : undefined} />
                      </div>

                      <div className="badge-card-info">
                        <h3 className="badge-card-name">
                          {t(nameKey, badge.code_name)}
                        </h3>
                        <span
                          className={`badge-card-status ${
                            isEarned ? 'badge-card-status--earned' : 'badge-card-status--locked'
                          }`}
                        >
                          {isEarned ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={12} /> {t('badges.statusEarned', 'Разблокировано')}
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Lock size={12} /> {t('badges.locked', 'Заблокировано')}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <p className="badge-card-desc">{t(descKey, '')}</p>

                    <div className="badge-card-how-to-get">
                      <Target size={14} className="badge-card-how-to-get-icon" />
                      <div className="badge-card-how-to-get-text">
                        <span className="badge-card-how-to-get-label">{t('badges.howToGetTitle', 'Как получить:')}</span>
                        <span>{t(howToGetKey, 'Выполнить условия в приложении')}</span>
                        {isEarned && userBadge && (
                          <span className="badge-card-granted-at">
                            {t('badges.grantedAt', 'Получено')}: {new Date(userBadge.granted_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
