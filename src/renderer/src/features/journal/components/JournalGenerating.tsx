import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

export const JournalGenerating = () => {
  const { t } = useTranslation()

  return (
    <motion.div 
      className="journal-generating"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="generating-content"
        animate={{ scale: [0.95, 1.05, 0.95] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
        >
          <Loader2 className="spinning-icon" size={48} />
        </motion.div>
        <h2>{t('journal.generating')}</h2>
        <p>{t('journal.generatingSubtitle')}</p>
      </motion.div>
    </motion.div>
  )
}
