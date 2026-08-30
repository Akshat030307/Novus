import type { GameState } from '@/sim/types'
import { migrate } from '@/state/migrate'

/**
 * Step 7 writes to the browser. Step 14 adds Supabase behind the same two
 * functions, so switching is a change in this file only.
 *
 * Always write locally first, then sync. If the network is down the game must
 * keep working.
 */
const KEY = 'novus:save:1'

export async function saveGame(state: GameState): Promise<void> {
  localStorage.setItem(KEY, JSON.stringify(state))
  // step 14: push to Supabase, ignore failures, retry on next save
}

export async function loadGame(): Promise<GameState | null> {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    return migrate(JSON.parse(raw))
  } catch {
    return null // corrupt save — fall back to "no save" rather than crash
  }
  // step 14: prefer the cloud copy when it is newer
}

export function hasSave(): boolean {
  return localStorage.getItem(KEY) !== null
}
