import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import './GameCard.css'

interface GameCardProps {
  game: any
  onClick?: () => void
}

export function GameCard({ game, onClick }: GameCardProps): React.JSX.Element {
  const formatPlaytime = (minutes: number) => {
    if (!minutes) return '0h'
    return `${(minutes / 60).toFixed(1)}h`
  }

  // Use library poster image if available, fallback to header, then capsule, then icon
  const getImageUrl = () => {
    return `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.appId}/library_600x900.jpg`
  }

  return (
    <motion.div 
      className="game-card"
      onClick={onClick}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <div className="game-card__image-container">
        <img 
          src={getImageUrl()} 
          alt={game.name}
          className="game-card__image"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            const currentSrc = target.src;
            
            // If library_600x900 fails, try header. If header fails, try capsule. If capsule fails, try generic SVG.
            if (currentSrc.includes('library_600x900')) {
              target.src = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.appId}/header.jpg`;
            } else if (currentSrc.includes('header')) {
              target.src = `https://steamcdn-a.akamaihd.net/steam/apps/${game.appId}/capsule_231x87.jpg`;
            } else if (!currentSrc.includes('placeholder')) {
              // Final fallback to a generic placeholder or transparent pixel so styling can take over
              target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%231e1e2d"/><text x="50%" y="50%" font-family="sans-serif" font-size="12" fill="%23a0a0b0" text-anchor="middle" dy=".3em">No Image</text></svg>';
            }
          }}
        />
        <div className="game-card__overlay">
          <div className="game-card__playtime">
            <Clock size={12} />
            {formatPlaytime(game.playtimeForever)}
          </div>
          {game.totalAchievements > 0 && (
            <div className="game-card__achievements" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', marginTop: '4px', color: '#a0a0b0' }}>
              <span>🏆</span>
              {game.unlockedAchievements}/{game.totalAchievements}
            </div>
          )}
        </div>
      </div>
      <div className="game-card__content">
        <h3 className="game-card__title" title={game.name}>{game.name}</h3>
      </div>
    </motion.div>
  )
}
