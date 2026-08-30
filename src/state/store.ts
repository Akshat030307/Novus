import { create } from 'zustand'
import type { GameState, LevelUpReport } from '@/sim/types'
import { newGame } from './newGame'

/**
 * Two stores, on purpose.
 *
 * useGameStore holds the saved world — everything that goes into a save file.
 * useUiStore holds what is on screen right now — which panel is open, which
 * screen we are on. None of that belongs in a save.
 *
 * Phaser reads from useGameStore through world/bridge.ts and nowhere else.
 */

interface GameStore {
  state: GameState
  /** replace the whole world, e.g. after loading a save or starting a new game */
  load: (state: GameState) => void
  /** UI-driven changes: deep-clones first, so callers can mutate the draft */
  apply: (fn: (draft: GameState) => GameState) => void
  /** sim-driven changes on the tick path: shallow merge, no clone */
  tick: (next: Partial<GameState>) => void
}

export const useGameStore = create<GameStore>((set) => ({
  state: newGame('Guest'),
  load: (state) => set({ state }),
  apply: (fn) => set((s) => ({ state: fn(structuredClone(s.state)) })),
  tick: (next) => set((s) => ({ state: { ...s.state, ...next } })),
}))

export type Screen = 'home' | 'game'
export type BottomTab = 'case' | 'market' | 'portfolio' | 'notifications'
/** full-screen things that sit above the game screen */
export type Overlay = 'day-end' | 'settings'

interface UiStore {
  screen: Screen
  bottomTab: BottomTab
  openBuilding: string | null
  dialogueNpc: string | null
  overlay: Overlay | null
  /** level-ups earned since the player last dismissed one, shown one at a time */
  levelUpQueue: LevelUpReport[]
  setScreen: (screen: Screen) => void
  setBottomTab: (tab: BottomTab) => void
  setOpenBuilding: (id: string | null) => void
  setDialogueNpc: (id: string | null) => void
  setOverlay: (overlay: Overlay | null) => void
  pushLevelUps: (reports: LevelUpReport[]) => void
  dismissLevelUp: () => void
  /** true when the clock should stop: any blocking panel is open */
  isPaused: () => boolean
}

export const useUiStore = create<UiStore>((set, get) => ({
  screen: 'home',
  bottomTab: 'notifications',
  openBuilding: null,
  dialogueNpc: null,
  overlay: null,
  levelUpQueue: [],
  setScreen: (screen) => set({ screen }),
  setBottomTab: (bottomTab) => set({ bottomTab }),
  setOpenBuilding: (openBuilding) => set({ openBuilding }),
  setDialogueNpc: (dialogueNpc) => set({ dialogueNpc }),
  setOverlay: (overlay) => set({ overlay }),
  pushLevelUps: (reports) => {
    if (reports.length) set((s) => ({ levelUpQueue: [...s.levelUpQueue, ...reports] }))
  },
  dismissLevelUp: () => set((s) => ({ levelUpQueue: s.levelUpQueue.slice(1) })),
  isPaused: () => {
    const s = get()
    return (
      s.screen !== 'game' ||
      s.openBuilding !== null ||
      s.dialogueNpc !== null ||
      s.overlay !== null ||
      s.levelUpQueue.length > 0
    )
  },
}))
