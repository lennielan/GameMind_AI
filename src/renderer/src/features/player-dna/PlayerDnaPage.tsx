import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Dna, Loader2, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import './PlayerDnaPage.css'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

export function PlayerDnaPage(): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  
  const [dnaData, setDnaData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDna()
  }, [])

  const loadDna = async () => {
    setIsLoading(true)
    try {
      const res = await window.api.getDna()
      if (res.success && res.data) {
        setDnaData(res.data)
      }
    } catch (e) {
      console.error('Failed to load DNA', e)
    } finally {
      setIsLoading(false)
    }
  }

  const generateDna = async () => {
    setIsGenerating(true)
    setError(null)
    try {
      const res = await window.api.generateDna()
      if (res.success) {
        await loadDna()
      } else {
        setError(res.error || 'Failed to generate DNA')
        if (res.error?.includes('API key')) {
          // Provide a quick link to settings
          setTimeout(() => navigate('/settings'), 3000)
        }
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred')
    } finally {
      setIsGenerating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="dna-page dna-page--centered">
        <Loader2 className="spinner" size={40} />
        <p>{t('dna.loading')}</p>
      </div>
    )
  }

  if (!dnaData) {
    return (
      <div className="dna-page dna-page--centered">
        <motion.div className="dna-empty" variants={fadeUp} initial="hidden" animate="show">
          <div className="dna-empty__icon">
            <Dna size={64} />
          </div>
          <h1 className="dna-empty__title">{t('dna.emptyTitle')}</h1>
          <p className="dna-empty__description">
            {t('dna.emptyDescription')}
          </p>
          
          {error && (
            <div className="dna-error">
              {error}
            </div>
          )}

          <button 
            className="dna-empty__btn"
            onClick={generateDna}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="spinner" size={20} />
                {t('dna.generating')}
              </>
            ) : (
              <>
                <Sparkles size={20} />
                {t('dna.generateBtn')}
              </>
            )}
          </button>
        </motion.div>
      </div>
    )
  }

  const { summary, traits } = dnaData

  return (
    <motion.div 
      className="dna-page"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      <motion.div className="dna-header" variants={fadeUp}>
        <div className="dna-header__content">
          <div className="dna-badge">{t('dna.badge')}</div>
          <h1 className="dna-persona">{summary.persona}</h1>
          <p className="dna-description">{summary.description}</p>
        </div>
        <div className="dna-header__illustration">
          <Dna size={120} className="dna-illustration-icon" />
        </div>
      </motion.div>

      <div className="dna-grid">
        <motion.div className="dna-card dna-card--traits" variants={fadeUp}>
          <h2 className="dna-card__title">{t('dna.coreTraits')}</h2>
          <div className="dna-traits-list">
            {traits.map((trait: any) => (
              <div key={trait.id} className="dna-trait">
                <div className="dna-trait__header">
                  <span className="dna-trait__name">{trait.traitName}</span>
                  <span className="dna-trait__value">{trait.traitValue}%</span>
                </div>
                <div className="dna-trait__bar">
                  <motion.div 
                    className="dna-trait__fill" 
                    initial={{ width: 0 }}
                    animate={{ width: `${trait.traitValue}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
                <p className="dna-trait__reasoning">{trait.reasoning}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className="dna-card dna-card--details" variants={fadeUp}>
          <h2 className="dna-card__title">{t('dna.topGenres')}</h2>
          <div className="dna-genres">
            {summary.topGenres.map((genre: string, idx: number) => (
              <span key={idx} className="dna-genre-tag">{genre}</span>
            ))}
          </div>
          
          <h2 className="dna-card__title" style={{ marginTop: 'var(--space-6)' }}>{t('dna.playstyle')}</h2>
          <p className="dna-playstyle">{summary.playstyle}</p>
          
          <button 
            className="dna-regenerate-btn"
            onClick={generateDna}
            disabled={isGenerating}
          >
            {isGenerating ? <Loader2 className="spinner" size={16} /> : <Dna size={16} />}
            {t('dna.regenerate')}
          </button>
        </motion.div>
      </div>
    </motion.div>
  )
}
