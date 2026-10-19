import React from 'react'
import { motion } from 'framer-motion'
import { Palette, Globe, MessageSquare, Sparkles, Power, Bot } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { BaseTheme, AccentColor } from '@shared/types'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { useOnboardingStore } from '@/stores/onboarding.store'
import styles from '../../SettingsPage.module.css'

interface AppearanceTabProps {
  theme: BaseTheme
  changeTheme: (val: BaseTheme) => void
  accentColor: AccentColor
  changeAccentColor: (val: AccentColor) => void
  language: string
  changeLanguage: (val: string) => void
  chatOverlayEnabled: boolean
  setChatOverlayEnabled: (val: boolean) => void
  launchOnStartup: boolean
  setLaunchOnStartup: (val: boolean) => void
  fadeUp: any
}

const ACCENT_OPTIONS: { value: AccentColor; labelKey: string; colorHex: string }[] = [
  { value: 'violet', labelKey: 'settings.appearance.accents.violet', colorHex: '#7c5cfc' },
  { value: 'crimson', labelKey: 'settings.appearance.accents.crimson', colorHex: '#e11d48' },
  { value: 'emerald', labelKey: 'settings.appearance.accents.emerald', colorHex: '#10b981' },
  { value: 'azure', labelKey: 'settings.appearance.accents.azure', colorHex: '#06b6d4' }
]

export function AppearanceTab({
  theme, changeTheme,
  accentColor, changeAccentColor,
  language, changeLanguage,
  chatOverlayEnabled, setChatOverlayEnabled,
  launchOnStartup, setLaunchOnStartup,
  fadeUp
}: AppearanceTabProps): React.JSX.Element {
  const { t } = useTranslation()
  const openTutorial = useOnboardingStore((s) => s.openTutorial)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Language */}
      <motion.section className={styles.settingsSection} variants={fadeUp}>
        <div className={styles.settingsSectionHeader}>
          <Globe size={20} />
          <h2>{t('settings.general.language')}</h2>
        </div>
        <div className={styles.settingsFormGroup}>
          <CustomSelect 
            options={[
              { value: 'en', label: 'English' },
              { value: 'ru', label: 'Русский' }
            ]}
            value={language}
            onChange={(val) => changeLanguage(val)}
          />
        </div>
      </motion.section>

      {/* Base Theme */}
      <motion.section className={styles.settingsSection} variants={fadeUp}>
        <div className={styles.settingsSectionHeader}>
          <Palette size={20} />
          <h2>{t('settings.appearance.title')}</h2>
        </div>

        <div className={styles.settingsField}>
          <label className={styles.settingsLabel}>{t('settings.appearance.theme')}</label>
          <div className={`${styles.settingsRadioGroup} ${styles.settingsRadioGroupInline}`}>
            {[
              { value: 'dark' as const, label: t('settings.appearance.themes.dark') },
              { value: 'light' as const, label: t('settings.appearance.themes.light') },
              { value: 'midnight' as const, label: t('settings.appearance.themes.midnight', 'Midnight') },
              { value: 'system' as const, label: t('settings.appearance.themes.system') }
            ].map((opt) => (
              <button
                key={opt.value}
                className={`${styles.settingsRadio} ${theme === opt.value ? styles.settingsRadioActive : ''}`}
                onClick={() => changeTheme(opt.value)}
              >
                <span className={styles.settingsRadioLabel}>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Accent Color Selection */}
      <motion.section className={styles.settingsSection} variants={fadeUp}>
        <div className={styles.settingsSectionHeader}>
          <Sparkles size={20} />
          <h2>{t('settings.appearance.accent', 'Акцентный цвет')}</h2>
        </div>

        <div className={styles.settingsField}>
          <div className={`${styles.settingsRadioGroup} ${styles.settingsRadioGroupInline}`}>
            {ACCENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`${styles.settingsRadio} ${accentColor === opt.value ? styles.settingsRadioActive : ''}`}
                onClick={() => changeAccentColor(opt.value)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: opt.colorHex,
                    boxShadow: accentColor === opt.value ? `0 0 8px ${opt.colorHex}` : 'none',
                    display: 'inline-block'
                  }}
                />
                <span className={styles.settingsRadioLabel}>
                  {t(opt.labelKey, opt.value)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Notifications / Features */}
      <motion.section className={styles.settingsSection} variants={fadeUp}>
        <div className={styles.settingsSectionHeader}>
          <MessageSquare size={20} />
          <h2>{t('settings.system.title', 'Система и уведомления')}</h2>
        </div>

        <div className={styles['settings__toggle-row'] || styles.settingsToggleRow}>
          <div className={styles['settings__toggle-info'] || styles.settingsToggleInfo}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ marginBottom: '4px' }}>
                {t('settings.notifications.chatOverlay', 'Глобальный оверлей сообщений')}
              </span>
              <span className={styles['settings__hint'] || styles.settingsHint} style={{ fontSize: '12px' }}>
                {t('settings.notifications.chatOverlayDesc', 'Показывать уведомления о новых сообщениях поверх всех окон.')}
              </span>
            </div>
          </div>
          <button 
            type="button"
            className={`${styles['settings__toggle'] || styles.settingsToggle} ${chatOverlayEnabled ? (styles['settings__toggle--active'] || styles.settingsToggleActive) : ''}`}
            onClick={() => setChatOverlayEnabled(!chatOverlayEnabled)}
          >
            <div className={styles['settings__toggle-knob'] || styles.settingsToggleKnob} />
          </button>
        </div>

        <div className={styles['settings__toggle-row'] || styles.settingsToggleRow}>
          <div className={styles['settings__toggle-info'] || styles.settingsToggleInfo}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ marginBottom: '4px' }}>
                {t('settings.system.autoLaunch', 'Автозапуск при старте ПК')}
              </span>
              <span className={styles['settings__hint'] || styles.settingsHint} style={{ fontSize: '12px' }}>
                {t('settings.system.autoLaunchDesc', 'Автоматически запускать GameMind вместе с включением компьютера.')}
              </span>
            </div>
          </div>
          <button 
            type="button"
            className={`${styles['settings__toggle'] || styles.settingsToggle} ${launchOnStartup ? (styles['settings__toggle--active'] || styles.settingsToggleActive) : ''}`}
            onClick={() => setLaunchOnStartup(!launchOnStartup)}
          >
            <div className={styles['settings__toggle-knob'] || styles.settingsToggleKnob} />
          </button>
        </div>
      </motion.section>

      {/* Onboarding Tutorial Replay */}
      <motion.section className={styles.settingsSection} variants={fadeUp}>
        <div className={styles.settingsSectionHeader}>
          <Bot size={20} />
          <h2>{t('onboarding.restartTutorial', 'Пройти обучение заново')}</h2>
        </div>

        <div className={styles['settings__toggle-row'] || styles.settingsToggleRow}>
          <div className={styles['settings__toggle-info'] || styles.settingsToggleInfo}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ marginBottom: '4px' }}>
                {t('onboarding.restartTutorial', 'Пройти обучение заново')}
              </span>
              <span className={styles['settings__hint'] || styles.settingsHint} style={{ fontSize: '12px' }}>
                {t('onboarding.restartTutorialDesc', 'Снова открыть интерактивный гид по возможностям GameMind.')}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => openTutorial()}
            style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Bot size={16} />
            {t('onboarding.restartTutorial', 'Пройти обучение заново')}
          </button>
        </div>
      </motion.section>
    </div>
  )
}
