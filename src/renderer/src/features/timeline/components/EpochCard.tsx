import React from 'react'
import { useTranslation } from 'react-i18next'
import { Crown, Sparkles, Users, Clock, Gamepad2, Trophy, Quote } from 'lucide-react'
import type { TimelineEntry } from '@shared/types'

interface EpochCardProps {
  entry: TimelineEntry
  getLocalizedTitle: (entry: TimelineEntry) => string
  getFlavorText: (t: any, type: 'game' | 'era', seedString: string, hours: number, gameName: string) => string
}

export function EpochCard({ entry, getLocalizedTitle, getFlavorText }: EpochCardProps): React.JSX.Element {
  const { t } = useTranslation()

  const dominantGenre = entry.facts?.dominantGenres?.[0]
  const gamesCount = entry.facts?.gamesCount || 0
  const hoursPlayed = entry.facts?.hoursPlayed || 0
  const topGames = entry.metadata?.games || []
  const shards = entry.metadata?.shards || []
  const companionName = entry.metadata?.companionName

  const narrativeText = entry.aiInterpretation?.narrative || 
    getFlavorText(t, 'era', entry.id, hoursPlayed, '')

  return (
    <div className="epoch-card">
      {/* Background Ambience Glow */}
      <div className="epoch-card__ambient-glow" />

      {/* Top Header Badge Row */}
      <div className="epoch-card__header">
        <div className="epoch-card__badge">
          <Crown size={14} className="text-warning" />
          <span>{t('timeline.epoch', 'Эпоха')}</span>
          {dominantGenre && (
            <span className="epoch-card__genre-pill">{dominantGenre}</span>
          )}
        </div>

        {entry.aiInterpretation?.confidence && (
          <div className="epoch-card__ai-badge" title={t('timeline.aiAnalyzed', 'Проанализировано ИИ')}>
            <Sparkles size={12} />
            <span>AI Verified</span>
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="epoch-card__title">{getLocalizedTitle(entry)}</h3>

      {/* Stats Quick Strip */}
      <div className="epoch-card__stats">
        <div className="epoch-stat">
          <div className="epoch-stat__icon-box">
            <Gamepad2 size={16} />
          </div>
          <div className="epoch-stat__info">
            <span className="epoch-stat__value">{gamesCount}</span>
            <span className="epoch-stat__label">{t('timeline.gamesPlayed', 'сыграно игр')}</span>
          </div>
        </div>

        <div className="epoch-stat">
          <div className="epoch-stat__icon-box">
            <Clock size={16} />
          </div>
          <div className="epoch-stat__info">
            <span className="epoch-stat__value">{hoursPlayed} {t('timeline.hoursUnit', 'ч.')}</span>
            <span className="epoch-stat__label">{t('timeline.timeSpent', 'потрачено времени')}</span>
          </div>
        </div>

        <div className="epoch-stat">
          <div className="epoch-stat__icon-box">
            <Users size={16} />
          </div>
          <div className="epoch-stat__info">
            <span className="epoch-stat__value epoch-stat__value--compact">
              {companionName || t('timeline.loneWolf', 'Одинокий волк')}
            </span>
            <span className="epoch-stat__label">{t('timeline.companion', 'Напарник эпохи')}</span>
          </div>
        </div>
      </div>

      {/* AI Narrative Quote Box */}
      {narrativeText && (
        <div className="epoch-card__narrative">
          <Quote size={18} className="epoch-card__quote-icon" />
          <p className="epoch-card__quote-text">{narrativeText}</p>
        </div>
      )}

      {/* Top Titles in this Era */}
      {topGames.length > 0 && (
        <div className="epoch-card__games-section">
          <div className="epoch-card__section-label">
            <span>{t('timeline.topGamesEra', 'Ключевые проекты эпохи')}</span>
          </div>
          <div className="epoch-card__games-grid">
            {topGames.map((g: any, i: number) => {
              const imgSrc = g.appId 
                ? `https://steamcdn-a.akamaihd.net/steam/apps/${g.appId}/capsule_184x69.jpg` 
                : g.headerImage

              return (
                <div key={g.appId || i} className="epoch-game-item" title={g.name}>
                  <div className="epoch-game-item__thumb">
                    <img 
                      src={imgSrc} 
                      alt={g.name}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><rect width="100%" height="100%" fill="%231e1e28"/></svg>';
                      }}
                    />
                    <div className="epoch-game-item__overlay" />
                    <span className="epoch-game-item__hours">
                      {g.hours || Math.round((g.playtime_forever || 0) / 60)} {t('timeline.hoursUnit', 'ч.')}
                    </span>
                  </div>
                  <div className="epoch-game-item__name">{g.name}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Achievement Shards */}
      {shards.length > 0 && (
        <div className="epoch-card__shards">
          {shards.map((s, i) => (
            <div key={i} className="epoch-shard" title={s.name}>
              {s.icon ? (
                <img src={s.icon} alt="" className="epoch-shard__icon" />
              ) : (
                <Trophy size={13} className="epoch-shard__trophy" />
              )}
              <span className="epoch-shard__name">{s.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
