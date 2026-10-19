import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, ExternalLink, Sparkles, Trash2, Cpu, FileText, RotateCcw } from 'lucide-react';
import './FavoriteDetailModal.css';
import { FavoriteEntry } from './FavoritesTab';
import { HardwareBadge } from '../../components/ui/HardwareBadge';

interface Props {
  isOpen: boolean;
  favorite: FavoriteEntry;
  onClose: () => void;
  onRemove: () => void;
}

const AI_STEPS = [
  'favorites.generatingStep1',
  'favorites.generatingStep2',
  'favorites.generatingStep3'
];

export const FavoriteDetailModal: React.FC<Props> = ({ isOpen, favorite, onClose, onRemove }) => {
  const { t } = useTranslation();
  const [aiReview, setAiReview] = useState<string | null>(favorite.aiReview || null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    setAiReview(favorite.aiReview || null);
    setIsLoadingAi(false);
  }, [favorite]);

  useEffect(() => {
    if (!isLoadingAi) {
      setStepIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % AI_STEPS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [isLoadingAi]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleOpenSteam = () => {
    if (favorite.appId) {
      window.api.openExternal(`https://store.steampowered.com/app/${favorite.appId}`);
    }
  };

  const renderReasoning = (reasoning?: string) => {
    if (!reasoning) return t('favorites.noReasoning', 'Нет описания');
    try {
      const parsed = JSON.parse(reasoning);
      if (parsed && typeof parsed === 'object') {
        return parsed.summary || parsed.why || reasoning;
      }
    } catch {
      // ignore, not JSON
    }
    return reasoning;
  };

  const handleGetAiReview = async (force: boolean = false) => {
    if (aiReview && !force) return;
    setIsLoadingAi(true);
    try {
      const contextSummary = renderReasoning(favorite.reasoning);
      const cleanContext = contextSummary !== t('favorites.noReasoning', 'Нет описания') ? contextSummary : undefined;
      const result = await window.api.favorites.getAiReview(favorite.gameName, cleanContext, force);
      if (result.success && result.data) {
        setAiReview(result.data);
      }
    } catch (error) {
      console.error('Error fetching AI review:', error);
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="favorite-modal"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              className="modal-header-image" 
              style={favorite.headerImage ? { backgroundImage: `url(${favorite.headerImage})` } : { backgroundColor: 'var(--bg-hover)' }}
            >
              <div className="modal-header-overlay" />
              <button className="modal-close-btn" onClick={onClose}>
                <X size={24} />
              </button>
              <div className="modal-header-content">
                <div className="modal-score-badge">{favorite.score > 0 ? favorite.score : '??'}/100</div>
                <h2 className="modal-game-title">{favorite.gameName}</h2>
              </div>
            </div>

            <div className="modal-body">
              <div className="modal-actions-row">
                <button className="fv-modal-btn" onClick={handleOpenSteam}>
                  <ExternalLink size={18} />
                  {t('favorites.openSteam', 'Открыть в Steam')}
                </button>
                <button className="fv-modal-btn-danger" onClick={onRemove}>
                  <Trash2 size={18} />
                  {t('favorites.removeFromFavorites', 'Удалить из избранного')}
                </button>
              </div>

              {favorite.reasoning && (
                <div className="modal-section">
                  <h3 className="modal-section-title">
                    <FileText size={18} /> {t('favorites.reasoning', 'Краткое описание')}
                  </h3>
                  <div className="modal-content-box">{renderReasoning(favorite.reasoning)}</div>
                </div>
              )}

              {favorite.hardwareEvaluation && (
                <div className="modal-section">
                  <h3>
                    <Cpu size={18} />
                    {t('favorites.hardware', 'Оценка железа')}
                  </h3>
                  <div style={{ marginTop: '8px' }}>
                    <HardwareBadge evaluation={favorite.hardwareEvaluation} />
                  </div>
                </div>
              )}

              <div className="modal-section ai-review-section">
                <div className="modal-section-header">
                  <h3>
                    <Sparkles size={18} className="ai-icon" />
                    {t('favorites.aiReviewTitle', 'AI Обзор')}
                  </h3>
                  {aiReview && (
                    <motion.button
                      className={`btn-ai-regenerate ${isLoadingAi ? 'is-loading' : ''}`}
                      onClick={() => handleGetAiReview(true)}
                      disabled={isLoadingAi}
                      whileHover={!isLoadingAi ? { scale: 1.1, rotate: 15 } : {}}
                      whileTap={!isLoadingAi ? { scale: 0.9 } : {}}
                      title={t('favorites.regenerateAi', 'Сгенерировать заново')}
                    >
                      <RotateCcw size={14} className={isLoadingAi ? 'spin-animation' : ''} />
                    </motion.button>
                  )}
                </div>
                
                {isLoadingAi ? (
                  <motion.div 
                    className="ai-neural-card"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="ai-neural-card__glow" />
                    <div className="ai-neural-card__border-beam" />
                    
                    <div className="ai-neural-card__content">
                      <div className="ai-neural-card__core">
                        <svg className="ai-neural-card__rings" viewBox="0 0 64 64">
                          <motion.circle
                            cx="32"
                            cy="32"
                            r="26"
                            fill="none"
                            stroke="var(--accent-primary)"
                            strokeWidth="1.5"
                            strokeDasharray="6 4"
                            opacity="0.35"
                            animate={{ rotate: -360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                            style={{ transformOrigin: '32px 32px' }}
                          />
                          <motion.circle
                            cx="32"
                            cy="32"
                            r="18"
                            fill="none"
                            stroke="var(--accent-primary)"
                            strokeWidth="2"
                            strokeDasharray="10 6"
                            opacity="0.8"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
                            style={{ transformOrigin: '32px 32px' }}
                          />
                        </svg>
                        <motion.div 
                          className="ai-neural-card__sparkle"
                          animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.75, 1, 0.75] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <Sparkles size={18} />
                        </motion.div>
                      </div>

                      <div className="ai-neural-card__info">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={stepIndex}
                            initial={{ opacity: 0, y: 3, filter: 'blur(2px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, y: -3, filter: 'blur(2px)' }}
                            transition={{ duration: 0.25 }}
                            className="ai-neural-card__status"
                          >
                            {t(AI_STEPS[stepIndex])}
                          </motion.div>
                        </AnimatePresence>
                        <div className="ai-neural-card__skeleton-group">
                          <div className="ai-neural-card__skeleton-line line-1" />
                          <div className="ai-neural-card__skeleton-line line-2" />
                          <div className="ai-neural-card__skeleton-line line-3" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : aiReview ? (
                  <motion.div
                    className="ai-review-content modal-content-box"
                    initial={{ opacity: 0, y: 8, filter: 'blur(3px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {aiReview.split('\n\n').filter(Boolean).map((paragraph, idx) => (
                      <motion.p
                        key={idx}
                        className="ai-review-paragraph"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08, duration: 0.3 }}
                      >
                        {paragraph}
                      </motion.p>
                    ))}
                  </motion.div>
                ) : (
                  <motion.button 
                    className="btn-ai"
                    onClick={() => handleGetAiReview()}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="btn-ai__glow" />
                    <Sparkles size={18} className="btn-ai__icon" />
                    <span>{t('favorites.askAi', 'Спросить AI о подробностях')}</span>
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

