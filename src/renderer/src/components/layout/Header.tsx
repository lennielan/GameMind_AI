// ============================================================
// Header — Neo-Terminal Titlebar & Telemetry Header
// ============================================================

import { useState, useEffect } from 'react'
import { Minus, Square, X, Copy, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '../ui'
import './Header.css'

export function Header(): React.JSX.Element {
  const { t } = useTranslation()
  const [isMaximized, setIsMaximized] = useState(false)
  const [syncStatus, setSyncStatus] = useState<any>(null)
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number | null>(null)

  useEffect(() => {
    const check = async (): Promise<void> => {
      const result = await window.api.isMaximized()
      if (result.data !== null) setIsMaximized(result.data)

      const syncResult = await window.api.getSetting('lastSyncTimestamp')
      if (syncResult.success && syncResult.data) {
        setLastSyncTimestamp(syncResult.data as number)
      }
    }
    check()

    const cleanup = window.api.onSyncStatus((status: any) => {
      setSyncStatus(status)
      if (!status.isRunning && status.progress === 100) {
        setLastSyncTimestamp(Math.floor(Date.now() / 1000))
      }
    })

    return cleanup
  }, [])

  const handleMinimize = (): void => {
    window.api.minimize()
  }

  const handleMaximize = async (): Promise<void> => {
    await window.api.maximize()
    const result = await window.api.isMaximized()
    if (result.data !== null) setIsMaximized(result.data)
  }

  const handleClose = (): void => {
    window.api.close()
  }

  const getSyncTelemetry = (): { label: string; isRecent: boolean } | null => {
    if (!lastSyncTimestamp) return null
    const diffMins = Math.floor((Math.floor(Date.now() / 1000) - lastSyncTimestamp) / 60)
    if (diffMins > 0) {
      return {
        label: `SYNC // ${diffMins}M AGO`,
        isRecent: diffMins < 60
      }
    }
    return {
      label: 'SYNC // OK',
      isRecent: true
    }
  }

  const syncTelemetry = getSyncTelemetry()

  return (
    <header className="header" id="titlebar">
      {/* Draggable region */}
      <div className="header__drag-region" />

      {/* Sync Telemetry Status */}
      <div className="header__sync-status">
        {syncStatus?.isRunning ? (
          <Badge variant="accent" size="xs" bracketed>
            <span className="header__sync-spinner-box" aria-hidden="true">
              <RefreshCw size={11} className="header__sync-icon--spinning" />
            </span>
            <span className="header__sync-text">SYNC // {syncStatus.progress}%</span>
          </Badge>
        ) : syncTelemetry ? (
          <Badge
            variant={syncTelemetry.isRecent ? 'success' : 'muted'}
            size="xs"
            bracketed
            dot
            pulseDot={syncTelemetry.isRecent}
            title={lastSyncTimestamp ? new Date(lastSyncTimestamp * 1000).toLocaleTimeString() : undefined}
          >
            <span>{syncTelemetry.label}</span>
          </Badge>
        ) : null}
      </div>

      {/* Window Controls */}
      <div className="header__controls">
        <button
          className="header__control header__control--minimize"
          onClick={handleMinimize}
          title={t('header.minimize', 'Свернуть')}
          id="btn-minimize"
          aria-label="Minimize"
        >
          <Minus size={13} />
        </button>
        <button
          className="header__control header__control--maximize"
          onClick={handleMaximize}
          title={isMaximized ? t('header.restore', 'Восстановить') : t('header.maximize', 'Развернуть')}
          id="btn-maximize"
          aria-label="Maximize"
        >
          {isMaximized ? <Copy size={11} /> : <Square size={11} />}
        </button>
        <button
          className="header__control header__control--close"
          onClick={handleClose}
          title={t('header.close', 'Закрыть')}
          id="btn-close"
          aria-label="Close"
        >
          <X size={13} />
        </button>
      </div>
    </header>
  )
}
