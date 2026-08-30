import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Client settings, not game state. They belong to the person and the browser,
 * not the save, so they live in their own store and persist to localStorage.
 *
 * Nothing reads `sound` yet (step 16) or `aiWording` yet (step 15). The
 * toggles store the value now so the screen is real; the wiring lands with
 * those steps. `reducedMotion` is live — App.tsx mirrors it onto <html>.
 */

export interface Settings {
  sound: boolean
  reducedMotion: boolean
  aiWording: boolean
}

interface SettingsStore extends Settings {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      sound: true,
      reducedMotion: false,
      aiWording: false,
      set: (key, value) => set({ [key]: value } as Partial<Settings>),
    }),
    {
      name: 'novus-settings',
      partialize: (s) => ({
        sound: s.sound,
        reducedMotion: s.reducedMotion,
        aiWording: s.aiWording,
      }),
    },
  ),
)
