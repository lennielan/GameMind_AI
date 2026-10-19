import React from 'react'
import { motion } from 'framer-motion'
import { Award, Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useBadges } from '../hooks/useBadges'
import { BadgeIcon } from './BadgeIcon'

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}

interface BadgesSettingsProps {
  userId?: string
  steamId?: string
}

export function BadgesSettings({ userId, steamId }: BadgesSettingsProps): React.JSX.Element | null {
  const { t } = useTranslation()
  const { userBadges, toggleVisibility, loading } = useBadges(userId || steamId, steamId, true)

  if (!steamId || loading) return null

  if (userBadges.length === 0) {
    return (
      <motion.section className="settings__section" variants={fadeUp}>
        <div className="settings__section-header">
          <h2>{t('badges.settings.title', 'Значки профиля')}</h2>
        </div>
        <div className="settings__field">
          <p className="text-secondary">{t('badges.settings.empty', 'У вас пока нет полученных значков.')}</p>
        </div>
      </motion.section>
    )
  }

  const visibleCount = userBadges.filter((ub) => !ub.is_hidden).length

  const handleToggle = (badgeCode: string, currentHidden: boolean) => {
    // If the badge is currently hidden and user wants to show it, check 5-badge limit
    if (currentHidden && visibleCount >= 5) {
      toast.error(t('badges.settings.limitReached', 'Вы не можете отображать более 5 значков в профиле!'))
      return
    }
    toggleVisibility(badgeCode, !currentHidden)
    toast.success(t('badges.settings.saved', 'Видимость значка обновлена'))
  }

  return (
    <motion.section className="settings__section" variants={fadeUp}>
      <div className="settings__section-header">
        <h2>{t('badges.settings.title', 'Значки профиля')}</h2>
      </div>

      <div className="settings__field">
        <label className="settings__label">{t('badges.settings.visibilityLabel', 'Отображение в профиле')}</label>
        <p className="settings__hint">{t('badges.settings.visibilityHint', 'Выберите до 5 значков для отображения в вашем профиле')}</p>

        <div className="flex flex-col gap-3 mt-4" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
          {userBadges.map((ub) => (
            <div
              key={ub.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                borderRadius: '8px',
                background: 'var(--surface-raised, rgba(255, 255, 255, 0.03))',
                border: '1px solid var(--border-default, rgba(255, 255, 255, 0.08))'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <BadgeIcon
                  iconName={ub.badge.icon}
                  color={ub.badge.color}
                  size={22}
                  locked={ub.is_hidden}
                />
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {t(ub.badge.name_key, ub.badge.name_key)}
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {t(ub.badge.desc_key, ub.badge.desc_key)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleToggle(ub.badge_code, ub.is_hidden)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: 'var(--surface-overlay, rgba(255, 255, 255, 0.05))',
                  border: '1px solid var(--border-default, rgba(255, 255, 255, 0.1))',
                  color: ub.is_hidden ? 'var(--text-secondary)' : 'var(--text-primary)'
                }}
              >
                {ub.is_hidden ? (
                  <>
                    <EyeOff size={14} /> {t('badges.hidden', 'Скрыт')}
                  </>
                ) : (
                  <>
                    <Eye size={14} /> {t('badges.visible', 'Видим')}
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  )
}
