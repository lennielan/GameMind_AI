import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { WifiOff, RotateCw, Wifi, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import styles from './OfflineOverlay.module.css'

export function OfflineOverlay(): React.JSX.Element {
  const { t } = useTranslation()
  const [isChecking, setIsChecking] = useState(false)

  const handleRetry = async (): Promise<void> => {
    if (isChecking) return
    setIsChecking(true)

    const isConnected = await new Promise<boolean>((resolve) => {
      if (!navigator.onLine) {
        resolve(false)
        return
      }

      const img = new Image()
      let settled = false

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true
          img.src = ''
          resolve(false)
        }
      }, 3500)

      img.onload = () => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          resolve(true)
        }
      }

      img.onerror = () => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          resolve(false)
        }
      }

      img.src = `https://media.steampowered.com/favicon.ico?_t=${Date.now()}`
    })

    if (isConnected) {
      toast.success(t('offline.reconnected', 'Соединение восстановлено!'))
      setTimeout(() => {
        window.location.reload()
      }, 400)
    } else {
      setTimeout(() => {
        setIsChecking(false)
        toast.error(t('offline.stillOffline', 'Сеть пока недоступна. Пожалуйста, подключитесь к интернету и повторите попытку.'))
      }, 500)
    }
  }

  return (
    <div className={styles.overlayContainer}>
      {/* Background ambient lighting */}
      <div className={styles.ambientGlowTop} />
      <div className={styles.ambientGlowBottom} />

      <motion.div
        className={styles.overlayCard}
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* Status Pill with smooth pulse */}
        <div className={styles.statusBadge}>
          <span className={styles.statusDot} />
          <span className={styles.statusText}>{t('offline.status', 'Офлайн-режим')}</span>
        </div>

        {/* Multi-layered Network Disconnection Icon */}
        <div className={styles.iconOuterWrapper}>
          <div className={styles.iconRadarRing} />
          <div className={styles.iconCoreContainer}>
            <div className={styles.iconGlow} />
            <WifiOff className={styles.iconMain} strokeWidth={2} />
          </div>
          <div className={styles.iconSlashBadge}>
            <span className={styles.iconSlashDot} />
          </div>
        </div>

        {/* Title & Clear Description */}
        <h1 className={styles.title}>
          {t('offline.title', 'Требуется подключение к интернету')}
        </h1>

        <p className={styles.description}>
          {t('offline.description', 'GameMind AI работает в реальном времени и не может функционировать без сети. Для запуска и работы приложения необходимо активное интернет-соединение.')}
        </p>

        {/* Actionable Tips Card */}
        <div className={styles.tipsCard}>
          <div className={styles.tipRow}>
            <ShieldAlert size={16} className={styles.tipIcon} />
            <span className={styles.tipText}>
              {t('offline.tipRequired', 'Приложение возобновит работу автоматически сразу после подключения к сети.')}
            </span>
          </div>
          <div className={styles.tipRow}>
            <Wifi size={16} className={styles.tipIconInfo} />
            <span className={styles.tipText}>
              {t('offline.tipAction', 'Проверьте сетевой кабель, Wi-Fi соединение или настройки роутера.')}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className={styles.actions}>
          <button
            className={styles.retryButton}
            onClick={handleRetry}
            disabled={isChecking}
          >
            <RotateCw size={16} className={isChecking ? styles.spinIcon : ''} />
            <span>
              {isChecking
                ? t('offline.checking', 'Проверка сети...')
                : t('offline.retry', 'Проверить подключение')}
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}
