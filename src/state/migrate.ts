import type { GameState } from '@/sim/types'
import { ENERGY_MAX } from '@/sim/energy'

/**
 * Old saves must still load. When GameState changes shape: bump
 * GameState.version, add a numbered step to the loop below, never break an
 * existing save. Returns null for anything it cannot make sense of, so the
 * home screen falls back to "no save" rather than crashing.
 */
const CURRENT_VERSION = 5

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
  if (save.version < 3) {
    save.mistakes = [] // the Mistakes log — new in step C-e
    save.version = 3
  }
  if (save.version < 4) {
    save.modules = {} // Academy modules — new in step C-f
    save.version = 4
  }
  if (save.version < 5) {
    // issue A1 + A2. Seed the day's open from wherever the save currently is,
    // so the first close after upgrading reports no change rather than a wrong
    // one; and start everyone rested.
    save.player.energy = ENERGY_MAX
    save.dayOpen = {
      day: save.clock.day,
      cash: save.player.cash,
      reputation: save.player.reputation,
      realisedPnL: save.portfolio.realisedPnL,
      holdingsValue: save.portfolio.holdings.reduce((total, h) => {
        const price = save.market.stocks.find((s) => s.id === h.stockId)?.price ?? h.averageCost
        return total + price * h.quantity
      }, 0),
      questsCompleted: [...save.quests.completed],
    }
    save.version = 5
  }

  return save
}
