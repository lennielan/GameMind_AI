import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { DownloadCloud, CheckCircle2, AlertTriangle, X, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './UpdaterNotification.css'

type UpdaterState = 'idle' | 'downloading' | 'ready' | 'error'

export function UpdaterNotification(): React.JSX.Element | null {
  const { t } = useTranslation()
  const [state, setState] = useState<UpdaterState>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [version, setVersion] = useState('')

  useEffect(() => {
    const unsubAvailable = window.api.updater.onAvailable((info) => {
      setVersion(info.version)
      setState('downloading')
      setProgress(0)
    })

    const unsubProgress = window.api.updater.onProgress((prog) => {
      setState('downloading')
      setProgress(prog.percent)
    })

    const unsubReady = window.api.updater.onReady((info) => {
      setVersion(info.version)
      setState('ready')
    })

    const unsubError = window.api.updater.onError((err) => {
      setErrorMsg(err)
      setState('error')
    })

    return () => {
      unsubAvailable()
      unsubProgress()
      unsubReady()
      unsubError()
    }
  }, [])

  // Render via portal to ensure it stays strictly relative to viewport (fixes top-left bug)
  return createPortal(
    <AnimatePresence>
      {state !== 'idle' && (
        <motion.div
          className="updater-notification"
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 320 }}
        >
          <div className="updater-notification__top-glow" />
          <div className="updater-notification__accent-bar" />

          <div className="updater-notification__header">
            <div
              className={`updater-notification__icon ${
                state === 'ready'
                  ? 'updater-notification__icon--success'
                  : state === 'error'
                    ? 'updater-notification__icon--error'
                    : ''
              }`}
            >
              {state === 'ready' ? (
                <CheckCircle2 size={16} />
              ) : state === 'error' ? (
                <AlertTriangle size={16} />
              ) : (
                <DownloadCloud size={16} />
              )}
            </div>
            <div className="updater-notification__header-text">
              <h3 className="updater-notification__title">
                {state === 'ready'
                  ? t('updater.status.ready', 'Обновление готово')
                  : state === 'error'
                    ? t('updater.status.error', 'Ошибка обновления')
                    : t('updater.status.downloadingUpdate', 'Загрузка обновления...')}
              </h3>
            </div>
            <button 
              className="updater-notification__close" 
              onClick={() => setState('idle')}
              title={t('common.close', 'Закрыть')}
            >
              <X size={14} />
            </button>
          </div>

          {state === 'downloading' && (
            <div className="updater-notification__progress-container">
              <div className="updater-notification__progress-bar">
                <div
                  className="updater-notification__progress-fill"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
              <div className="updater-notification__progress-text">
                <span className="updater-notification__version">
                  {version ? `v${version}` : t('updater.status.downloading', 'Скачивание...')}
                </span>
                <span className="updater-notification__percent">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
          )}

          {state === 'ready' && (
            <button
              className="updater-notification__button"
              onClick={() => window.api.updater.install()}
            >
              <RefreshCw size={15} />
              <span>{t('updater.status.restartAndInstall', 'Перезапустить и установить')}</span>
            </button>
          )}

          {state === 'error' && (
            <div className="updater-notification__error-text">{errorMsg}</div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
