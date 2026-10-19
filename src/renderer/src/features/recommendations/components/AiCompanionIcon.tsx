import React from 'react'

interface AiCompanionIconProps {
  size?: number
  className?: string
  style?: React.CSSProperties
  color?: string
  variant?: 'hero' | 'core'
}

/**
 * Bespoke Gaming AI Companion emblem for Recommendations feature
 * High-tech neural geometry, quantum core, and cybernetic locator lines.
 * Strictly NO generic stars, sparkles, or emojis.
 */
export function AiCompanionIcon({
  size = 20,
  className = '',
  style,
  color = 'currentColor',
  variant
}: AiCompanionIconProps) {
  const isHero = variant === 'hero' || (variant === undefined && size >= 48)

  if (isHero) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      >
        {/* Outer Precision Radar Guide */}
        <circle cx="32" cy="32" r="28" stroke={color} strokeWidth="1.5" strokeOpacity="0.2" strokeDasharray="4 4" />
        
        {/* Cardinal Locator Ticks */}
        <path d="M32 2V8M32 56V62M2 32H8M56 32H62" stroke={color} strokeWidth="2" strokeLinecap="round" />

        {/* Outer Hexagonal AI Shield */}
        <path
          d="M32 10L51 21V43L32 54L13 43V21L32 10Z"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.85"
        />

        {/* Inner Diamond Neural Rhombus */}
        <path
          d="M32 18L44 32L32 46L20 32L32 18Z"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.7"
        />

        {/* Central Quantum Processing Core */}
        <rect x="28" y="28" width="8" height="8" rx="2" fill={color} />

        {/* Diagonal Cross-Sensor Nodes */}
        <circle cx="21" cy="21" r="2" fill={color} fillOpacity="0.9" />
        <circle cx="43" cy="21" r="2" fill={color} fillOpacity="0.9" />
        <circle cx="43" cy="43" r="2" fill={color} fillOpacity="0.9" />
        <circle cx="21" cy="43" r="2" fill={color} fillOpacity="0.9" />

        {/* Cross Data Bus Lines */}
        <path d="M32 10V18M32 46V54M13 32H20M44 32H51" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    )
  }

  // Compact Core variant (for buttons, pills, section badges)
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
      {/* Outer Cybernetic Diamond / Core */}
      <path
        d="M12 2L20.5 7V17L12 22L3.5 17V7L12 2Z"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Inner Neural Diamond */}
      <path
        d="M12 6.5L16.5 12L12 17.5L7.5 12L12 6.5Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.75"
      />

      {/* Central Processing Node */}
      <rect x="10.5" y="10.5" width="3" height="3" rx="0.75" fill={color} />

      {/* Cardinal Data Bus Conduits */}
      <path d="M12 2V4.5M12 19.5V22M3.5 12H6M18 12H20.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
