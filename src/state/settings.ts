import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Client settings, not game state. They belong to the person and the browser,
 * not the save, so they live in their own store and persist to localStorage.
 *
 * `reducedMotion` is mirrored onto <html> by App.tsx; `aiWording` gates the
 * flavour layer (ai/flavour.ts); `sound` gates the interface cues (lib/sound.ts);
 * `assist` shows the case ratios up front instead of behind skill unlocks
 * (step C-b — disclosure, not difficulty; on by default); `colourSafe` swaps
 * the jade/coral up-down pair for one that survives colour blindness, and is
 * mirrored onto <html> by App.tsx alongside reducedMotion (issue A3).
 */

export interface Settings {
  sound: boolean
  reducedMotion: boolean
  aiWording: boolean
  assist: boolean
  colourSafe: boolean
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
      colourSafe: false,
      set: (key, value) => set({ [key]: value } as Partial<Settings>),
    }),
    {
      name: 'novus-settings',
      partialize: (s) => ({
        sound: s.sound,
        reducedMotion: s.reducedMotion,
        aiWording: s.aiWording,
        assist: s.assist,
        colourSafe: s.colourSafe,
      }),
    },
  ),
)
