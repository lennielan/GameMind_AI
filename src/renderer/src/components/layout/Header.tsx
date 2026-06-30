// ============================================================
// Header — Custom titlebar with window controls
// ============================================================

import { useState, useEffect } from 'react'
import { Minus, Square, X, Copy } from 'lucide-react'
import './Header.css'

export function Header(): React.JSX.Element {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    const check = async (): Promise<void> => {
      const result = await window.api.isMaximized()
      if (result.data !== null) setIsMaximized(result.data)
    }
    check()
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

  return (
    <header className="header" id="titlebar">
      {/* Draggable region */}
      <div className="header__drag-region" />

      {/* Window Controls */}
      <div className="header__controls">
        <button
          className="header__control header__control--minimize"
          onClick={handleMinimize}
          title="Minimize"
          id="btn-minimize"
        >
          <Minus size={14} />
        </button>
        <button
          className="header__control header__control--maximize"
          onClick={handleMaximize}
          title={isMaximized ? 'Restore' : 'Maximize'}
          id="btn-maximize"
        >
          {isMaximized ? <Copy size={12} /> : <Square size={12} />}
        </button>
        <button
          className="header__control header__control--close"
          onClick={handleClose}
          title="Close"
          id="btn-close"
        >
          <X size={14} />
        </button>
      </div>
    </header>
  )
}
