import React from 'react'
import { useTranslation } from 'react-i18next'
import { Star, Clock, Activity, Trophy, Quote, Sparkles } from 'lucide-react'
import type { TimelineEntry } from '@shared/types'

interface MilestoneCardProps {
  entry: TimelineEntry
  getFlavorText: (t: any, type: 'game' | 'era', seedString: string, hours: number, gameName: string) => string
}

export function MilestoneCard({ entry, getFlavorText }: MilestoneCardProps): React.JSX.Element {
  const { t } = useTranslation()

  const appId = entry.metadata?.appId
  const gameName = entry.metadata?.gameName || entry.title
  const hoursPlayed = entry.facts?.hoursPlayed || 0
  const shards = entry.metadata?.shards || []
  const narrative = entry.aiInterpretation?.narrative || 
    getFlavorText(t, 'game', appId?.toString() || entry.id, hoursPlayed, gameName)
  const hypothesis = entry.aiInterpretation?.alternateHistoryHypothesis

  const heroImage = appId 
    ? `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/library_hero.jpg`
    : entry.metadata?.headerImage

  const fallbackHeader = appId
    ? `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/header.jpg`
    : entry.metadata?.headerImage

  return (
    <div className="milestone-card">
      {/* Background Banner with Gradient Overlay */}
      <div className="milestone-card__banner">
        <img 
          src={heroImage || fallbackHeader}
          alt={gameName}
          className="milestone-card__banner-img"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (fallbackHeader && target.src !== fallbackHeader) {
              target.src = fallbackHeader;
            } else {
              target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%231e1e2d"/></svg>';
            }
          }}
        />
        <div className="milestone-card__banner-gradient" />
      </div>

      {/* Content Container */}
      <div className="milestone-card__content">
        {/* Header Badges */}
        <div className="milestone-card__header-badges">
          <div className="milestone-card__badge">
            <Star size={13} className="text-warning fill-warning" />
            <span>{t('timeline.definingGame', 'Знаковая игра')}</span>
          </div>

          {hoursPlayed > 0 && (
            <div className="milestone-card__hours-pill">
              <Clock size={13} />
              <span>{hoursPlayed} {t('timeline.hoursUnit', 'ч.')}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="milestone-card__title">{gameName}</h3>

        {/* AI Narrative Quote */}
        {narrative && (
          <div className="milestone-card__quote-box">
            <Quote size={16} className="milestone-card__quote-icon" />
            <p className="milestone-card__quote-text">{narrative}</p>
          </div>
        )}

        {/* AI What-If Hypothesis Box */}
        {hypothesis && (
          <div className="milestone-card__hypothesis">
            <div className="milestone-card__hypothesis-header">
              <Activity size={14} className="milestone-card__hypothesis-icon" />
              <span>{t('timeline.aiHypothesis', 'Гипотеза ИИ: Что если?')}</span>
            </div>
            <p className="milestone-card__hypothesis-text">"{hypothesis}"</p>
          </div>
        )}

        {/* Achievement Shards */}
        {shards.length > 0 && (
          <div className="milestone-card__shards">
            <span className="milestone-card__shards-label">
              <Sparkles size={12} />
              {t('timeline.unlockedKeyAchievements', 'Ключевые достижения')}:
            </span>
            <div className="milestone-card__shards-list">
              {shards.map((s, idx) => (
                <div key={idx} className="milestone-shard-badge" title={s.name}>
                  {s.icon ? (
                    <img src={s.icon} alt="" className="milestone-shard-badge__icon" />
                  ) : (
                    <Trophy size={12} className="text-warning" />
                  )}
                  <span className="milestone-shard-badge__title">{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
