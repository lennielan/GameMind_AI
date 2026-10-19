import React from 'react'
import { motion } from 'framer-motion'
import { User, Shield, Lock, Trophy, Activity, MessageSquare, Save } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AvatarCropper } from '../../../../components/ui/AvatarCropper'
import { CustomSelect } from '../../../../components/ui/CustomSelect'
import type { CloudUserProfile } from '@shared/types/user.types'
import styles from '../../SettingsPage.module.css'

interface ProfileTabProps {
  session: any
  profile: CloudUserProfile
  setProfile: (val: CloudUserProfile) => void
  handleSaveProfile: () => void
  fadeUp: any
}

export function ProfileTab({
  session, profile, setProfile, handleSaveProfile, fadeUp
}: ProfileTabProps) {
  const { t } = useTranslation()

  if (!session || !profile) return null

  return (
    <motion.section id="profile-section" className={styles.settingsSection} variants={fadeUp}>
      <div className={styles.settingsSectionHeader}>
        <User size={20} />
        <h2>{t('settings.profile.title', 'Мой профиль')}</h2>
      </div>
      
      <div className={styles.settingsProfileSection}>
        <div className={styles.settingsField}>
          <label className={styles.settingsLabel}>{t('settings.profile.avatar', 'Аватарка')}</label>
          <AvatarCropper
            currentAvatar={profile.avatar_url || null}
            username={profile.username || ''}
            onSave={(fileUrl) => setProfile({ ...profile, avatar_url: fileUrl })}
          />
        </div>

        <div className={styles.settingsField}>
          <label className={styles.settingsLabel}>{t('settings.profile.username', 'Никнейм')}</label>
          <input 
            type="text"
            className={styles.settingsInput}
            value={profile.username || ''}
            onChange={(e) => setProfile({ ...profile, username: e.target.value })}
          />
        </div>

        <div className={styles.settingsField}>
          <label className={styles.settingsLabel}>{t('settings.profile.privacy', 'Приватность')}</label>
          
          <div className={styles.settingsToggleRow}>
            <div className={styles.settingsToggleInfo}>
              <Shield size={16} />
              <span>{t('settings.profile.showLibrary', 'Показывать мою библиотеку игр другим пользователям')}</span>
            </div>
            <button 
              className={`${styles.settingsToggle} ${profile.is_library_public !== false ? styles.settingsToggleActive : ''}`}
              onClick={() => setProfile({ ...profile, is_library_public: profile.is_library_public === false ? true : false })}
            >
              <div className={styles.settingsToggleKnob} />
            </button>
          </div>

          <div className={styles.settingsToggleRow}>
            <div className={styles.settingsToggleInfo}>
              <Lock size={16} />
              <span>{t('settings.profile.showDna', 'Показывать мой Player DNA другим пользователям')}</span>
            </div>
            <button 
              className={`${styles.settingsToggle} ${profile.is_dna_public !== false ? styles.settingsToggleActive : ''}`}
              onClick={() => setProfile({ ...profile, is_dna_public: profile.is_dna_public === false ? true : false })}
            >
              <div className={styles.settingsToggleKnob} />
            </button>
          </div>

          <div className={styles.settingsToggleRow}>
            <div className={styles.settingsToggleInfo}>
              <Trophy size={16} />
              <span>{t('settings.profile.showAchievements', 'Показывать мои достижения другим пользователям')}</span>
            </div>
            <button 
              className={`${styles.settingsToggle} ${profile.is_achievements_public !== false ? styles.settingsToggleActive : ''}`}
              onClick={() => setProfile({ ...profile, is_achievements_public: profile.is_achievements_public === false ? true : false })}
            >
              <div className={styles.settingsToggleKnob} />
            </button>
          </div>

          <div className={styles.settingsToggleRow}>
            <div className={styles.settingsToggleInfo}>
              <Activity size={16} />
              <span>{t('settings.profile.showActivity', 'Показывать мой сетевой статус и активность')}</span>
            </div>
            <button 
              className={`${styles.settingsToggle} ${profile.is_online_public !== false ? styles.settingsToggleActive : ''}`}
              onClick={() => setProfile({ ...profile, is_online_public: profile.is_online_public === false ? true : false })}
            >
              <div className={styles.settingsToggleKnob} />
            </button>
          </div>
        </div>

        <div className={styles.settingsField} style={{ marginTop: '24px' }}>
          <label className={styles.settingsLabel} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={16} className={styles.textAccent} />
            {t('settings.profile.chatSettings', 'Приватность чатов')}
          </label>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--surface-2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                {t('settings.profile.whoCanMessage', 'Кто может вам писать')}
              </label>
              <CustomSelect
                options={[
                  { value: 'everyone', label: t('settings.profile.privacyEveryone', 'Все пользователи') },
                  { value: 'friends_only', label: t('settings.profile.privacyFriends', 'Только друзья') }
                ]}
                value={profile.chat_privacy || 'everyone'}
                onChange={(val) => setProfile({ ...profile, chat_privacy: val as any })}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                {t('settings.profile.messageRetention', 'Хранение сообщений')}
              </label>
              <CustomSelect
                options={[
                  { value: 'forever', label: t('settings.profile.retentionForever', 'Хранить всегда') },
                  { value: '24h', label: t('settings.profile.retention24h', 'Удалять через 24 часа') }
                ]}
                value={profile.message_retention || 'forever'}
                onChange={(val) => setProfile({ ...profile, message_retention: val as any })}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '8px', lineHeight: 1.4 }}>
                {t('settings.profile.retentionHint', 'Если выбрано удаление через 24 часа, старые сообщения не будут загружаться и автоматически скроются.')}
              </p>
            </div>
          </div>
        </div>

        <button className={`${styles.settingsBtn} ${styles.settingsBtnPrimary}`} onClick={handleSaveProfile} style={{ marginTop: '24px' }}>
          <Save size={16} /> {t('settings.profile.save', 'Сохранить профиль')}
        </button>
      </div>
    </motion.section>
  )
}
