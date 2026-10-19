import React from 'react'
import { useTranslation } from 'react-i18next'
import { Compass, Sparkles, Quote, Award } from 'lucide-react'
import type { TimelineEntry } from '@shared/types'

interface LegacyCardProps {
  entry: TimelineEntry
  getLocalizedTitle: (entry: TimelineEntry) => string
}

export function LegacyCard({ entry, getLocalizedTitle }: LegacyCardProps): React.JSX.Element {
  const { t } = useTranslation()

  const narrative = entry.aiInterpretation?.narrative
  const futurePrediction = entry.aiInterpretation?.futurePrediction

  return (
    <div className="legacy-card">
      {/* Background Radial Glow */}
      <div className="legacy-card__glow-bg" />

      <div className="legacy-card__header">
        <div className="legacy-card__badge">
          <Award size={16} className="text-accent-primary" />
          <span>{t('timeline.grandConclusion', 'Грандиозный финал')}</span>
          <Sparkles size={14} className="text-warning" />
        </div>

        <h2 className="legacy-card__title">{getLocalizedTitle(entry)}</h2>
      </div>

      {narrative ? (
        <div className="legacy-card__body">
          <div className="legacy-card__narrative">
            <Quote size={24} className="legacy-card__quote-icon" />
            <p className="legacy-card__quote-text">{narrative}</p>
          </div>

          {futurePrediction && (
            <div className="legacy-card__prediction">
              <div className="legacy-card__prediction-header">
                <Compass size={16} className="text-accent-primary animate-pulse" />
                <h4>{t('timeline.aiReflection', 'Рефлексия ИИ: Взгляд в будущее')}</h4>
              </div>
              <p className="legacy-card__prediction-text">"{futurePrediction}"</p>
            </div>
          )}
        </div>
      ) : (
        <div className="legacy-card__empty">
          <p>{t('timeline.emptyLegacy', 'Сгенерируйте историю, чтобы увидеть ваше наследие.')}</p>
        </div>
      )}
    </div>
  )
}
