import type { GameState } from '@/sim/types'
import { STOCKS } from '@/data/stocks'
import { DAY_START_MINUTE, phaseFor } from '@/sim/clock'
import { xpForLevel } from '@/sim/progression'
import { checkQuests } from '@/sim/quests'

/** ₹5,00,000 to start. Tunable — this is a game balance number, not a rule. */
const STARTING_CASH = 5_00_000_00

/**
 * A fresh save. Bare on purpose: holdings arrive at step 9, quests at 12,
 * notifications and events at 13. The panels already handle their empty states.
 */
export function newGame(name: string): GameState {
  // checkQuests auto-starts "First Day at Meridian" so the Tasks panel isn't empty
  return checkQuests({
    version: 2, // keep in sync with migrate.ts CURRENT_VERSION
    seed: `${name || 'player'}-${Date.now()}`,
    clock: { day: 1, minute: DAY_START_MINUTE, phase: phaseFor(DAY_START_MINUTE) },
    player: {
      name: name || 'Arjun',
      role: 'intern',
      level: 1,
      xp: 0,
      xpToNext: xpForLevel(1),
      cash: STARTING_CASH,
      reputation: 0,
      skills: {
        analysis: 0,
        risk: 0,
        trading: 0,
        accounting: 0,
        economics: 0,
        negotiation: 0,
        fintech: 0,
        leadership: 0,
        data: 0,
        communication: 0,
      },
      position: { x: 22, y: 16, scene: 'city' }, // matches SPAWN in world/map/city.ts
    },
    market: {
      // deep copy — ticks build the game's own stock objects, never the module const
      stocks: structuredClone(STOCKS),
      activeEvents: [],
      history: {},
    },
    portfolio: { holdings: [], realisedPnL: 0, trades: [] },
    quests: { active: [], completed: [] },
    cases: { openCaseId: null, resolved: [] },
    notifications: [],
    flags: {},
    learned: [],
  }).state
}
