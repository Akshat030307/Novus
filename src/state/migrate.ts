import type { GameState } from '@/sim/types'

/**
 * Old saves must still load. When GameState changes shape: bump
 * GameState.version, add a numbered step to the loop below, never break an
 * existing save. Returns null for anything it cannot make sense of, so the
 * home screen falls back to "no save" rather than crashing.
 */
const CURRENT_VERSION = 2

export function migrate(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null
  const save = raw as GameState
  if (typeof save.version !== 'number') return null
  if (save.version > CURRENT_VERSION) return null // written by a newer build

  // future migrations, oldest first:
  if (save.version < 2) {
    save.learned = [] // the Ledger — nothing was tracked before step C-a
    save.version = 2
  }

  return save
}
