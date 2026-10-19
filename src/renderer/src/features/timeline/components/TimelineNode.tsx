import React from 'react'
import { motion } from 'framer-motion'
import { 
  Crown, 
  Gamepad2, 
  Sparkles, 
  Trophy, 
  Calendar, 
  Flame, 
  Compass, 
  Flag 
} from 'lucide-react'
import type { TimelineEntry, TimelineEntryType } from '@shared/types'

interface TimelineNodeProps {
  entry: TimelineEntry
  index: number
  isHero?: boolean
  children: React.ReactNode
}

const nodeVariants = {
  hidden: { opacity: 0, y: 35, scale: 0.98 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1, 
    transition: { 
      duration: 0.5, 
      ease: [0.22, 1, 0.36, 1] 
    } 
  }
}

export function getNodeIcon(type: TimelineEntryType, title?: string) {
  if (title?.toLowerCase().includes('first step') || title?.toLowerCase().includes('первый шаг')) {
    return <Flag size={15} />
  }
  switch (type) {
    case 'era_summary':
      return <Crown size={16} />
    case 'defining_game':
      return <Gamepad2 size={16} />
    case 'yearly_chapter':
      return <Calendar size={15} />
    case 'milestone':
      return <Trophy size={15} />
    case 'legacy_conclusion':
      return <Compass size={18} />
    case 'alternate_history':
      return <Sparkles size={15} />
    default:
      return <Flame size={15} />
  }
}

export function getNodeTypeTheme(type: TimelineEntryType): {
  badgeColor: string
  glowColor: string
  borderColor: string
} {
  switch (type) {
    case 'era_summary':
      return {
        badgeColor: 'var(--warning, #fbbf24)',
        glowColor: 'var(--warning-subtle, rgba(251, 191, 36, 0.25))',
        borderColor: 'rgba(251, 191, 36, 0.4)'
      }
    case 'defining_game':
      return {
        badgeColor: 'var(--accent-primary)',
        glowColor: 'var(--accent-glow)',
        borderColor: 'rgba(var(--accent-primary-rgb), 0.5)'
      }
    case 'yearly_chapter':
      return {
        badgeColor: 'var(--info, #60a5fa)',
        glowColor: 'var(--info-subtle, rgba(96, 165, 250, 0.25))',
        borderColor: 'rgba(96, 165, 250, 0.4)'
      }
    case 'milestone':
      return {
        badgeColor: 'var(--success, #34d399)',
        glowColor: 'var(--success-subtle, rgba(52, 211, 153, 0.25))',
        borderColor: 'rgba(52, 211, 153, 0.4)'
      }
    case 'legacy_conclusion':
      return {
        badgeColor: 'var(--accent-primary)',
        glowColor: 'var(--accent-glow)',
        borderColor: 'var(--accent-primary)'
      }
    default:
      return {
        badgeColor: 'var(--text-secondary)',
        glowColor: 'rgba(255, 255, 255, 0.1)',
        borderColor: 'var(--border-default)'
      }
  }
}

export function TimelineNode({ entry, index, isHero = false, children }: TimelineNodeProps): React.JSX.Element {
  // Center heroes/legacy conclusions, otherwise alternate left/right
  const side: 'left' | 'right' | 'center' = isHero || entry.type === 'legacy_conclusion'
    ? 'center' 
    : index % 2 === 0 ? 'left' : 'right'

  const theme = getNodeTypeTheme(entry.type)
  const icon = getNodeIcon(entry.type, entry.title)

  const dateStr = entry.date 
    ? new Date(entry.date).toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: entry.type === 'yearly_chapter' ? undefined : 'short' 
      }) 
    : ''

  return (
    <motion.div 
      className={`timeline-node timeline-node--${side} timeline-node--${entry.type}`}
      variants={nodeVariants}
    >
      {/* Central Spine Marker */}
      {side !== 'center' && (
        <div 
          className="timeline-node__marker"
          style={{ 
            color: theme.badgeColor,
            borderColor: theme.borderColor,
            boxShadow: `0 0 16px ${theme.glowColor}`
          }}
        >
          <div className="timeline-node__marker-inner">
            {icon}
          </div>
          {/* Connector Line to Card */}
          <div 
            className={`timeline-node__connector timeline-node__connector--${side}`}
            style={{ 
              background: `linear-gradient(to ${side === 'left' ? 'left' : 'right'}, ${theme.badgeColor}, transparent)` 
            }}
          />
        </div>
      )}

      {/* Date Pill above Card on Mobile / Desktop */}
      {dateStr && side !== 'center' && (
        <div className={`timeline-node__date-tag timeline-node__date-tag--${side}`}>
          <span>{dateStr}</span>
        </div>
      )}

      {/* Actual Card Body */}
      <div className="timeline-node__card-wrapper">
        {children}
      </div>
    </motion.div>
  )
}
