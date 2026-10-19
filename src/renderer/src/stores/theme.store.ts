// ============================================================
// Theme Store — Base Theme & Accent Color Management
// ============================================================

import { create } from 'zustand'
import type { BaseTheme, AccentColor } from '@shared/types'

export type { BaseTheme, AccentColor }

interface ThemeState {
  theme: BaseTheme
  accentColor: AccentColor
  resolvedTheme: 'dark' | 'light' | 'midnight'
  setTheme: (theme: BaseTheme) => Promise<void>
  setAccentColor: (accent: AccentColor) => Promise<void>
  initialize: () => Promise<void>
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'dark',
  accentColor: 'violet',
  resolvedTheme: 'dark',

  setTheme: async (theme: BaseTheme): Promise<void> => {
    const resolved = theme === 'system' ? getSystemTheme() : theme
    document.documentElement.setAttribute('data-theme', resolved)
    try { localStorage.setItem('gamemind_theme', theme) } catch (e) {}
    set({ theme, resolvedTheme: resolved })
    if (window.api?.setSetting) {
      await window.api.setSetting('theme', theme)
    }
  },

  setAccentColor: async (accentColor: AccentColor): Promise<void> => {
    document.documentElement.setAttribute('data-accent', accentColor)
    try { localStorage.setItem('gamemind_accent', accentColor) } catch (e) {}
    set({ accentColor })
    if (window.api?.setSetting) {
      await window.api.setSetting('accentColor', accentColor)
    }
  },

  initialize: async (): Promise<void> => {
    let savedTheme: BaseTheme = 'dark'
    let savedAccent: AccentColor = 'violet'

    if (window.api?.getSetting) {
      const resTheme = await window.api.getSetting('theme')
      if (resTheme?.data) savedTheme = resTheme.data as BaseTheme

      const resAccent = await window.api.getSetting('accentColor')
      if (resAccent?.data) savedAccent = resAccent.data as AccentColor
    }

    const resolved = savedTheme === 'system' ? getSystemTheme() : savedTheme
    document.documentElement.setAttribute('data-theme', resolved)
    document.documentElement.setAttribute('data-accent', savedAccent)
    try {
      localStorage.setItem('gamemind_theme', savedTheme)
      localStorage.setItem('gamemind_accent', savedAccent)
    } catch (e) {}

    set({
      theme: savedTheme,
      accentColor: savedAccent,
      resolvedTheme: resolved
    })
  }
}))

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
