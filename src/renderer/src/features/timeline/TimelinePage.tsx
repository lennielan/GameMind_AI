import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2, Sparkles, Compass, History } from 'lucide-react'
import type { TimelineEntry } from '@shared/types'
import { toast } from 'sonner'
import { AiUsageLimitModal } from '../../components/ai/AiUsageLimitModal'
import { useAiUsage } from '../../hooks/useAiUsage'
import { TimelineContainer } from './TimelineContainer'
import './TimelinePage.css'

const fadeUp = {
  hidden: { opacity: 0, y: 25 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.5, 
      ease: [0.22, 1, 0.36, 1] 
    } 
  }
}

const definingGamePhrases = [
  "timeline.phrases.defining1",
  "timeline.phrases.defining2",
  "timeline.phrases.defining3",
  "timeline.phrases.defining4",
  "timeline.phrases.defining5"
]

const eraPhrases = [
  "timeline.phrases.era1",
  "timeline.phrases.era2",
  "timeline.phrases.era3",
  "timeline.phrases.era4"
]

function getFlavorText(
  t: any, 
  type: 'game' | 'era', 
  seedString: string, 
  hours: number, 
  gameName: string
): string {
  let hash = 0
  for (let i = 0; i < seedString.length; i++) {
    hash = seedString.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  if (type === 'game') {
    const index = Math.abs(hash) % definingGamePhrases.length
    return t(definingGamePhrases[index], { 
      defaultValue: "Вы провели в этой игре {{hours}} часов. Настоящая классика вашей личной библиотеки.", 
      hours, 
      game: gameName 
    })
  } else {
    const index = Math.abs(hash) % eraPhrases.length
    return t(eraPhrases[index], { 
      defaultValue: "Этот период стал фундаментом вашего игрового вкуса. Настоящая золотая эра.", 
      hours, 
      game: gameName 
    })
  }
}

export function TimelinePage(): React.JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const { usage, refreshUsage } = useAiUsage()
  const [limitStatus, setLimitStatus] = useState<any>(null)

  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    fetchTimeline()
  }, [])

  const fetchTimeline = async () => {
    setLoading(true)
    try {
      const [res, statsRes] = await Promise.all([
        window.api.getTimeline(),
        window.api.getStats().catch(() => ({ success: false, data: null }))
      ])
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data)
      }
      if (res.success && res.data) {
        setEntries(res.data)
      }
    } catch (e) {
      console.error('Failed to fetch timeline', e)
    } finally {
      setLoading(false)
    }
  }

  const getLocalizedTitle = (entry: TimelineEntry) => {
    if (entry.type === 'yearly_chapter') {
      const year = new Date(entry.date).getFullYear()
      return t('timeline.yearlyTitle', '{{year}} год в обзоре', { year })
    }
    if (entry.type === 'era_summary' && entry.title.startsWith('The ') && entry.title.endsWith(' Era')) {
      const genre = entry.title.replace('The ', '').replace(' Era', '')
      return t('timeline.eraTitle', 'Эпоха: {{genre}}', { genre })
    }
    switch (entry.title) {
      case 'First Step into Steam': return t('timeline.firstStep', 'Первый шаг в Steam')
      case 'Your Gaming Legacy': return t('timeline.legacy', 'Ваше геймерское наследие')
      case 'Defining Game': return t('timeline.definingGame', 'Знаковая игра')
      default: return entry.title
    }
  }

  const handleGenerate = async () => {
    if (generating || loading) return
    if (usage?.timeline && !usage.timeline.unlimited && usage.timeline.remaining === 0) {
      setLimitStatus(usage.timeline)
      return
    }
    setGenerating(true)
    try {
      const res = await window.api.ai.generateTimeline()
      if (res.success) {
        toast.success(t('timeline.success', 'Ваше наследие успешно записано.'))
        await fetchTimeline()
      } else {
        if (res.error === 'AI_USAGE_LIMIT_REACHED') setLimitStatus(usage?.timeline || null)
        toast.error(t('timeline.error', 'Не удалось сгенерировать историю.'))
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setGenerating(false)
      await refreshUsage()
    }
  }

  return (
    <motion.div 
      className="timeline-page-content"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
    >
      {/* Page Header */}
      <motion.div className="timeline__header" variants={fadeUp}>
        <div className="timeline__eyebrow">
          <History size={14} className="text-accent-primary" />
          <span>GameMind AI Chronicles</span>
        </div>

        <h1 className="timeline__title">{t('timeline.title', 'История о вас')}</h1>
        <p className="timeline__subtitle">
          {t('timeline.subtitle', 'Путешествие по вашим самым значимым игровым событиям.')}
        </p>
        
        <div className="timeline__actions">
          <button 
            className="btn-generate"
            onClick={stats?.totalGames > 0 ? handleGenerate : () => navigate('/settings', { state: { activeTab: 'steam' } })}
            disabled={generating || loading}
            title={stats?.totalGames === 0 ? t('dashboard.setupPrompt', 'Подключите ваш аккаунт Steam в настройках, чтобы начать работу') : ''}
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            <span>
              {stats?.totalGames === 0 
                ? t('dashboard.connectSteam', 'Подключить Steam')
                : entries.length > 0 
                  ? t('timeline.recalculate', 'Переписать документалку') 
                  : t('timeline.generate', 'Сгенерировать документалку')}
            </span>
          </button>
        </div>
      </motion.div>

      {/* Dynamic Content States */}
      {loading || generating ? (
        <div className="timeline__state-wrapper">
          <div className="timeline__state-icon-box">
            <Loader2 size={40} className="animate-spin text-accent-primary" />
          </div>
          <h3 className="timeline__state-title">
            {generating 
              ? t('timeline.generatingState', 'ИИ режиссирует вашу личную игровую документалку...') 
              : t('timeline.reconstructingState', 'Восстановление вашей истории...')}
          </h3>
          <p className="timeline__state-desc">
            {t('timeline.analyzingChronicles', 'Анализируем ключевые эпохи, знаковые часы и поворотные моменты.')}
          </p>
        </div>
      ) : entries.length === 0 ? (
        <motion.div className="timeline__state-wrapper" variants={fadeUp}>
          <div className="timeline__state-icon-box">
            <Compass size={48} className="text-secondary opacity-40" />
          </div>
          <h3 className="timeline__state-title">
            {stats?.totalGames === 0 
              ? t('dashboard.setupPrompt', 'Подключите ваш аккаунт Steam в настройках, чтобы начать работу') 
              : t('timeline.emptyTitle', 'Хроника пока не написана')}
          </h3>
          <p className="timeline__state-desc">
            {stats?.totalGames === 0 
              ? t('timeline.connectSteamDesc', 'Подключите ваш Steam аккаунт, чтобы ИИ мог проанализировать вашу историю и создать уникальную игровую документалку по вашим ключевым этапам.') 
              : t('timeline.emptyFeed', 'Ваш таймлайн пуст. Нажмите «Сгенерировать документалку», чтобы ИИ создал вашу историю.')}
          </p>
        </motion.div>
      ) : (
        <TimelineContainer 
          entries={entries}
          getLocalizedTitle={getLocalizedTitle}
          getFlavorText={getFlavorText}
        />
      )}

      <AiUsageLimitModal status={limitStatus} onClose={() => setLimitStatus(null)} />
    </motion.div>
  )
}
