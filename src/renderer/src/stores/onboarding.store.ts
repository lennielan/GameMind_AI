// ============================================================
// Onboarding Store — Interactive Tutorial State Management
// ============================================================

import { create } from 'zustand'

interface OnboardingState {
  isOpen: boolean
  currentStep: number
  totalSteps: number
  openTutorial: () => void
  closeTutorial: () => void
  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  completeTutorial: () => Promise<void>
  skipTutorial: () => Promise<void>
  checkAutoStart: () => Promise<void>
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  isOpen: false,
  currentStep: 1,
  totalSteps: 5,

  openTutorial: () => {
    set({ isOpen: true, currentStep: 1 })
  },

  closeTutorial: () => {
    set({ isOpen: false })
  },

  setStep: (step: number) => {
    set({ currentStep: Math.max(1, Math.min(step, get().totalSteps)) })
  },

  nextStep: () => {
    const { currentStep, totalSteps, completeTutorial } = get()
    if (currentStep < totalSteps) {
      set({ currentStep: currentStep + 1 })
    } else {
      completeTutorial()
    }
  },

  prevStep: () => {
    const { currentStep } = get()
    if (currentStep > 1) {
      set({ currentStep: currentStep - 1 })
    }
  },

  completeTutorial: async () => {
    set({ isOpen: false })
    try {
      localStorage.setItem('gamemind_onboarding_completed', 'true')
    } catch (e) {
      // ignore
    }
    if (window.api?.setSetting) {
      try {
        await window.api.setSetting('hasCompletedOnboarding', true)
      } catch (e) {
        console.error('Failed to persist onboarding completion:', e)
      }
    }
  },

  skipTutorial: async () => {
    await get().completeTutorial()
  },

  checkAutoStart: async () => {
    let completed = false
    try {
      const local = localStorage.getItem('gamemind_onboarding_completed')
      if (local === 'true') {
        completed = true
      }
    } catch (e) {}

    if (!completed && window.api?.getSettings) {
      try {
        const settings = await window.api.getSettings()
        if (settings?.hasCompletedOnboarding) {
          completed = true
        }
      } catch (e) {
        console.error('Failed to get settings for onboarding check:', e)
      }
    }

    if (!completed) {
      // Small timeout to allow the initial view to mount smoothly
      setTimeout(() => {
        set({ isOpen: true, currentStep: 1 })
      }, 500)
    }
  }
}))
