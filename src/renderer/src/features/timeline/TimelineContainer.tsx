import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Layers, Crown, Gamepad2, Filter } from 'lucide-react'
import type { TimelineEntry } from '@shared/types'
import { TimelineNode } from './components/TimelineNode'
import { EpochCard } from './components/EpochCard'
import { MilestoneCard } from './components/MilestoneCard'
import { MicroEventCard } from './components/MicroEventCard'
import { LegacyCard } from './components/LegacyCard'

interface TimelineContainerProps {
  entries: TimelineEntry[]
  getLocalizedTitle: (entry: TimelineEntry) => string
  getFlavorText: (t: any, type: 'game' | 'era', seedString: string, hours: number, gameName: string) => string
}

type FilterType = 'all' | 'eras' | 'games'

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1
    }
  }
}

export function TimelineContainer({
  entries,
  getLocalizedTitle,
  getFlavorText
}: TimelineContainerProps): React.JSX.Element {
  const { t } = useTranslation()
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  const filteredEntries = useMemo(() => {
    if (activeFilter === 'eras') {
      return entries.filter(e => e.type === 'era_summary' || e.type === 'legacy_conclusion')
    }
    if (activeFilter === 'games') {
      return entries.filter(e => e.type === 'defining_game' || e.type === 'milestone')
    }
    return entries
  }, [entries, activeFilter])

  const renderCardContent = (entry: TimelineEntry) => {
    switch (entry.type) {
      case 'legacy_conclusion':
        return <LegacyCard entry={entry} getLocalizedTitle={getLocalizedTitle} />
      case 'era_summary':
        return (
          <EpochCard 
            entry={entry} 
            getLocalizedTitle={getLocalizedTitle} 
            getFlavorText={getFlavorText} 
          />
        )
      case 'defining_game':
        return (
          <MilestoneCard 
            entry={entry} 
            getFlavorText={getFlavorText} 
          />
        )
      case 'yearly_chapter':
      case 'milestone':
      default:
        return (
          <MicroEventCard 
            entry={entry} 
            getLocalizedTitle={getLocalizedTitle} 
          />
        )
    }
  }

  return (
    <div className="timeline-container">
      {/* Quick Filter Strip */}
      <div className="timeline-filters">
        <div className="timeline-filters__label">
          <Filter size={14} />
          <span>{t('timeline.filterLabel', 'Фильтр:')}</span>
        </div>

        <button
          className={`timeline-filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          <Layers size={14} />
          <span>{t('timeline.filterAll', 'Все события')}</span>
          <span className="timeline-filter-badge">{entries.length}</span>
        </button>

        <button
          className={`timeline-filter-btn ${activeFilter === 'eras' ? 'active' : ''}`}
          onClick={() => setActiveFilter('eras')}
        >
          <Crown size={14} />
          <span>{t('timeline.filterEras', 'Эпохи')}</span>
        </button>

        <button
          className={`timeline-filter-btn ${activeFilter === 'games' ? 'active' : ''}`}
          onClick={() => setActiveFilter('games')}
        >
          <Gamepad2 size={14} />
          <span>{t('timeline.filterGames', 'Знаковые игры')}</span>
        </button>
      </div>

      {/* Main Alternating Feed with Central Spine */}
      <div className="timeline-spine-wrapper">
        {/* Glowing Central Line */}
        <div className="timeline-spine" />

        <motion.div 
          className="timeline-nodes-list"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {filteredEntries.map((entry, index) => {
            const isHero = entry.type === 'legacy_conclusion'
            return (
              <TimelineNode 
                key={entry.id} 
                entry={entry} 
                index={index} 
                isHero={isHero}
              >
                {renderCardContent(entry)}
              </TimelineNode>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}
