import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'
import styles from './CustomSelect.module.css'

export interface SelectOption {
  value: string
  label: string
}

interface CustomSelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  style?: React.CSSProperties
  containerStyle?: React.CSSProperties
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder,
  style,
  containerStyle
}: CustomSelectProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
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

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div className={styles.selectContainer} ref={containerRef} style={containerStyle}>
      <button
        type="button"
        className={`${styles.selectTrigger} ${isOpen ? styles.selectTriggerOpen : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        style={style}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder || value}
        </span>
        <ChevronDown
          size={16}
          className={`${styles.chevronIcon} ${isOpen ? styles.chevronIconOpen : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.dropdownMenu}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {options.map((opt) => {
              const isSelected = opt.value === value
              return (
                <div
                  key={opt.value}
                  className={`${styles.dropdownOption} ${isSelected ? styles.dropdownOptionSelected : ''}`}
                  onClick={() => handleSelect(opt.value)}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check size={14} className={styles.checkIcon} />}
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
