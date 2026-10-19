import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Loader2, RefreshCw, Trash2, Gamepad2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../stores/app.store'
import { supabase } from '../../services/supabase.client'
import { JournalReport, MonthlyReport } from './components/JournalReport'
import { JournalGenerating } from './components/JournalGenerating'
import './JournalPage.css'

export function JournalPage(): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [journals, setJournals] = useState<any[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [currentJournal, setCurrentJournal] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [stats, setStats] = useState<any>(null)
  
  const steamId = useAppStore(state => state.steamId)
  const hasNewJournal = useAppStore(state => state.hasNewJournal)
  const setHasNewJournal = useAppStore(state => state.setHasNewJournal)

  const now = new Date()
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  useEffect(() => {
    loadJournals()
  }, [])

  useEffect(() => {
    checkAdminStatus()
  }, [])

  const checkAdminStatus = async () => {
    try {
      if (!supabase) {
        setIsAdmin(false)
        return
      }
      const { data: { session } } = await supabase.auth.getSession()
      const myId = session?.user?.id
      if (!myId) {
        setIsAdmin(false)
        return
      }

      const { data: myUser } = await supabase.from('users').select('numeric_id, username, steam_id').eq('id', myId).single()
      const adminSteamId = import.meta.env.VITE_ADMIN_STEAM_ID
      const adminUsername = import.meta.env.VITE_ADMIN_USERNAME
      const adminNumericId = import.meta.env.VITE_ADMIN_NUMERIC_ID ? Number(import.meta.env.VITE_ADMIN_NUMERIC_ID) : undefined
      const isAdminMatch = Boolean(
        (adminSteamId && myUser?.steam_id === adminSteamId) ||
        (adminUsername && myUser?.username === adminUsername) ||
        (adminNumericId && myUser?.numeric_id === adminNumericId)
      )
      const { data: bossBadge } = await supabase.from('user_badges').select('*').eq('user_id', myId).eq('badge_code', 'boss').maybeSingle()

      if (isAdminMatch || bossBadge) {
        setIsAdmin(true)
      } else {
        setIsAdmin(false)
      }
    } catch (e) {
      console.error(e)
      setIsAdmin(false)
    }
  }

  const loadJournals = async () => {
    setLoading(true)
    try {
      const [res, statsRes] = await Promise.all([
        window.api.journal.getAllJournals(),
        window.api.getStats().catch(() => ({ success: false, data: null }))
      ])
      
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data)
      }

      if (res.success && res.data) {
        setJournals(res.data)
        if (res.data.length > 0) {
          const first = res.data[0]
          await selectJournal(first.month, res.data)
        } else {
          setSelectedMonth('')
          setCurrentJournal(null)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const selectJournal = async (month: string, currentList = journals) => {
    setSelectedMonth(month)
    const found = currentList.find(j => j.month === month)
    
    if (found) {
      setCurrentJournal(found)
      
      if (found.is_viewed === 0) {
        try {
          await window.api.journal.markJournalViewed(month)
          const updatedList = currentList.map(j => 
            j.month === month ? { ...j, is_viewed: 1 } : j
          )
          setJournals(updatedList)
          
          const hasUnviewed = updatedList.some(j => j.is_viewed === 0)
          if (!hasUnviewed && hasNewJournal) {
            setHasNewJournal(false)
          }
        } catch (e) {
          console.error(e)
        }
      }
    } else {
      setCurrentJournal(null)
    }
  }

  const handleAdminGenerate = async () => {
    let targetMonth = selectedMonth
    if (!targetMonth) {
      const now = new Date()
      let m = now.getMonth() // 0-11, so current month is month index (if july, getMonth() is 6)
      let y = now.getFullYear()
      if (m === 0) {
        m = 12
        y--
      }
      targetMonth = `${y}-${String(m).padStart(2, '0')}`
    }
    
    if (!targetMonth) return
    setIsGenerating(true)
    try {
      const res = await window.api.journal.adminGenerate(targetMonth)
      if (res.success) {
        toast.success(`Journal for ${targetMonth} regenerated!`)
        await loadJournals()
      } else {
        toast.error(`Failed to regenerate: ${res.error}`)
      }
    } catch (e: any) {
      toast.error(e.message || 'Error generating journal')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAdminGenerateCurrentMonth = async () => {
    const now = new Date()
    const targetMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    setIsGenerating(true)
    try {
      const res = await window.api.journal.adminGenerate(targetMonth)
      if (res.success) {
        toast.success(`Journal for ${targetMonth} generated!`)
        await loadJournals()
        setSelectedMonth(targetMonth)
      } else {
        toast.error(`Failed to generate: ${res.error}`)
      }
    } catch (e: any) {
      toast.error(e.message || 'Error generating journal')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAdminDelete = async () => {
    if (!selectedMonth) return
    try {
      const res = await window.api.journal.adminDelete(selectedMonth)
      if (res.success) {
        toast.success(`Journal for ${selectedMonth} deleted!`)
        await loadJournals()
      } else {
        toast.error(`Failed to delete: ${res.error}`)
      }
    } catch (e: any) {
      toast.error(e.message || 'Error deleting journal')
    }
  }



  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, 1)
    return date.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })
  }

  const availableMonths = Array.from(new Set(journals.map(j => j.month))).sort().reverse()

  return (
    <div className="journal-page">
      <AnimatePresence>
        {isGenerating && <JournalGenerating />}
      </AnimatePresence>

      <div className="journal-sidebar">
        <div className="journal-sidebar__header">
          <BookOpen className="text-primary" size={24} />
          <h2>{t('journal.title', 'Game Journal')}</h2>
        </div>
        <div className="journal-sidebar__list">
          {availableMonths.map(month => {
            const journal = journals.find(j => j.month === month)
            const isUnviewed = journal && journal.is_viewed === 0
            
            return (
              <button 
                key={month}
                className={`journal-month-btn ${selectedMonth === month ? 'active' : ''} ${isUnviewed ? 'unviewed' : ''}`}
                onClick={() => selectJournal(month)}
              >
                {formatMonth(month)}
                {isUnviewed && <div className="journal-month-badge" />}
              </button>
            )
          })}
        </div>
      </div>

      <div className="journal-content">
        {isAdmin && (
          <div className="journal-actions" style={{ display: 'flex', gap: '8px', padding: '16px', justifyContent: 'flex-end', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
            <button className="btn-secondary btn-icon" onClick={handleAdminGenerate} disabled={isGenerating}>
              <RefreshCw size={16} /> {journals.length === 0 ? 'Admin Test Generate (Last Month)' : 'Admin Regenerate'}
            </button>
            <button className="btn-secondary btn-icon" onClick={handleAdminGenerateCurrentMonth} disabled={isGenerating}>
              <RefreshCw size={16} /> Admin Test Generate (Current Month)
            </button>
            {journals.length > 0 && selectedMonth && (
              <button className="btn-secondary btn-icon" onClick={handleAdminDelete}>
                <Trash2 size={16} /> Admin Delete
              </button>
            )}
          </div>
        )}
        
        {loading ? (
          <div className="journal-empty">
            <Loader2 className="animate-spin" size={32} />
          </div>
        ) : !currentJournal ? (
          <div className="journal-empty">
            <div className="journal-empty__icon-wrapper">
              <BookOpen size={40} className="journal-empty__icon" />
            </div>
            <h2>{journals.length === 0 ? t('journal.emptyState', "You don't have any journal entries yet") : t('journal.noActivity', 'No Activity')}</h2>
            <p>
              {stats?.totalGames === 0 
                ? t('dashboard.setupPrompt', 'Подключите ваш аккаунт Steam в настройках, чтобы начать работу') 
                : (journals.length === 0 ? t('journal.comeBackText', 'Keep playing to generate more insights.') : t('journal.comeBackNextMonth', 'Come back next month!'))
              }
            </p>
            {stats && stats.totalGames === 0 && (
              <button className="journal-empty__btn" onClick={() => navigate('/settings', { state: { activeTab: 'steam' } })}>
                <Gamepad2 size={18} />
                <span>{t('dashboard.connectSteam', 'Подключить Steam')}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="journal-entry-wrapper">
             {currentJournal.report_json ? (
                <JournalReport report={JSON.parse(currentJournal.report_json) as MonthlyReport} />
             ) : (
               <div className="journal-empty">
                 <div className="journal-empty__icon-wrapper">
                   <BookOpen size={40} className="journal-empty__icon" />
                 </div>
                 <h2>{t('journal.noActivity', 'No Activity')}</h2>
                 <p>{t('journal.comeBackNextMonth', 'Come back next month!')}</p>
                 {isAdmin && <p style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>V1 Journal Detected. Use Admin Regenerate or Delete.</p>}
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  )
}
