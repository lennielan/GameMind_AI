import React from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  User,
  Award,
  Lock,
  Shield,
  Trophy,
  Activity,
  Star,
  MessageSquare
} from 'lucide-react'
import styles from './SettingsAuthPrompt.module.css'

export type SettingsAuthVariant = 'profile' | 'badges'

interface SettingsAuthPromptProps {
  variant: SettingsAuthVariant
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}

export function SettingsAuthPrompt({ variant }: SettingsAuthPromptProps): React.JSX.Element {
  const { t } = useTranslation()

  if (variant === 'profile') {
    return (
      <motion.section className={styles.settingsSection} variants={fadeUp}>
        <div className={styles.settingsSectionHeader}>
          <User size={20} />
          <h2>{t('settings.profile.title', 'Мой профиль')}</h2>
        </div>

        {/* Notice Banner */}
        <div className={styles.authNoticeBanner}>
          <div className={styles.authNoticeIconBadge}>
            <Lock size={18} />
          </div>
          <div className={styles.authNoticeContent}>
            <h3 className={styles.authNoticeTitle}>
              {t('settings.profile.authRequiredTitle', 'Требуется аккаунт GameMind')}
            </h3>
            <p className={styles.authNoticeDesc}>
              {t(
                'settings.profile.authRequiredDesc',
                'Чтобы настроить никнейм, загрузить аватарку и управлять приватностью вашей библиотеки и достижений, перейдите во вкладку «Аккаунт GameMind» для авторизации.'
              )}
            </p>
          </div>
        </div>

        {/* Locked Profile Mockup */}
        <div className={styles.lockedPreviewContainer}>
          <div className={styles.settingsField}>
            <label className={styles.settingsLabel}>{t('settings.profile.avatar', 'Аватарка')}</label>
            <div className={styles.lockedAvatarRow}>
              <div className={styles.lockedAvatarCircle}>
                <User size={28} />
              </div>
              <div className={styles.lockedAvatarText}>
                <span className={styles.lockedBadge}>{t('badges.locked', 'Заблокировано')}</span>
                <p className={styles.settingsHint}>
                  {t('settings.profile.authBenefit1Desc', 'Загружайте собственные аватары и кастомизируйте публичную витрину профиля.')}
                </p>
              </div>
            </div>
          </div>

          <div className={styles.settingsField}>
            <label className={styles.settingsLabel}>{t('settings.profile.username', 'Никнейм')}</label>
            <input 
              type="text"
              className={styles.settingsInput}
              value="Player"
              disabled
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
            />
          </div>

          <div className={styles.settingsField}>
            <label className={styles.settingsLabel}>{t('settings.profile.privacy', 'Приватность')}</label>
            
            <div className={styles.settingsToggleRow} style={{ opacity: 0.5 }}>
              <div className={styles.settingsToggleInfo}>
                <Shield size={16} />
                <span>{t('settings.profile.showLibrary', 'Показывать мою библиотеку игр другим пользователям')}</span>
              </div>
              <div className={styles.settingsToggle}>
                <div className={styles.settingsToggleKnob} />
              </div>
            </div>

            <div className={styles.settingsToggleRow} style={{ opacity: 0.5 }}>
              <div className={styles.settingsToggleInfo}>
                <Lock size={16} />
                <span>{t('settings.profile.showDna', 'Показывать мой Player DNA другим пользователям')}</span>
              </div>
              <div className={styles.settingsToggle}>
                <div className={styles.settingsToggleKnob} />
              </div>
            </div>

            <div className={styles.settingsToggleRow} style={{ opacity: 0.5 }}>
              <div className={styles.settingsToggleInfo}>
                <Trophy size={16} />
                <span>{t('settings.profile.showAchievements', 'Показывать мои достижения другим пользователям')}</span>
              </div>
              <div className={styles.settingsToggle}>
                <div className={styles.settingsToggleKnob} />
              </div>
            </div>

            <div className={styles.settingsToggleRow} style={{ opacity: 0.5 }}>
              <div className={styles.settingsToggleInfo}>
                <Activity size={16} />
                <span>{t('settings.profile.showActivity', 'Показывать мой сетевой статус и активность')}</span>
              </div>
              <div className={styles.settingsToggle}>
                <div className={styles.settingsToggleKnob} />
              </div>
            </div>
          </div>
        </div>
      </motion.section>
    )
  }

  // Badges variant
  return (
    <motion.section className={styles.settingsSection} variants={fadeUp}>
      <div className={styles.settingsSectionHeader}>
        <Award size={20} />
        <h2>{t('badges.settings.title', 'Значки профиля')}</h2>
      </div>

      {/* Notice Banner */}
      <div className={styles.authNoticeBanner}>
        <div className={styles.authNoticeIconBadge}>
          <Lock size={18} />
        </div>
        <div className={styles.authNoticeContent}>
          <h3 className={styles.authNoticeTitle}>
            {t('badges.settings.authRequiredTitle', 'Значки доступны для аккаунтов GameMind')}
          </h3>
          <p className={styles.authNoticeDesc}>
            {t(
              'badges.settings.authRequiredDesc',
              'Коллекционирование, прокачка рангов и управление отображением значков в профиле доступны для зарегистрированных аккаунтов. Перейдите во вкладку «Аккаунт GameMind» для входа.'
            )}
          </p>
        </div>
      </div>

      {/* Locked Badges Mockup */}
      <div className={styles.lockedPreviewContainer}>
        <div className={styles.settingsField}>
          <label className={styles.settingsLabel}>{t('badges.settings.visibilityLabel', 'Отображение в профиле')}</label>
          <p className={styles.settingsHint}>{t('badges.settings.visibilityHint', 'Выберите до 5 значков для отображения в вашем профиле')}</p>

          <div className={styles.lockedBadgesGrid}>
            {[1, 2, 3, 4, 5].map((slot) => (
              <div key={slot} className={styles.lockedBadgeSlot}>
                <Award size={22} className={styles.lockedBadgeSlotIcon} />
                <span>{t('badges.locked', 'Заблокировано')}</span>
              </div>
            ))}
          </div>

          <div className={styles.lockedBadgesList}>
            <div className={styles.lockedBadgeItem}>
              <div className={styles.lockedBadgeItemLeft}>
                <div className={styles.lockedBadgeIconBox}>
                  <Trophy size={18} />
                </div>
                <div>
                  <h4>{t('badges.settings.authBenefit1Title', 'Коллекция наград')}</h4>
                  <p>{t('badges.settings.authBenefit1Desc', 'Получайте уникальные значки за игровую активность, достижения и использование ИИ.')}</p>
                </div>
              </div>
              <span className={styles.lockedBadgeTag}>{t('badges.locked', 'Заблокировано')}</span>
            </div>

            <div className={styles.lockedBadgeItem}>
              <div className={styles.lockedBadgeItemLeft}>
                <div className={styles.lockedBadgeIconBox}>
                  <Star size={18} />
                </div>
                <div>
                  <h4>{t('badges.settings.authBenefit3Title', 'Ранги GameMind')}</h4>
                  <p>{t('badges.settings.authBenefit3Desc', 'Повышайте GameMind Score и открывайте престижные эволюционирующие ранговые значки.')}</p>
                </div>
              </div>
              <span className={styles.lockedBadgeTag}>{t('badges.locked', 'Заблокировано')}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  )
}
