import React from 'react'
import { motion } from 'framer-motion'
import { Info, Github, Send, Star, ExternalLink, Code2, Terminal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui'
import { APP_VERSION } from '@shared/constants'
import styles from '../../SettingsPage.module.css'
import aboutStyles from './AboutTab.module.css'

interface AboutTabProps {
  fadeUp: any
}

export function AboutTab({ fadeUp }: AboutTabProps): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header Overview Card */}
      <motion.section className={styles.settingsSection} variants={fadeUp}>
        <div className={styles.settingsSectionHeader}>
          <Info size={20} />
          <div className={aboutStyles.titleWrapper}>
            <h2>GAMEMIND AI</h2>
            <Badge variant="muted" size="xs" bracketed className="font-mono">
              v{APP_VERSION} // OPEN SOURCE EDITION
            </Badge>
          </div>
        </div>
        <p className={aboutStyles.description}>
          {t(
            'settings.about.description',
            'Интеллектуальный десктопный компаньон для анализа библиотеки Steam, расчета ДНК игрока и персональных ИИ-рекомендаций. Проект распространяется с открытым исходным кодом.'
          )}
        </p>
      </motion.section>

      {/* Developer & Social Links */}
      <motion.section className={styles.settingsSection} variants={fadeUp}>
        <div className={styles.settingsSectionHeader}>
          <div className={aboutStyles.sectionHeaderRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Code2 size={20} />
              <h2>{t('settings.about.linksTitle', 'Разработчик и ссылки')}</h2>
            </div>
            <span className={aboutStyles.metaTag}>[ CREATOR // LINKS ]</span>
          </div>
        </div>

        <div className={aboutStyles.cardsGrid}>
          {/* Card 1: GitHub Profile */}
          <button
            type="button"
            className={aboutStyles.linkCard}
            onClick={() => window.api.openExternal('https://github.com/lennielan')}
            aria-label="GitHub @lennielan"
          >
            <div className={aboutStyles.cardIconBadge}>
              <Github size={20} />
            </div>
            <div className={aboutStyles.cardContent}>
              <div className={aboutStyles.cardHeader}>
                <span className={aboutStyles.cardTitle}>
                  {t('settings.about.githubTitle', 'GitHub Профиль')}
                </span>
                <span className={aboutStyles.cardTag}>[ @lennielan ]</span>
              </div>
              <span className={aboutStyles.cardSubtitle}>github.com/lennielan</span>
            </div>
            <div className={aboutStyles.cardAction}>
              <ExternalLink size={16} />
            </div>
          </button>

          {/* Card 2: Telegram */}
          <button
            type="button"
            className={aboutStyles.linkCard}
            onClick={() => window.api.openExternal('https://t.me/lkwwxd')}
            aria-label="Telegram @lkwwxd"
          >
            <div className={aboutStyles.cardIconBadge}>
              <Send size={20} />
            </div>
            <div className={aboutStyles.cardContent}>
              <div className={aboutStyles.cardHeader}>
                <span className={aboutStyles.cardTitle}>
                  {t('settings.about.telegramTitle', 'Telegram Автора')}
                </span>
                <span className={aboutStyles.cardTag}>[ @lkwwxd ]</span>
              </div>
              <span className={aboutStyles.cardSubtitle}>t.me/lkwwxd</span>
            </div>
            <div className={aboutStyles.cardAction}>
              <ExternalLink size={16} />
            </div>
          </button>

          {/* Card 3: Source Code Repository (Crimson Accent + Star) */}
          <button
            type="button"
            className={`${aboutStyles.linkCard} ${aboutStyles.linkCardRepo}`}
            onClick={() => window.api.openExternal('https://github.com/lennielan/GameMind_AI')}
            aria-label="GameMind AI GitHub Repository"
          >
            <div className={`${aboutStyles.cardIconBadge} ${aboutStyles.cardIconBadgeRepo}`}>
              <Star size={20} className={aboutStyles.starIcon} />
            </div>
            <div className={aboutStyles.cardContent}>
              <div className={aboutStyles.cardHeader}>
                <span className={aboutStyles.cardTitle}>
                  {t('settings.about.repoTitle', 'Исходный код проекта')}
                </span>
                <span className={aboutStyles.repoActionTag}>
                  <Star size={11} className={aboutStyles.starIconSmall} />
                  {t('settings.about.repoAction', 'Поставить Star')}
                </span>
              </div>
              <span className={aboutStyles.cardSubtitle}>github.com/lennielan/GameMind_AI</span>
            </div>
            <div className={`${aboutStyles.cardAction} ${aboutStyles.cardActionRepo}`}>
              <ExternalLink size={16} />
            </div>
          </button>
        </div>
      </motion.section>

      {/* System Telemetry & Specs */}
      <motion.section className={styles.settingsSection} variants={fadeUp}>
        <div className={styles.settingsSectionHeader}>
          <Terminal size={20} />
          <h2>{t('settings.about.telemetryTitle', 'Системная информация')}</h2>
        </div>

        <div className={aboutStyles.specsGrid}>
          <div className={aboutStyles.specItem}>
            <span className={aboutStyles.specLabel}>{t('settings.about.specCreator', 'Автор проекта')}</span>
            <span className={aboutStyles.specValue}>lennielan (Andrey)</span>
          </div>
          <div className={aboutStyles.specItem}>
            <span className={aboutStyles.specLabel}>{t('settings.about.specLicense', 'Лицензия')}</span>
            <span className={aboutStyles.specValue}>MIT License // Open Source</span>
          </div>
          <div className={aboutStyles.specItem}>
            <span className={aboutStyles.specLabel}>{t('settings.about.specVersion', 'Версия')}</span>
            <span className={aboutStyles.specValue}>v{APP_VERSION}</span>
          </div>
          <div className={aboutStyles.specItem}>
            <span className={aboutStyles.specLabel}>{t('settings.about.specStack', 'Стек технологий')}</span>
            <span className={aboutStyles.specValue}>Electron // React // TypeScript</span>
          </div>
        </div>
      </motion.section>
    </div>
  )
}
