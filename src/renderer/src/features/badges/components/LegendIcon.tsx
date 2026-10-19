import React from 'react'

interface LegendIconProps {
  size?: number
  className?: string
  style?: React.CSSProperties
  color?: string
}

/**
 * Bespoke Legendary AI Core emblem (Игровое Нейро-Ядро ИИ — Легенда)
 * Clean cybernetic geometry with neural node and data bus conduits.
 * Strictly NO generic stars, sparkles or emojis.
 */
export function LegendIcon({ size = 20, className = '', style, color = 'currentColor' }: LegendIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    >
      {/* Outer Cybernetic Diamond / Hex-Housing */}
      <path
        d="M12 2L21.5 7.5V16.5L12 22L2.5 16.5V7.5L12 2Z"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.9"
      />

      {/* Inner Faceted Neural Rhombus */}
      <path
        d="M12 6L18 12L12 18L6 12L12 6Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.75"
      />

      {/* Central Quantum Processing Node */}
      <rect
        x="10"
        y="10"
        width="4"
        height="4"
        rx="1"
        fill={color}
      />

      {/* Neural Data Bus Conduits */}
      <path
        d="M12 2V6M12 18V22M2.5 12H6M18 12H21.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.85"
      />

      {/* Corner Micro-Sensors */}
      <circle cx="12" cy="2" r="1" fill={color} />
      <circle cx="21.5" cy="7.5" r="1" fill={color} />
      <circle cx="21.5" cy="16.5" r="1" fill={color} />
      <circle cx="12" cy="22" r="1" fill={color} />
      <circle cx="2.5" cy="16.5" r="1" fill={color} />
      <circle cx="2.5" cy="7.5" r="1" fill={color} />
    </svg>
  )
}
