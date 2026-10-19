import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronRight, Gamepad2 } from 'lucide-react';
import './FavoritesTab.css';
import { FavoriteDetailModal } from './FavoriteDetailModal';

export interface FavoriteEntry {
  appId: number;
  gameName: string;
  headerImage: string;
  score: number;
  reasoning?: string;
  hardwareEvaluation?: string;
  context?: string;
  aiReview?: string;
  addedAt: string;
}

export const FavoritesTab: React.FC = () => {
  const { t } = useTranslation();
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFavorite, setSelectedFavorite] = useState<FavoriteEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setIsLoading(true);
    try {
      const result = await window.api.favorites.getAll();
      if (result.success && result.data) {
        setFavorites(result.data);
      } else {
        console.error('Failed to load favorites:', result.error);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFavorite = async (gameName: string) => {
    try {
      const result = await window.api.favorites.remove(gameName);
      if (result.success) {
        setFavorites(prev => prev.filter(f => f.gameName !== gameName));
        if (selectedFavorite?.gameName === gameName) {
          setIsModalOpen(false);
        }
      } else {
        console.error('Failed to remove favorite:', result.error);
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const openDetails = (favorite: FavoriteEntry) => {
    setSelectedFavorite(favorite);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="favorites-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="favorites-empty-state">
        <Star className="empty-icon" size={64} />
        <h2>{t('favorites.emptyTitle', 'Нет избранных игр')}</h2>
        <p>{t('favorites.emptyDesc', 'Вы пока не добавили ни одной игры в избранное.')}</p>
      </div>
    );
  }

  return (
    <div className="favorites-container">
      <div className="favorites-grid">
        <AnimatePresence>
          {favorites.map((fav) => (
            <motion.div
              key={fav.gameName}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="favorite-card"
            >
              <div className="favorite-card-image-wrapper">
                {fav.headerImage ? (
                  <img src={fav.headerImage} alt={fav.gameName} className="favorite-card-image" />
                ) : (
                  <div className="favorite-card-placeholder">
                    <Gamepad2 size={32} />
                  </div>
                )}
                <div className="favorite-score-badge">
                  {fav.score}/100
                </div>
                <button
                  className="favorite-star-btn active"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFavorite(fav.gameName);
                  }}
                  title={t('favorites.remove', 'Удалить из избранного')}
                >
                  <Star fill="currentColor" size={20} />
                </button>
              </div>
              <div className="favorite-card-content">
                <h3 className="favorite-card-title">{fav.gameName}</h3>
                <button
                  className="favorite-details-btn"
                  onClick={() => openDetails(fav)}
                >
                  {t('favorites.details', 'Подробнее')}
                  <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {selectedFavorite && (
        <FavoriteDetailModal
          isOpen={isModalOpen}
          favorite={selectedFavorite}
          onClose={() => setIsModalOpen(false)}
          onRemove={() => handleRemoveFavorite(selectedFavorite.gameName)}
        />
      )}
    </div>
  );
};
