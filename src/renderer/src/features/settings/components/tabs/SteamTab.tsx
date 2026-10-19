import React from 'react'
import { motion } from 'framer-motion'
import { Key, RefreshCw, Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import styles from '../../SettingsPage.module.css'

interface SteamTabProps {
  steamId: string
  setSteamId: (val: string) => void
  steamApiKey: string
  setSteamApiKey: (val: string) => void
  showKeys: Record<string, boolean>
  toggleKeyVisibility: (key: string) => void
  syncStatus: any
  handleSync: () => void
  setSaved: (val: boolean) => void
  fadeUp: any
}

export function SteamTab({
  steamId, setSteamId,
  steamApiKey, setSteamApiKey,
  showKeys, toggleKeyVisibility,
  syncStatus, handleSync, setSaved, fadeUp
}: SteamTabProps) {
  const { t } = useTranslation()

  return (
    <motion.section className={styles.settingsSection} variants={fadeUp}>
      <div className={styles.settingsSectionHeader}>
        <Key size={20} />
        <h2>{t('settings.steam.title')}</h2>
      </div>

      <div className={styles.settingsField}>
        <label className={styles.settingsLabel}>{t('settings.steam.steamIdLabel')}</label>
        <div className={styles.settingsSteamLogin}>
          <button
            className={`${styles.settingsBtn} ${styles.settingsBtnSteam}`}
            onClick={async () => {
              const res = await window.api.steamLogin()
              if (res.success && res.data) {
                setSteamId(res.data)
                setSaved(true)
                setTimeout(() => setSaved(false), 2000)
              }
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.005.105.005.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 12-5.373 12-12s-5.373-12-12-12z" />
            </svg>
            <span>{t('settings.steam.loginBtn')}</span>
          </button>
          <span className={styles.settingsSteamLoginText}>
            {t('settings.steam.orManual')}
          </span>
        </div>
        <input
          type="text"
          className={styles.settingsInput}
          value={steamId}
          onChange={(e) => setSteamId(e.target.value)}
          placeholder={t('settings.steam.steamIdPlaceholder')}
          id="input-steam-id"
        />
      </div>

      <div className={styles.settingsField}>
        <label className={styles.settingsLabel}>{t('settings.steam.apiKeyLabel')} <span style={{color: '#ef4444'}}>{t('settings.steam.apiKeyRequired')}</span></label>
        <p className={styles.settingsHint}>
          <strong>{t('settings.steam.apiKeyWarning').split(':')[0]}:</strong> {t('settings.steam.apiKeyWarning').split(':')[1] || t('settings.steam.apiKeyWarning')}
          <br />
          <a href="https://steamcommunity.com/dev/apikey" target="_blank" rel="noreferrer" className={styles.settingsLink}>
            {t('settings.steam.apiKeyLink')}
          </a> {t('settings.steam.apiKeyDomainHint')}
        </p>
        <div className={styles.settingsInputGroup}>
          <input
            type={showKeys['steamApiKey'] ? 'text' : 'password'}
            className={styles.settingsInput}
            value={steamApiKey}
            onChange={(e) => setSteamApiKey(e.target.value)}
            placeholder={t('settings.steam.apiKeyPlaceholder')}
            id="input-steam-api-key"
          />
          <button
            className={styles.settingsInputToggle}
            onClick={() => toggleKeyVisibility('steamApiKey')}
          >
            {showKeys['steamApiKey'] ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px', marginBottom: '24px', opacity: 0.6, fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
        {t('settings.steam.disclaimer', 'GameMind AI — независимое приложение. Не связано с Valve Corporation. Мы используем только публичные данные вашего Steam-профиля.')}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {t('settings.sync.title', 'Синхронизация')}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              {t('settings.sync.desc', 'Загрузите или обновите вашу библиотеку Steam')}
            </p>
          </div>
          <button
            className={`${styles.settingsBtn} ${styles.settingsBtnSecondary}`}
            id="btn-sync-now"
            onClick={handleSync}
            disabled={syncStatus?.isRunning}
          >
            <RefreshCw size={16} className={syncStatus?.isRunning ? 'animate-spin' : ''} />
            {syncStatus?.isRunning ? t('settings.actions.syncing') : t('settings.actions.syncNow')}
          </button>
        </div>
        
        {syncStatus && (
          <div style={{ marginTop: '1rem', background: 'var(--surface-hover)', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <span>{syncStatus.currentStep}</span>
              <span>{syncStatus.progress}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'var(--surface)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${syncStatus.progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s ease' }} />
            </div>
            {syncStatus.error && (
              <div style={{ color: 'var(--danger)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                {syncStatus.error}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.section>
  )
}
