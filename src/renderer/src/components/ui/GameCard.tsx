import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Play, MoreVertical, Store, Users, Copy, Trophy, Star, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './GameCard.css'

interface GameCardProps {
  game: any
  onClick?: () => void
  isFavorite?: boolean
  onFavoriteClick?: (e: React.MouseEvent) => void
  isBlacklisted?: boolean
  onBlacklistClick?: (e: React.MouseEvent) => void
  onUndoBlacklist?: (e: React.MouseEvent) => void
  children?: React.ReactNode
}

export const GameCard = React.memo(function GameCard({ 
  game, 
  onClick, 
  isFavorite, 
  onFavoriteClick,
  isBlacklisted,
  onBlacklistClick,
  onUndoBlacklist,
  children
}: GameCardProps): React.JSX.Element {
  const { t } = useTranslation()
  const [showMenu, setShowMenu] = useState(false)
  const [imgSrc, setImgSrc] = useState(`https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.appId}/library_600x900.jpg`)
  const [isFallback, setIsFallback] = useState(false)
  const [noImage, setNoImage] = useState(false)

  const formatPlaytime = (minutes: number) => {
    if (!minutes) return '0h'
    return `${(minutes / 60).toFixed(1)}h`
  }

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.api.steamProtocolAction('run', game.appId)
  }

  const handleAction = (action: 'store' | 'community' | 'achievements', e: React.MouseEvent) => {
    e.stopPropagation()
    window.api.steamProtocolAction(action, game.appId)
    setShowMenu(false)
  }

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(game.appId.toString())
    setShowMenu(false)
  }

  return (
    <motion.div 
      className="game-card"
      onClick={onClick}
      onMouseLeave={() => setShowMenu(false)}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      {isBlacklisted && (
        <div className="game-card__blacklisted-overlay">
          <EyeOff size={32} className="game-card__blacklisted-icon" />
          <h4 className="game-card__blacklisted-title">{t('recommendations.blacklistedTitle', 'Игра скрыта')}</h4>
          <p className="game-card__blacklisted-desc">{t('recommendations.blacklistedDesc', 'Она больше не будет рекомендоваться')}</p>
          <button className="game-card__blacklisted-undo" onClick={(e) => {
            e.stopPropagation()
            onUndoBlacklist?.(e)
          }}>
            {t('common.undo', 'Отменить')}
          </button>
        </div>
      )}
      <div className="game-card__image-container">
        {/* Размытый фон (появляется только если это фоллбэк) */}
        {isFallback && (
          <img 
            src={imgSrc} 
            className="game-card__image-blurred-bg" 
            alt="" 
          />
        )}
        
        {/* Основная картинка */}
        {noImage ? (
          <div className="game-card__no-image">
            <span className="game-card__no-image-text">{game.name}</span>
          </div>
        ) : (
          <img 
            src={imgSrc} 
            alt={game.name}
            className={`game-card__image ${isFallback ? 'game-card__image--fallback' : ''}`}
            onError={() => {
              if (imgSrc.includes('library_600x900')) {
                setImgSrc(`https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.appId}/header.jpg`)
                setIsFallback(true)
              } else if (imgSrc.includes('header')) {
                setImgSrc(`https://steamcdn-a.akamaihd.net/steam/apps/${game.appId}/capsule_231x87.jpg`)
              } else if (!noImage) {
                setNoImage(true)
              }
            }}
          />
        )}
        
        {/* Экшен-кнопки (показываются если переданы пропсы) */}
        {onBlacklistClick && (
          <button 
            className="game-card__blacklist-btn" 
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onBlacklistClick(e)
            }}
            data-tooltip={t('recommendations.blacklistTooltip', 'Добавить в черный список')}
          >
            <EyeOff size={14} />
          </button>
        )}
        {onFavoriteClick && (
          <button
            className={`game-card__favorite-btn ${isFavorite ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onFavoriteClick(e)
            }}
            data-tooltip={t('recommendations.favoriteTooltip', 'Добавить в избранное')}
          >
            <Star size={14} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        )}
        
        {game.isStoreGame ? (
          <button className="game-card__play-btn" onClick={(e) => { e.stopPropagation(); onClick?.(); }} title="View in Store">
            <Store size={20} />
          </button>
        ) : (
          <button className="game-card__play-btn" onClick={handlePlay} title="Play on Steam">
            <Play size={20} fill="currentColor" style={{ marginLeft: '4px' }} />
          </button>
        )}

        {!game.isStoreGame && (
          <div className="game-card__menu-container">
            <button className="game-card__menu-trigger" onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}>
              <MoreVertical size={16} />
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="game-card__menu"
                >
                  <button onClick={handlePlay}><Play size={14}/> Play Now</button>
                  <button onClick={(e) => handleAction('store', e)}><Store size={14}/> Store Page</button>
                  <button onClick={(e) => handleAction('community', e)}><Users size={14}/> Community Hub</button>
                  {!(game.achievementsSyncedAt && game.totalAchievements === 0) && (
                    <button onClick={(e) => handleAction('achievements', e)}><Trophy size={14}/> View Achievements</button>
                  )}
                  <button onClick={handleCopy}><Copy size={14}/> Copy AppID</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {!game.isStoreGame && (
          <div className="game-card__overlay">
            <div className="game-card__playtime">
              <Clock size={12} />
              {formatPlaytime(game.playtimeForever)}
            </div>
            {!(game.achievementsSyncedAt && game.totalAchievements === 0) && (
              <div className="game-card__achievements">
                <Trophy size={12} color="#f59e0b" />
                {game.achievementsSyncedAt ? `${game.unlockedAchievements || 0}/${game.totalAchievements}` : '...'}
              </div>
            )}
          </div>
        )}
        
        {/* Рендеринг пользовательских дочерних элементов (например, бейджей поверх картинки) */}
        {children}
      </div>
      <div className="game-card__content">
        <h3 className="game-card__title" title={game.name}>{game.name}</h3>
      </div>
    </motion.div>
  )
})
