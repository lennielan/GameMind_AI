// ============================================================
// Theme Store — Dark/Light/System theme management
// ============================================================

import { create } from 'zustand'

type Theme = 'dark' | 'light' | 'system'

interface ThemeState {
  theme: Theme
  resolvedTheme: 'dark' | 'light'
  setTheme: (theme: Theme) => void
  initialize: () => Promise<void>
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'dark',
  resolvedTheme: 'dark',

  setTheme: async (theme: Theme): Promise<void> => {
    const resolved = theme === 'system' ? getSystemTheme() : theme
    document.documentElement.setAttribute('data-theme', resolved)
    set({ theme, resolvedTheme: resolved })
    await window.api.setTheme(theme)
  },

  initialize: async (): Promise<void> => {
    const result = await window.api.getTheme()
    const theme = (result.data as Theme) || 'dark'
    const resolved = theme === 'system' ? getSystemTheme() : theme
    document.documentElement.setAttribute('data-theme', resolved)
    set({ theme, resolvedTheme: resolved })
  }
}))

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
