import React from 'react'
import styles from './Badge.module.css'

export type BadgeVariant = 'default' | 'outline' | 'accent' | 'success' | 'warning' | 'danger' | 'muted'
export type BadgeSize = 'xs' | 'sm' | 'md'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  bracketed?: boolean
  dot?: boolean
  pulseDot?: boolean
  prefix?: string
  className?: string
  style?: React.CSSProperties
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  bracketed = false,
  dot = false,
  pulseDot = false,
  prefix,
  className = '',
  style,
  ...rest
}: BadgeProps): React.JSX.Element {
  const sizeClass = size === 'xs' ? styles.sizeXs : size === 'md' ? styles.sizeMd : styles.sizeSm

  const variantClassMap: Record<BadgeVariant, string> = {
    default: styles.variantDefault,
    outline: styles.variantOutline,
    accent: styles.variantAccent,
    success: styles.variantSuccess,
    warning: styles.variantWarning,
    danger: styles.variantDanger,
    muted: styles.variantMuted
  }

  const variantClass = variantClassMap[variant] || styles.variantDefault

  return (
    <span
      className={`${styles.badge} ${sizeClass} ${variantClass} ${className}`}
      style={style}
      {...rest}
    >
      {bracketed && <span className={styles.bracket}>[ </span>}
      {dot && <span className={`${styles.dot} ${pulseDot ? styles.dotPulse : ''}`} aria-hidden="true" />}
      {prefix && <span className={styles.prefix}>{prefix} </span>}
      <span className={styles.content}>{children}</span>
      {bracketed && <span className={styles.bracket}> ]</span>}
    </span>
  )
}
