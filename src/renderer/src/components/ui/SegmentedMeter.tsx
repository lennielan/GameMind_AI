import React, { useEffect, useState, useId } from 'react'
import styles from './SegmentedMeter.module.css'

export type MeterAccent = 'current' | 'white' | 'emerald' | 'crimson' | 'azure' | 'violet'
export type MeterSize = 'sm' | 'md' | 'lg'

export interface SegmentedMeterProps {
  value: number
  max?: number
  segments?: number
  leftLabel?: string
  rightLabel?: string
  showValue?: boolean
  formatValue?: (val: number) => string
  accentColor?: MeterAccent
  size?: MeterSize
  animated?: boolean
  interactive?: boolean
  onChange?: (val: number) => void
  className?: string
  style?: React.CSSProperties
  'aria-label'?: string
}

export function SegmentedMeter({
  value,
  max = 100,
  segments = 20,
  leftLabel,
  rightLabel,
  showValue = true,
  formatValue,
  accentColor = 'current',
  size = 'md',
  animated = true,
  interactive = false,
  onChange,
  className = '',
  style,
  'aria-label': ariaLabel
}: SegmentedMeterProps): React.JSX.Element {
  const meterId = useId()
  const clampedValue = Math.max(0, Math.min(max, value))
  const targetActiveCount = Math.round((clampedValue / max) * segments)

  const [activeCount, setActiveCount] = useState<number>(animated ? 0 : targetActiveCount)

  useEffect(() => {
    if (!animated) {
      setActiveCount(targetActiveCount)
      return
    }

    // Step-wise digital fill
    if (activeCount === targetActiveCount) return

    const step = activeCount < targetActiveCount ? 1 : -1
    const timer = setTimeout(() => {
      setActiveCount((prev) => prev + step)
    }, 18)

    return () => clearTimeout(timer)
  }, [activeCount, targetActiveCount, animated])

  const percentage = Math.round((clampedValue / max) * 100)
  const displayValue = formatValue ? formatValue(clampedValue) : `${percentage}%`

  const accentClassMap: Record<MeterAccent, string> = {
    current: '',
    white: styles.accentWhite,
    emerald: styles.accentEmerald,
    crimson: styles.accentCrimson,
    azure: styles.accentAzure,
    violet: styles.accentViolet
  }

  const sizeClassMap: Record<MeterSize, string> = {
    sm: styles.sizeSm,
    md: styles.sizeMd,
    lg: styles.sizeLg
  }

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (!interactive || !onChange) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const ratio = Math.max(0, Math.min(1, clickX / rect.width))
    const newValue = Math.round(ratio * max)
    onChange(newValue)
  }

  return (
    <div
      className={`${styles.container} ${sizeClassMap[size]} ${accentClassMap[accentColor]} ${className}`}
      style={style}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={ariaLabel || leftLabel || 'Metric Meter'}
    >
      {leftLabel && (
        <span className={styles.labelTag}>
          <span className={styles.bracket}>[ </span>
          <span>{leftLabel}</span>
          <span className={styles.bracket}> ]</span>
        </span>
      )}

      <div
        className={`${styles.track} ${interactive ? styles.trackInteractive : ''}`}
        onClick={handleTrackClick}
        title={interactive ? `${clampedValue} / ${max}` : undefined}
      >
        {Array.from({ length: segments }).map((_, index) => {
          const isActive = index < activeCount
          return (
            <div
              key={`${meterId}-seg-${index}`}
              className={`${styles.segment} ${isActive ? styles.segmentActive : ''}`}
            />
          )
        })}
      </div>

      {showValue && (
        <span className={styles.valueTag}>
          <span className={styles.bracket}>[ </span>
          <span>{displayValue}</span>
          <span className={styles.bracket}> ]</span>
        </span>
      )}

      {rightLabel && (
        <span className={styles.labelTag}>
          <span className={styles.bracket}>[ </span>
          <span>{rightLabel}</span>
          <span className={styles.bracket}> ]</span>
        </span>
      )}
    </div>
  )
}
