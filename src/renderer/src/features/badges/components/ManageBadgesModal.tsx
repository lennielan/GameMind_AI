import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Crown, PlusCircle, MinusCircle } from 'lucide-react'
import * as Icons from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useBadges } from '../hooks/useBadges'
import './ManageBadgesModal.css'

interface ManageBadgesModalProps {
  targetUserId?: string
  targetSteamId?: string
  targetUsername?: string
  onClose: () => void
}

export function ManageBadgesModal({ targetUserId, targetSteamId, targetUsername, onClose }: ManageBadgesModalProps) {
  const { t } = useTranslation()
  const queryId = targetUserId || targetSteamId
  const { allBadges, userBadges, grantBadge, revokeBadge, loading } = useBadges(queryId, targetSteamId)

  const grantedBadgeCodes = new Set(userBadges.map((ub) => ub.badge_code))

  const handleGrant = async (badgeCode: string, badgeName: string) => {
    try {
      await grantBadge(badgeCode, 'boss')
      toast.success(t('badges.admin.grantSuccess', { name: badgeName, defaultValue: `Значок "${badgeName}" выдан!` }))
    } catch (err: any) {
      toast.error(err.message || 'Ошибка при выдаче значка')
    }
  }

  const handleRevoke = async (badgeCode: string, badgeName: string) => {
    try {
      await revokeBadge(badgeCode)
      toast.info(t('badges.admin.revokeSuccess', { name: badgeName, defaultValue: `Значок "${badgeName}" отозван` }))
    } catch (err: any) {
      toast.error(err.message || 'Ошибка при отзыве значка')
    }
  }

  return (
    <AnimatePresence>
      <div className="manage-badges-overlay" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2 }}
          className="manage-badges-container"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="manage-badges-header">
            <div>
              <div className="manage-badges-title-group">
                <Crown size={22} className="manage-badges-crown-icon" />
                <h2 className="manage-badges-title">{t('badges.admin.title', 'Управление значками')}</h2>
              </div>
              <p className="manage-badges-subtitle">
                {t('badges.admin.user', 'Пользователь')}: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{targetUsername || targetUserId || targetSteamId}</span>
              </p>
            </div>
            <button className="manage-badges-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="manage-badges-body">
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#ff4d4d', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : (
              allBadges.map((badge) => {
                const isGranted = grantedBadgeCodes.has(badge.code_name)
                const IconComponent = (Icons as any)[badge.icon] || Icons.HelpCircle
                const badgeName = t(badge.name_key, badge.code_name)
                const badgeDesc = t(badge.desc_key, '')

                return (
                  <div key={badge.id} className="manage-badge-row">
                    <div className="manage-badge-left">
                      <div
                        className="manage-badge-icon-box"
                        style={{
                          backgroundColor: `${badge.color}20`,
                          color: badge.color,
                          border: `1px solid ${badge.color}40`
                        }}
                      >
                        <IconComponent size={20} />
                      </div>
                      <div className="manage-badge-info">
                        <h4 className="manage-badge-name">{badgeName}</h4>
                        <span className="manage-badge-desc">{badgeDesc}</span>
                      </div>
                    </div>

                    <div>
                      {isGranted ? (
                        <button
                          className="manage-badge-action-btn manage-badge-btn--revoke"
                          onClick={() => handleRevoke(badge.code_name, badgeName)}
                        >
                          <MinusCircle size={14} />
                          {t('badges.admin.revoke', 'Забрать')}
                        </button>
                      ) : (
                        <button
                          className="manage-badge-action-btn manage-badge-btn--grant"
                          onClick={() => handleGrant(badge.code_name, badgeName)}
                        >
                          <PlusCircle size={14} />
                          {t('badges.admin.grant', 'Выдать')}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
