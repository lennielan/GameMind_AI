import React from 'react'
import * as Icons from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LegendIcon } from './LegendIcon'

interface BadgeIconProps {
  iconName: string
  color: string
  size?: number
  className?: string
  nameKey?: string
  descKey?: string
  locked?: boolean
}

export function BadgeIcon({
  iconName,
  color,
  size = 20,
  className = '',
  nameKey,
  descKey,
  locked = false
}: BadgeIconProps) {
  const { t } = useTranslation()

  // Custom AI Core icon for Legend badge / Sparkles eradication
  const isLegend = iconName === 'LegendIcon' || iconName === 'legend' || iconName === 'Sparkles'
  const IconComponent = isLegend ? LegendIcon : ((Icons as any)[iconName] || Icons.HelpCircle)

  const titleText = nameKey
    ? `${t(nameKey, nameKey)}${descKey ? `\n${t(descKey, descKey)}` : ''}${locked ? `\n(${t('badges.locked', 'Заблокировано')})` : ''}`
    : undefined

  return (
    <div
      title={titleText}
      className={`relative inline-flex items-center justify-center rounded-full p-2 transition-transform hover:scale-110 cursor-help ${
        locked ? 'opacity-40 grayscale' : ''
      } ${className}`}
      style={{
        backgroundColor: locked ? 'rgba(255, 255, 255, 0.05)' : `${color}20`,
        color: locked ? '#888' : color,
        border: `1px solid ${locked ? 'rgba(255, 255, 255, 0.1)' : `${color}40`}`,
        borderRadius: '50%',
        boxShadow: locked ? 'none' : `0 0 12px ${color}30`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size + 16}px`,
        height: `${size + 16}px`,
        flexShrink: 0
      }}
    >
      <IconComponent size={size} strokeWidth={2} />
    </div>
  )
}
