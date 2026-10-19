import React from 'react'
import { useTranslation } from 'react-i18next'
import { Zap, Check, AlertTriangle, Cpu } from 'lucide-react'
import styles from './HardwareBadge.module.css'

interface HardwareBadgeProps {
  evaluation?: string | null
  className?: string
  style?: React.CSSProperties
}

export function HardwareBadge({ evaluation, className = '', style }: HardwareBadgeProps): React.JSX.Element | null {
  const { t } = useTranslation()

  if (!evaluation) return null
  const trimmed = evaluation.trim()

  // 1. High Performance (Zap icon)
  if (
    trimmed.includes('Runs on High') ||
    trimmed.includes('Runs on Ultra') ||
    trimmed.includes('Пойдет на высоких')
  ) {
    return (
      <div className={`${styles.badge} ${styles.badgeHigh} ${className}`} style={style}>
        <Zap size={12} className={styles.icon} />
        <span>{t('recommendations.hardware.runsOnHigh', 'Пойдет на высоких')}</span>
      </div>
    )
  }

  // 2. Fine / Optimal (Check icon)
  if (
    trimmed.includes('Runs Fine') ||
    trimmed.includes('Runs Smoothly') ||
    trimmed.includes('Runs Well') ||
    trimmed.includes('Пойдет отлично')
  ) {
    return (
      <div className={`${styles.badge} ${styles.badgeFine} ${className}`} style={style}>
        <Check size={12} className={styles.icon} />
        <span>{t('recommendations.hardware.runsFine', 'Пойдет отлично')}</span>
      </div>
    )
  }

  // 3. Might Struggle / Heavy (AlertTriangle icon)
  if (
    trimmed.includes('Might struggle') ||
    trimmed.includes('May struggle') ||
    trimmed.includes('Low Settings') ||
    trimmed.includes('Возможны просадки')
  ) {
    return (
      <div className={`${styles.badge} ${styles.badgeStruggle} ${className}`} style={style}>
        <AlertTriangle size={12} className={styles.icon} />
        <span>{t('recommendations.hardware.mightStruggle', 'Возможны просадки')}</span>
      </div>
    )
  }

  // 4. Fallback for custom evaluations (clean emojis if any)
  const cleanLabel = trimmed.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]+\s*/u, '')

  return (
    <div className={`${styles.badge} ${styles.badgeDefault} ${className}`} style={style}>
      <Cpu size={12} className={styles.icon} />
      <span>{cleanLabel}</span>
    </div>
  )
}
