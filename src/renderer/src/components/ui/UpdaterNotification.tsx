import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DownloadCloud, CheckCircle2, AlertTriangle, X, RefreshCw } from 'lucide-react'
import './UpdaterNotification.css'

type UpdaterState = 'idle' | 'downloading' | 'ready' | 'error'

export function UpdaterNotification(): React.JSX.Element | null {
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

  if (state === 'idle') return null

  return (
    <AnimatePresence>
      <motion.div
        className="updater-notification"
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
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
              <CheckCircle2 size={18} />
            ) : state === 'error' ? (
              <AlertTriangle size={18} />
            ) : (
              <DownloadCloud size={18} />
            )}
          </div>
          <h3 className="updater-notification__title">
            {state === 'ready'
              ? 'Обновление готово'
              : state === 'error'
                ? 'Ошибка обновления'
                : 'Загрузка обновления...'}
          </h3>
          <button className="updater-notification__close" onClick={() => setState('idle')}>
            <X size={16} />
          </button>
        </div>

        {state === 'downloading' && (
          <div className="updater-notification__progress-container">
            <div className="updater-notification__progress-bar">
              <div
                className="updater-notification__progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="updater-notification__progress-text">
              <span>{version ? `v${version}` : 'Скачивание...'}</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
        )}

        {state === 'ready' && (
          <button
            className="updater-notification__button"
            onClick={() => window.api.updater.install()}
          >
            <RefreshCw size={16} />
            Перезапустить и установить
          </button>
        )}

        {state === 'error' && (
          <div className="updater-notification__error-text">{errorMsg}</div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
