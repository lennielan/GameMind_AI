import React from 'react'
import { motion } from 'framer-motion'
import { EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import styles from '../../SettingsPage.module.css'

interface BlacklistTabProps {
  blacklist: { appId: number, gameName: string, addedAt: number }[]
  handleRemoveFromBlacklist: (appId: number) => void
  fadeUp: any
}

export function BlacklistTab({ blacklist, handleRemoveFromBlacklist, fadeUp }: BlacklistTabProps) {
  const { t } = useTranslation()

  return (
    <motion.section className={styles.settingsSection} variants={fadeUp}>
      <div className={styles.settingsSectionHeader}>
        <EyeOff size={20} />
        <h2>{t('settings.blacklist.title', 'Черный список рекомендаций')}</h2>
      </div>
      <p className={styles.settingsHint} style={{ marginBottom: '16px' }}>
        {t('settings.blacklist.desc', 'Игры в этом списке больше никогда не появятся в ваших ИИ рекомендациях.')}
      </p>
      <div className={styles.settingsBlacklistList} style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '8px', 
        maxHeight: '220px', 
        overflowY: 'auto', 
        background: 'var(--surface-2)', 
        padding: '12px', 
        borderRadius: '8px', 
        border: '1px solid var(--border-subtle)' 
      }}>
        {blacklist.length === 0 ? (
          <div style={{ color: 'var(--text-tertiary)', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
            {t('settings.blacklist.empty', 'Черный список пуст')}
          </div>
        ) : (
          blacklist.map((item) => (
            <div key={item.appId} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '8px 12px', 
              background: 'rgba(255, 255, 255, 0.03)', 
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>{item.gameName}</span>
              <button
                className={`${styles.settingsBtn} ${styles.settingsBtnSecondary}`}
                style={{ padding: '4px 10px', fontSize: '12px', minWidth: 'unset', height: 'unset' }}
                onClick={() => handleRemoveFromBlacklist(item.appId)}
              >
                {t('settings.blacklist.remove', 'Удалить')}
              </button>
            </div>
          ))
        )}
      </div>
    </motion.section>
  )
}
