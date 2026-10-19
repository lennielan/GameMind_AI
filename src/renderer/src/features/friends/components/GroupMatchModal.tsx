import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CloudUserProfile } from '../../../../../shared/types/user.types'
import { X, Loader2, Gamepad2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './CoopMatchModal.css' // Reuse the same styles

interface GroupMatchModalProps {
  friends: CloudUserProfile[]
  onClose: () => void
  userProfile?: CloudUserProfile | null
}

export function GroupMatchModal({ friends, onClose, userProfile }: GroupMatchModalProps): React.JSX.Element {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    generateMatch()
  }, [])

  const generateMatch = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.api.ai.generateGroupMatch(friends)
      if (res.success && res.data) {
        setResult(res.data)
      } else {
        setError(res.error || 'Failed to generate match')
      }
    } catch (e: any) {
      setError(e.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div 
        className="modal-content coop-match-modal"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        layout
        style={{ maxWidth: result ? '600px' : '450px' }}
      >
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <motion.div className="coop-modal-header" layout="position">
          <div className="coop-avatars" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div className="avatar-me" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--accent-primary)', overflow: 'hidden' }}>
              {userProfile?.avatar_url && !userProfile.avatar_url.startsWith('file://') ? (
                <img src={userProfile.avatar_url} alt="Me" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '0.8rem' }}>{userProfile?.username?.charAt(0).toUpperCase() || t('friends.modalMe')}</span>
              )}
            </div>
            {friends.map(f => (
              <div key={f.id} className="avatar-friend" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--border-default)', overflow: 'hidden' }}>
                {f.avatar_url && !f.avatar_url.startsWith('file://') ? (
                  <img src={f.avatar_url} alt={f.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  f.username.charAt(0).toUpperCase()
                )}
              </div>
            ))}
          </div>
          <h2 style={{ marginTop: '16px' }}>{t('friends.groupMatchTitle', 'Group Match')}</h2>
          <p>{t('friends.groupMatchSubtitle', 'Finding the perfect game for {{count}} players', { count: friends.length + 1 })}</p>
        </motion.div>

        {loading ? (
          <motion.div className="coop-modal-body" layout style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '32px 0' }}>
            <Loader2 className="animate-spin text-primary" size={48} />
            <p className="text-secondary">{t('friends.groupMatchAnalyzing', 'Analyzing libraries and matching DNA...')}</p>
          </motion.div>
        ) : error ? (
          <motion.div className="coop-modal-body" layout style={{ textAlign: 'center', color: 'var(--error)' }}>
            <p>{error}</p>
            <button className="btn-primary" onClick={generateMatch} style={{ marginTop: '16px' }}>{t('friends.retry', 'Retry')}</button>
          </motion.div>
        ) : result ? (
          <motion.div 
            className="coop-modal-results" 
            layout 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            style={{ maxHeight: '400px', overflowY: 'auto' }}
          >
            <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--surface-base)', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
              <h4 style={{ margin: '0 0 8px 0' }}>{t('friends.groupProfile', 'Group Profile')}</h4>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{result.groupProfile?.commonPlaystyle}</p>
            </div>
            {result.candidates?.map((game: any, i: number) => (
              <div key={i} className="game-recommendation">
                <div className="game-rec-icon">
                  <Gamepad2 size={24} />
                </div>
                <div className="game-rec-info">
                  <h4>{game.name}</h4>
                  <p>
                    {game.aiExplanation || game.rawReason}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        ) : null}
      </motion.div>
    </div>
  )
}
