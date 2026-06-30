import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { UserProfile } from '../FriendsPage'
import { X, Sparkles, Loader2, Gamepad2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './CoopMatchModal.css'

interface CoopMatchModalProps {
  friend: UserProfile
  onClose: () => void
}

export function CoopMatchModal({ friend, onClose }: CoopMatchModalProps): React.JSX.Element {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<any>(null)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      // Step 5 of the plan: send IPC request to main process
      const result = await window.api.ai.generateCoopRecommendation(friend.dna_summary)
      setRecommendations(result)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const [myDna, setMyDna] = useState<any>(null)

  useEffect(() => {
    window.api.getDna().then((res: any) => {
      if (res.success && res.data?.summary) {
        setMyDna(res.data.summary)
      }
    })
  }, [])

  const topGenres = friend.dna_summary?.topGenres || []
  const myGenres = myDna?.topGenres || []
  
  const sharedGenres = myGenres.filter((g: string) => topGenres.includes(g))
  const friendUniqueGenres = topGenres.filter((g: string) => !myGenres.includes(g))
  
  const totalUnique = new Set([...myGenres, ...topGenres]).size
  const matchPercent = totalUnique === 0 ? 0 : Math.round((sharedGenres.length / totalUnique) * 100)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div 
        className="modal-content coop-match-modal"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="coop-modal-header">
          <div className="coop-avatars">
            <div className="avatar-me">{t('friends.modalMe')}</div>
            <div className="avatar-connector">
              <Sparkles size={16} />
            </div>
            <div className="avatar-friend">{friend.username.charAt(0).toUpperCase()}</div>
          </div>
          <h2>{t('friends.modalTitle', { name: friend.username })}</h2>
          <p>{t('friends.modalSubtitle')}</p>
        </div>

        {!recommendations ? (
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
                <span>{t('friends.modalCompatibility')}</span>
              </div>

              <div className="dna-columns">
                <div className="dna-column">
                  <h4>{t('friends.modalShared')}</h4>
                  <div className="tags-list">
                    {sharedGenres.length > 0 ? sharedGenres.map((g: string) => (
                      <span key={g} className="tag tag--shared">{g}</span>
                    )) : (
                      <span className="text-secondary">{t('friends.modalNoShared')}</span>
                    )}
                  </div>
                </div>

                <div className="dna-column">
                  <h4>{t('friends.modalFriendLikes')}</h4>
                  <div className="tags-list">
                    {friendUniqueGenres.length > 0 ? friendUniqueGenres.map((g: string) => (
                      <span key={g} className="tag">{g}</span>
                    )) : (
                      <span className="text-secondary">{t('friends.modalSame')}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <button 
              className="btn-primary btn-generate" 
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  {t('friends.modalGenerating')}
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  {t('friends.modalGenerate')}
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="coop-modal-results">
            {recommendations.games?.map((game: any, i: number) => (
              <div key={i} className="game-recommendation">
                <div className="game-rec-icon"><Gamepad2 size={24} /></div>
                <div className="game-rec-info">
                  <h4>{game.name}</h4>
                  <p>{game.reason}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
