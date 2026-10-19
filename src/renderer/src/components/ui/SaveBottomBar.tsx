import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Save } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import styles from './SaveBottomBar.module.css'

interface SaveBottomBarProps {
  isVisible: boolean
  onSave: () => void
  onCancel: () => void
}

export function SaveBottomBar({ isVisible, onSave, onCancel }: SaveBottomBarProps) {
  const { t } = useTranslation()

  return (
    <AnimatePresence>
      {isVisible && (
        <div className={styles.stickyWrapper}>
          <motion.div 
            className={styles.stickyBar}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
          >
            <span>{t('settings.unsavedChangesText', 'У вас есть несохраненные изменения')}</span>
            <div className={styles.actions}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onCancel}>
                {t('settings.actions.cancel', 'Отменить')}
              </button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onSave}>
                <Save size={16} /> {t('settings.actions.save', 'Сохранить')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
