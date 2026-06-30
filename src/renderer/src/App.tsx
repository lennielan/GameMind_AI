// ============================================================
// App — Root component
// ============================================================

import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useThemeStore } from './stores/theme.store'
import { useAppStore } from './stores/app.store'

export function App(): React.JSX.Element {
  const initializeTheme = useThemeStore((s) => s.initialize)
  const setLoading = useAppStore((s) => s.setLoading)

  useEffect(() => {
    const init = async (): Promise<void> => {
      await initializeTheme()
      setLoading(false)
    }
    init()
  }, [initializeTheme, setLoading])

  return <RouterProvider router={router} />
}
