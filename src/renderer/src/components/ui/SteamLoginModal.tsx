// ============================================================
// Steam Login Modal — Cookie-based Steam Store authentication
// ============================================================

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { LogIn, CheckCircle2, ShieldCheck } from 'lucide-react'
import './SteamLoginModal.css'

type ModalState = 'checking' | 'show' | 'logging-in' | 'success' | 'hidden'

export function SteamLoginModal(): React.JSX.Element | null {
  const { t } = useTranslation()
  const [state, setState] = useState<ModalState>('checking')

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const res = await window.api.steamCheckAuth()
      if (res.success && res.data === true) {
        setState('hidden')
      } else {
        setState('show')
      }
    } catch {
      setState('show')
    }
  }

  const handleLogin = async () => {
    setState('logging-in')
    try {
      const res = await window.api.steamLogin()
      if (res.success && res.data) {
        setState('success')
        setTimeout(() => setState('hidden'), 1800)
      } else {
        // User closed popup without logging in
        setState('show')
      }
    } catch (err) {
      console.error('Steam Store login failed:', err)
      setState('show')
    }
  }

  const handleSkip = () => {
    setState('hidden')
  }

  if (state === 'hidden' || state === 'checking') return null

  return (
    <AnimatePresence>
      <motion.div
        className="steam-login-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="steam-login-modal"
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Steam Logo */}
          <div className="steam-login__logo">
            <ShieldCheck size={32} />
          </div>

          {state === 'success' ? (
            <div className="steam-login__success">
              <div className="steam-login__success-icon">
                <CheckCircle2 size={28} />
              </div>
              <div className="steam-login__success-text">
                {t('steamLogin.success', 'Успешно подключено!')}
              </div>
            </div>
          ) : (
            <>
              <h2 className="steam-login__title">
                {t('steamLogin.title', 'Подключите Steam аккаунт')}
              </h2>
              <p className="steam-login__subtitle">
                {t(
                  'steamLogin.subtitle',
                  'Авторизация в Steam Store необходима для синхронизации вашего списка желаемого и корректной работы библиотеки.'
                )}
              </p>

              {state === 'logging-in' ? (
                <div className="steam-login__loading">
                  <div className="steam-login__spinner" />
                  <span className="steam-login__loading-text">
                    {t('steamLogin.waiting', 'Ожидание входа в Steam...')}
                  </span>
                </div>
              ) : (
                <>
                  <button
                    className="steam-login__btn"
                    onClick={handleLogin}
                    id="btn-steam-store-login"
                  >
                    <LogIn size={18} />
                    {t('steamLogin.button', 'Войти через Steam')}
                  </button>

                  <div className="steam-login__divider">
                    <span>{t('steamLogin.or', 'или')}</span>
                  </div>

                  <button
                    className="steam-login__skip"
                    onClick={handleSkip}
                    id="btn-steam-store-skip"
                  >
                    {t('steamLogin.skip', 'Пропустить (вишлист может не загрузиться)')}
                  </button>
                </>
              )}
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
