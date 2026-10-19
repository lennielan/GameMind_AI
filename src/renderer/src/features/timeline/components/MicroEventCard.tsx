import React from 'react'
import { useTranslation } from 'react-i18next'
import { Flag, Calendar, Trophy, Gamepad2, Sparkles, Layers, Clock } from 'lucide-react'
import type { TimelineEntry } from '@shared/types'

interface MicroEventCardProps {
  entry: TimelineEntry
  getLocalizedTitle: (entry: TimelineEntry) => string
}

export function MicroEventCard({ entry, getLocalizedTitle }: MicroEventCardProps): React.JSX.Element {
  const { t } = useTranslation()

  const isYearly = entry.type === 'yearly_chapter'
  const isFirstStep = entry.title.toLowerCase().includes('first step') || entry.title.toLowerCase().includes('первый шаг')
  
  const appId = entry.metadata?.appId
  const gameName = entry.metadata?.gameName
  const headerImage = entry.metadata?.headerImage
  const dominantGenre = entry.facts?.dominantGenres?.[0]
  const gamesCount = entry.facts?.gamesCount
  const hoursPlayed = entry.facts?.hoursPlayed

  const capsuleSrc = appId 
    ? `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/capsule_184x69.jpg`
    : headerImage

  const icon = isFirstStep ? (
    <Flag size={14} className="text-success" />
  ) : isYearly ? (
    <Calendar size={14} className="text-info" />
  ) : (
    <Trophy size={14} className="text-warning" />
  )

  const badgeText = isFirstStep 
    ? t('timeline.firstStepBadge', 'Первый шаг в Steam')
    : isYearly 
    ? t('timeline.yearlyBadge', 'Годовой срез')
    : t('timeline.milestoneBadge', 'Знаковая веха')

  return (
    <div className={`micro-event-card ${isYearly ? 'micro-event-card--yearly' : ''}`}>
      {/* Visual Image / Icon Left Side */}
      <div className="micro-event-card__media">
        {capsuleSrc ? (
          <img 
            src={capsuleSrc} 
            alt={gameName || 'Event'} 
            className="micro-event-card__img"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><rect width="100%" height="100%" fill="%231e1e28"/></svg>';
            }}
          />
        ) : (
          <div className="micro-event-card__placeholder">
            <Gamepad2 size={24} className="text-secondary" />
          </div>
        )}
        <div className="micro-event-card__media-glow" />
      </div>

      {/* Main Info */}
      <div className="micro-event-card__body">
        <div className="micro-event-card__top">
          <div className="micro-event-card__badge">
            {icon}
            <span>{badgeText}</span>
          </div>

          {dominantGenre && (
            <span className="micro-event-card__genre">{dominantGenre}</span>
          )}
        </div>

        <h4 className="micro-event-card__title">
          {getLocalizedTitle(entry)}
          {gameName && !getLocalizedTitle(entry).includes(gameName) && (
            <span className="micro-event-card__game-subtitle"> • {gameName}</span>
          )}
        </h4>

        {/* Narrative / Description if present */}
        {entry.aiInterpretation?.narrative && (
          <p className="micro-event-card__narrative">
            "{entry.aiInterpretation.narrative}"
          </p>
        )}

        {/* Quick Micro-Metrics */}
        <div className="micro-event-card__metrics">
          {gamesCount !== undefined && gamesCount > 0 && (
            <div className="micro-metric" title={t('timeline.gamesPlayed', 'сыграно игр')}>
              <Layers size={12} />
              <span>{gamesCount} {t('timeline.gamesShort', 'игр')}</span>
            </div>
          )}

          {hoursPlayed !== undefined && hoursPlayed > 0 && (
            <div className="micro-metric" title={t('timeline.timeSpent', 'потрачено времени')}>
              <Clock size={12} />
              <span>{hoursPlayed} {t('timeline.hoursUnit', 'ч.')}</span>
            </div>
          )}

          {isYearly && (
            <div className="micro-metric micro-metric--sparkle">
              <Sparkles size={12} />
              <span>Spotify Wrapped Style</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
