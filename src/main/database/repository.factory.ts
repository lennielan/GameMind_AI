import { AchievementsRepository } from './repositories/achievements.repository'
import { BadgesRepository } from './repositories/badges.repository'
import { BlacklistRepository } from './repositories/blacklist.repository'
import { FavoritesRepository } from './repositories/favorites.repository'
import { GamesRepository } from './repositories/games.repository'
import { JournalRepository } from './repositories/journal.repository'
import { PlayerDnaRepository } from './repositories/player-dna.repository'
import { RecommendationHistoryRepository } from './repositories/recommendation-history.repository'
import { RecommendationsRepository } from './repositories/recommendations.repository'
import { TimelineEntryRepository } from './repositories/timeline-entry.repository'
import { UserProfileRepository } from './repositories/user-profile.repository'
import { WishlistRepository } from './repositories/wishlist.repository'

// Initialize all repositories
export const achievementsRepository = new AchievementsRepository()
export const badgesRepository = new BadgesRepository()
export const blacklistRepository = new BlacklistRepository()
export const favoritesRepository = new FavoritesRepository()
export const gamesRepository = new GamesRepository()
export const journalRepository = new JournalRepository()
export const playerDnaRepository = new PlayerDnaRepository()
export const recommendationHistoryRepository = new RecommendationHistoryRepository()
export const recommendationsRepository = new RecommendationsRepository()
export const timelineEntryRepository = new TimelineEntryRepository()
export const userProfileRepository = new UserProfileRepository()
export const wishlistRepository = new WishlistRepository()
