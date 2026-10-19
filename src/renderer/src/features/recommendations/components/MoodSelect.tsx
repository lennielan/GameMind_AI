import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  ChevronDown,
  SlidersHorizontal,
  Rocket,
  Flame,
  Users,
  Coffee,
  BookOpen,
  Trophy,
  Check,
  type LucideIcon
} from 'lucide-react'
import styles from './MoodSelect.module.css'

interface MoodSelectProps {
  value: string
  onChange: (value: string) => void
  emptyState?: boolean
}

interface MoodItemConfig {
  value: string
  icon: LucideIcon
  labelKey: string
  descKey: string
  fallbackLabel: string
  fallbackDesc: string
}

const MOOD_CONFIG: MoodItemConfig[] = [
  {
    value: 'none',
    icon: SlidersHorizontal,
    labelKey: 'recommendations.moods.any',
    descKey: 'recommendations.moodDescriptions.any',
    fallbackLabel: 'Любое',
    fallbackDesc: 'Баланс всех направлений'
  },
  {
    value: 'new',
    icon: Rocket,
    labelKey: 'recommendations.moods.new',
    descKey: 'recommendations.moodDescriptions.new',
    fallbackLabel: 'Что-то новое',
    fallbackDesc: 'Свежие концепты и инди-хиты'
  },
  {
    value: 'hard',
    icon: Flame,
    labelKey: 'recommendations.moods.hard',
    descKey: 'recommendations.moodDescriptions.hard',
    fallbackLabel: 'Сложная игра',
    fallbackDesc: 'Челлендж, хардкор и глубина'
  },
  {
    value: 'friends',
    icon: Users,
    labelKey: 'recommendations.moods.friends',
    descKey: 'recommendations.moodDescriptions.friends',
    fallbackLabel: 'С друзьями',
    fallbackDesc: 'Кооператив и мультиплеер'
  },
  {
    value: 'relax',
    icon: Coffee,
    labelKey: 'recommendations.moods.relax',
    descKey: 'recommendations.moodDescriptions.relax',
    fallbackLabel: 'Расслабиться',
    fallbackDesc: 'Уютные и медитативные игры'
  },
  {
    value: 'story',
    icon: BookOpen,
    labelKey: 'recommendations.moods.story',
    descKey: 'recommendations.moodDescriptions.story',
    fallbackLabel: 'Сильный сюжет',
    fallbackDesc: 'Глубокий нарратив и лор'
  },
  {
    value: 'completionist',
    icon: Trophy,
    labelKey: 'recommendations.moods.completionist',
    descKey: 'recommendations.moodDescriptions.completionist',
    fallbackLabel: 'На 100%',
    fallbackDesc: 'Большие миры и достижения'
  }
]

export function MoodSelect({ value, onChange, emptyState = false }: MoodSelectProps): React.JSX.Element {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const selectedItem = MOOD_CONFIG.find(m => m.value === value) || MOOD_CONFIG[0]
  const SelectedIcon = selectedItem.icon

  const getSelectedLabel = () => {
    if (selectedItem.value === 'none' && emptyState) {
      return t('recommendations.moods.none', 'Не учитывать настроение')
    }
    return t(selectedItem.labelKey, selectedItem.fallbackLabel)
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        className={`${styles.trigger} ${emptyState ? styles.triggerEmpty : ''} ${isOpen ? styles.triggerOpen : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        aria-expanded={isOpen}
      >
        <span className={styles.triggerPrefix}>
          {emptyState ? t('recommendations.moodSelectLabel', 'Выбрать настроение:') : t('recommendations.moodLabel', 'Настроение:')}
        </span>
        <div className={styles.triggerSelectedWrap}>
          <div className={styles.triggerIconBadge}>
            <SelectedIcon size={12} />
          </div>
          <span className={styles.triggerValue}>{getSelectedLabel()}</span>
        </div>
        <ChevronDown size={16} className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={`${styles.dropdown} ${emptyState ? styles.dropdownEmpty : ''}`}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {MOOD_CONFIG.map((opt) => {
              const isSelected = value === opt.value
              const IconComponent = opt.icon
              const label = (opt.value === 'none' && emptyState)
                ? t('recommendations.moods.none', 'Не учитывать настроение')
                : t(opt.labelKey, opt.fallbackLabel)
              const description = t(opt.descKey, opt.fallbackDesc)

              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}
                  onClick={() => {
                    onChange(opt.value)
                    setIsOpen(false)
                  }}
                >
                  <div className={styles.optionIconBadge}>
                    <IconComponent size={16} />
                  </div>
                  <div className={styles.optionContent}>
                    <span className={styles.optionTitle}>{label}</span>
                    <span className={styles.optionDescription}>{description}</span>
                  </div>
                  {isSelected && <Check size={16} className={styles.checkIcon} />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
