import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Client settings, not game state. They belong to the person and the browser,
 * not the save, so they live in their own store and persist to localStorage.
 *
 * `reducedMotion` is mirrored onto <html> by App.tsx; `aiWording` gates the
 * flavour layer (ai/flavour.ts). Nothing reads `sound` yet — step 16.
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
