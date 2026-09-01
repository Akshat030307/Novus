import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Client settings, not game state. They belong to the person and the browser,
 * not the save, so they live in their own store and persist to localStorage.
 *
 * `reducedMotion` is mirrored onto <html> by App.tsx; `aiWording` gates the
 * flavour layer (ai/flavour.ts); `sound` gates the interface cues (lib/sound.ts);
 * `assist` shows the case ratios up front instead of behind skill unlocks
 * (step C-b — disclosure, not difficulty; on by default).
 */

export interface Settings {
  sound: boolean
  reducedMotion: boolean
  aiWording: boolean
  assist: boolean
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
      assist: true,
      set: (key, value) => set({ [key]: value } as Partial<Settings>),
    }),
    {
      name: 'novus-settings',
      partialize: (s) => ({
        sound: s.sound,
        reducedMotion: s.reducedMotion,
        aiWording: s.aiWording,
        assist: s.assist,
      }),
    },
  ),
)
