// ============================================================
// App — Root component
// ============================================================

import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { Toaster, toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { router } from './router'
import { useThemeStore } from './stores/theme.store'
import { useAppStore } from './stores/app.store'
import { ErrorBoundary } from './components/ErrorBoundary'
import { GlobalRealtimeListener } from './components/GlobalRealtimeListener'
import { UpdaterNotification } from './components/ui/UpdaterNotification'
import { OfflineOverlay } from './components/ui/OfflineOverlay'
import { supabase } from './services/supabase.client'
import { useNetwork } from './hooks/useNetwork'

export function App(): React.JSX.Element {
  const isOverlayWindow = 
    window.location.hash.toLowerCase().includes('overlay') || 
    window.location.pathname.toLowerCase().includes('overlay')

  const { t, i18n } = useTranslation()
  const initializeTheme = useThemeStore((s) => s.initialize)
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme)
  const setLoading = useAppStore((s) => s.setLoading)
  const setHasNewJournal = useAppStore((s) => s.setHasNewJournal)

  const { isOffline } = useNetwork()

  useEffect(() => {
    initializeTheme()
    if (isOverlayWindow) return

    const init = async (): Promise<void> => {
      if (window.api?.getSetting) {
        try {
          const savedLang = await window.api.getSetting('language')
          if (savedLang && typeof savedLang === 'string' && savedLang !== i18n.language) {
            i18n.changeLanguage(savedLang)
          }
        } catch (e) {}
      }

      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await window.api.cloud.setSession(session.access_token, session.refresh_token)
        }
      }

      try {
        const pending = await window.api.journal.checkPendingJournals()
        if (pending.success && pending.data.length > 0) {
          const result = await window.api.journal.generatePendingJournals()
          if (result.success && result.data.length > 0) {
            setHasNewJournal(true)
            toast.success(t('journal.new_journal_ready', 'Your monthly journal is ready!'))
          }
        } else {
          // Also check if there are unviewed ones
          const hasNew = await window.api.journal.hasNewJournals()
          if (hasNew.success && hasNew.data) {
            setHasNewJournal(true)
          }
        }
      } catch (err) {
        console.error('Failed to check journals', err)
      }

      setLoading(false)

      if (supabase) {
        supabase.auth.onAuthStateChange((_event, session) => {
          if (session) {
            window.api.cloud.setSession(session.access_token, session.refresh_token)
          }
        })
      }
    }
    init()

    const cleanupNav = window.api.onNavigate?.((path, state) => {
      console.log('Main App received navigate event:', path, state)
      router.navigate(path, { state })
    })

    return () => {
      cleanupNav?.()
    }
  }, [initializeTheme, setLoading, isOverlayWindow, t, setHasNewJournal])

  if (isOverlayWindow) {
    return (
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    )
  }

  return (
    <>
      <ErrorBoundary>
        <GlobalRealtimeListener />
        <UpdaterNotification />
        {isOffline && <OfflineOverlay />}
        <RouterProvider router={router} />
      </ErrorBoundary>
      <Toaster 
        theme={resolvedTheme === 'light' ? 'light' : 'dark'} 
        position="bottom-right" 
        richColors 
        closeButton
        toastOptions={{
          classNames: {
            actionButton: 'btn-primary',
            cancelButton: 'btn-secondary',
          }
        }}
      />
    </>
  )
}
