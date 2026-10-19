import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Sparkles, Zap, Star } from 'lucide-react'

interface ReportHighlight { type: string; title: string; value: string; details?: string; }

interface Props {
  highlights: ReportHighlight[]
}

export const JournalHighlights = ({ highlights }: Props) => {
  const { t } = useTranslation()

  if (!highlights || highlights.length === 0) return null

  const getIcon = (type: string) => {
    switch (type) {
      case 'rare_achievement': return <Star className="highlight-icon star" size={20} />
      case 'marathon': return <Zap className="highlight-icon zap" size={20} />
      default: return <Sparkles className="highlight-icon sparkle" size={20} />
    }
  }

  return (
    <motion.div 
      className="journal-section highlights-section"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <h3>{t('journal.highlights')}</h3>
      <div className="highlights-grid">
        {highlights.map((hl, idx) => (
          <motion.div 
            key={idx} 
            className="highlight-card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 + (idx * 0.1) }}
          >
            <div className="highlight-icon-wrapper">
              {getIcon(hl.type)}
            </div>
            <div className="highlight-content">
              <span className="highlight-title">{hl.title}</span>
              <span className="highlight-value">{hl.value}</span>
              {hl.details && <span className="highlight-details">{hl.details}</span>}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
