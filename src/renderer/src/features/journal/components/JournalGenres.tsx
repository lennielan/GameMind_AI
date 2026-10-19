import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

interface GenreDistribution { genre: string; percent: number; }

interface Props {
  genres: GenreDistribution[]
}

export const JournalGenres = ({ genres }: Props) => {
  const { t } = useTranslation()

  if (!genres || genres.length === 0) return null

  return (
    <motion.div 
      className="journal-section genres-section"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <h3>{t('journal.genres_title')}</h3>
      <div className="genres-list">
        {genres.map((genre, idx) => (
          <motion.div 
            key={genre.genre} 
            className="genre-tag"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + (idx * 0.05) }}
          >
            <span className="genre-name">{genre.genre}</span>
            <span className="genre-percent">{genre.percent}%</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
