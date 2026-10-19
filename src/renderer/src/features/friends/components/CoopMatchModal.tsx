import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CloudUserProfile } from '../../../../../shared/types/user.types'
import { X, Sparkles, Gamepad2, Check, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './CoopMatchModal.css'

interface CoopMatchModalProps {
  friend: CloudUserProfile
  userProfile?: CloudUserProfile | null
  onClose: () => void
}

type Stage = 'idle' | 'searching' | 'success' | 'results' | 'error'

export function CoopMatchModal({ friend, userProfile, onClose }: CoopMatchModalProps): React.JSX.Element {
  const { t } = useTranslation()
  const [stage, setStage] = useState<Stage>('idle')
  const [scanStep, setScanStep] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [recommendations, setRecommendations] = useState<any>(null)

  const [friendDna, setFriendDna] = useState<any>(friend.dna_summary)

  useEffect(() => {
    if (stage !== 'searching') return
    const timer = setInterval(() => {
      setScanStep(prev => (prev + 1) % 3)
    }, 1500)
    return () => clearInterval(timer)
  }, [stage])

  const handleGenerate = async () => {
    setStage('searching')
    setErrorMessage(null)
    try {
      const result = await window.api.ai.generateCoopRecommendation(friendDna || {})
      const games = result?.data?.games || result?.games
      if (result && result.success && games && games.length > 0) {
        setRecommendations(result)
        setStage('success')
        setTimeout(() => {
          setStage('results')
        }, 2200)
      } else {
        setErrorMessage(result?.error || t('friends.modalError', 'Не удалось подобрать игры. Попробуйте еще раз.'))
        setStage('error')
      }
    } catch (e: any) {
      setErrorMessage(e?.message || t('friends.modalError', 'Не удалось подобрать игры. Попробуйте еще раз.'))
      setStage('error')
    }
  }

  const [myDna, setMyDna] = useState<any>(null)

  useEffect(() => {
    window.api.getDna().then((res: any) => {
      if (res.success && res.data?.summary) {
        setMyDna(res.data.summary)
      }
    })

    // Получаем свежее ДНК друга напрямую из БД, чтобы избежать кэширования
    window.api.friends.searchUsers(friend.username).then((res: any) => {
      if (res.success && res.data) {
        const freshFriend = res.data.find((u: any) => u.id === friend.id)
        if (freshFriend && freshFriend.dna_summary) {
          setFriendDna(freshFriend.dna_summary)
        }
      }
    })
  }, [friend.id, friend.username])

  const normalizeGenre = (g: string): string => {
    const lower = g.toLowerCase().trim()
    if (lower.includes('fps') || lower.includes('шутер') || lower.includes('shooter')) return 'shooter'
    if (lower.includes('action') || lower.includes('экшен') || lower.includes('экшн') || lower.includes('акция') || lower.includes('боевик')) return 'action'
    if (lower.includes('rpg') || lower.includes('ролев') || lower.includes('role')) return 'rpg'
    if (lower.includes('strategy') || lower.includes('стратег') || lower.includes('rts') || lower.includes('пошагов')) return 'strategy'
    if (lower.includes('puzzle') || lower.includes('головолом') || lower.includes('пазл')) return 'puzzle'
    if (lower.includes('sim') || lower.includes('симулятор') || lower.includes('сим')) return 'simulation'
    if (lower.includes('adventure') || lower.includes('приключ') || lower.includes('адвенчур')) return 'adventure'
    if (lower.includes('horror') || lower.includes('ужас') || lower.includes('хоррор')) return 'horror'
    if (lower.includes('survival') || lower.includes('выживан') || lower.includes('сурвайвал')) return 'survival'
    if (lower.includes('platform') || lower.includes('платформ')) return 'platformer'
    if (lower.includes('fight') || lower.includes('файтинг') || lower.includes('драки')) return 'fighting'
    if (lower.includes('race') || lower.includes('racing') || lower.includes('гонк')) return 'racing'
    if (lower.includes('sport') || lower.includes('спорт')) return 'sports'
    if (lower.includes('mmo') || lower.includes('ммо')) return 'mmo'
    if (lower.includes('coop') || lower.includes('co-op') || lower.includes('кооп') || lower.includes('совмест')) return 'co-op'
    if (lower.includes('casual') || lower.includes('казуал')) return 'casual'
    if (lower.includes('indie') || lower.includes('инди')) return 'indie'
    return lower
  }

  const topGenres = friendDna?.topGenres || []
  const myGenres = myDna?.topGenres || []
  
  const normalizedTopGenres = topGenres.map((g: string) => normalizeGenre(g))
  const normalizedMyGenres = myGenres.map((g: string) => normalizeGenre(g))

  const sharedGenres = myGenres.filter((g: string) => normalizedTopGenres.includes(normalizeGenre(g)))
  const friendUniqueGenres = topGenres.filter((g: string) => !normalizedMyGenres.includes(normalizeGenre(g)))
  
  // Calculate a deterministic baseline compatibility so it's never 0%
  const getBaseline = (id1: string, id2: string) => {
    if (!id1 || !id2) return 50
    const str = id1 < id2 ? id1 + id2 : id2 + id1
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i)
      hash |= 0
    }
    return 45 + (Math.abs(hash) % 35) // Baseline between 45% and 80%
  }

  const baseline = getBaseline(userProfile?.id || '', friend.id)
  const genreBonus = sharedGenres.length * 10
  const matchPercent = Math.min(98, baseline + genreBonus)
  const gamesList = recommendations?.data?.games || recommendations?.games || []

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div 
        className="modal-content coop-match-modal"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
      >
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="coop-modal-header">
          <div className="coop-avatars">
            <div className="avatar-me">
              {userProfile?.avatar_url && !userProfile.avatar_url.startsWith('file://') ? (
                <img src={userProfile.avatar_url} alt="Me" />
              ) : (
                <span>{userProfile?.username?.charAt(0).toUpperCase() || t('friends.modalMe', 'Я')}</span>
              )}
            </div>
            <div className="avatar-connector">
              <Gamepad2 size={16} />
            </div>
            <div className="avatar-friend">
              {friend.avatar_url && !friend.avatar_url.startsWith('file://') ? (
                <img src={friend.avatar_url} alt={friend.username} />
              ) : (
                <span>{friend.username.charAt(0).toUpperCase()}</span>
              )}
            </div>
          </div>
          <h2>{t('friends.modalTitle', { name: friend.username, defaultValue: `Совместная игра с ${friend.username}` })}</h2>
          <p>{t('friends.modalSubtitle', 'Давайте посмотрим, какие игры подойдут вам обоим.')}</p>
        </div>

        <AnimatePresence mode="wait">
          {stage === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <div className="coop-modal-body">
                <div className="dna-compare">
                  <div className="match-score">
                    <div className="match-score-circle">
                      <svg viewBox="0 0 36 36" className="circular-chart">
                        <path className="circle-bg"
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path className="circle"
                          strokeDasharray={`${matchPercent}, 100`}
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <text x="18" y="20.35" className="percentage">{matchPercent}%</text>
                      </svg>
                    </div>
                    <span>{t('friends.modalCompatibility', 'Совместимость')}</span>
                  </div>

                  <div className="dna-columns">
                    <div className="dna-column">
                      <h4>{t('friends.modalShared', 'Общие интересы')}</h4>
                      <div className="tags-list">
                        {(!friendDna || !friendDna.topGenres || friendDna.topGenres.length === 0) ? (
                          <span className="text-secondary">{t('friends.modalDnaMissing', 'ДНК профиль еще не сформирован')}</span>
                        ) : sharedGenres.length > 0 ? sharedGenres.map((g: string) => (
                          <span key={g} className="tag tag--shared">{g}</span>
                        )) : (
                          <span className="text-secondary">{t('friends.modalNoShared', 'Нет общих жанров')}</span>
                        )}
                      </div>
                    </div>

                    <div className="dna-column">
                      <h4>{t('friends.modalFriendLikes', 'Другу нравится')}</h4>
                      <div className="tags-list">
                        {(!friendDna || !friendDna.topGenres || friendDna.topGenres.length === 0) ? (
                          <span className="text-secondary">{t('friends.modalDnaMissing', 'ДНК профиль еще не сформирован')}</span>
                        ) : friendUniqueGenres.length > 0 ? friendUniqueGenres.map((g: string) => (
                          <span key={g} className="tag">{g}</span>
                        )) : (
                          <span className="text-secondary">{t('friends.modalSame', 'Вы играете во всё то же самое')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  className="btn-primary btn-generate" 
                  onClick={handleGenerate}
                >
                  <Sparkles size={18} />
                  {t('friends.modalGenerate', 'Сгенерировать совместные рекомендации')}
                </button>
              </div>
            </motion.div>
          )}

          {stage === 'searching' && (
            <motion.div
              key="searching"
              className="coop-modal-syncing"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.3 }}
            >
              <div className="sync-avatars-stage">
                <div className="sync-avatar-node">
                  <div className="sync-node-ring" />
                  <div className="sync-avatar-img">
                    {userProfile?.avatar_url && !userProfile.avatar_url.startsWith('file://') ? (
                      <img src={userProfile.avatar_url} alt="Me" />
                    ) : (
                      <span>{userProfile?.username?.charAt(0).toUpperCase() || t('friends.modalMe', 'Я')}</span>
                    )}
                  </div>
                  <span className="sync-node-label">{userProfile?.username || t('friends.modalMe', 'Я')}</span>
                </div>

                <div className="sync-energy-stream">
                  <div className="sync-beam-track">
                    <div className="sync-beam-line" />
                    <div className="sync-beam-pulse sync-pulse-left" />
                    <div className="sync-beam-pulse sync-pulse-right" />
                  </div>
                  <div className="sync-center-nexus">
                    <div className="nexus-orbital" />
                    <div className="nexus-core">
                      <Gamepad2 size={18} className="nexus-icon" />
                    </div>
                  </div>
                </div>

                <div className="sync-avatar-node">
                  <div className="sync-node-ring sync-node-ring-delay" />
                  <div className="sync-avatar-img">
                    {friend.avatar_url && !friend.avatar_url.startsWith('file://') ? (
                      <img src={friend.avatar_url} alt={friend.username} />
                    ) : (
                      <span>{friend.username.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="sync-node-label">{friend.username}</span>
                </div>
              </div>

              <div className="searching-text-container">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={scanStep}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="searching-step-text"
                  >
                    {scanStep === 0 && t('friends.modalSyncStep1', 'Синхронизируем игровые профили...')}
                    {scanStep === 1 && t('friends.modalSyncStep2', 'Ищем общие жанры и механики...')}
                    {scanStep === 2 && t('friends.modalSyncStep3', 'Подбираем идеальные игры для кооператива...')}
                  </motion.p>
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {stage === 'success' && (
            <motion.div
              key="success"
              className="coop-modal-syncing"
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 14, stiffness: 200 }}
            >
              <div className="sync-avatars-stage sync-locked">
                <div className="sync-avatar-node">
                  <div className="sync-node-ring sync-ring-success" />
                  <div className="sync-avatar-img">
                    {userProfile?.avatar_url && !userProfile.avatar_url.startsWith('file://') ? (
                      <img src={userProfile.avatar_url} alt="Me" />
                    ) : (
                      <span>{userProfile?.username?.charAt(0).toUpperCase() || t('friends.modalMe', 'Я')}</span>
                    )}
                  </div>
                  <span className="sync-node-label">{userProfile?.username || t('friends.modalMe', 'Я')}</span>
                </div>

                <div className="sync-energy-stream sync-stream-connected">
                  <div className="sync-beam-track">
                    <div className="sync-beam-line sync-line-connected" />
                  </div>
                  <div className="sync-center-nexus">
                    <motion.div 
                      className="nexus-success-badge"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 12, stiffness: 240 }}
                    >
                      <Check size={22} strokeWidth={3} />
                    </motion.div>
                  </div>
                </div>

                <div className="sync-avatar-node">
                  <div className="sync-node-ring sync-ring-success" />
                  <div className="sync-avatar-img">
                    {friend.avatar_url && !friend.avatar_url.startsWith('file://') ? (
                      <img src={friend.avatar_url} alt={friend.username} />
                    ) : (
                      <span>{friend.username.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span className="sync-node-label">{friend.username}</span>
                </div>
              </div>

              <div className="searching-text-container">
                <h3 className="success-title">{t('friends.modalSyncSuccess', 'Синхронизация завершена')}</h3>
                <p className="success-desc">{t('friends.modalSyncSuccessDesc', 'Идеальные игры для совместной игры найдены')}</p>
              </div>
            </motion.div>
          )}

          {stage === 'results' && (
            <motion.div
              key="results"
              className="coop-results-wrapper"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
            >
              <div className="coop-cards-scroll">
                {gamesList.map((game: any, i: number) => (
                  <motion.div 
                    key={i} 
                    className="game-recommendation"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.3 }}
                  >
                    <div className="game-rec-icon"><Gamepad2 size={24} /></div>
                    <div className="game-rec-info">
                      <h4>{game.name}</h4>
                      <p>{game.reason}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="coop-modal-footer">
                <button className="btn-regenerate" onClick={() => setStage('idle')}>
                  <RefreshCw size={16} />
                  {t('friends.modalRegenerate', 'Подобрать другие игры')}
                </button>
              </div>
            </motion.div>
          )}

          {stage === 'error' && (
            <motion.div
              key="error"
              className="coop-modal-error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <p className="error-text">{errorMessage}</p>
              <div className="coop-modal-footer">
                <button className="btn-regenerate" onClick={handleGenerate}>
                  <RefreshCw size={16} />
                  {t('friends.modalRetry', 'Попробовать снова')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
