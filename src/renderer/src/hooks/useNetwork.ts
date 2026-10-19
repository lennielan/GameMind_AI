import { useState, useEffect } from 'react'

/**
 * Robust network detection hook using Chromium's native network state
 * and event listeners. Fast, lightweight, and 100% free of false-positive CORS errors.
 */
export function useNetwork() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
    }

    const handleOffline = () => {
      setIsOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Synchronize with current native state
    setIsOffline(!navigator.onLine)

    // Periodic sync with navigator.onLine every 5 seconds as a fallback
    const interval = setInterval(() => {
      setIsOffline(!navigator.onLine)
    }, 5000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  return { isOffline }
}
