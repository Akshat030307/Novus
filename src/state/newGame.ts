import type { GameState } from '@/sim/types'
import { STOCKS } from '@/data/stocks'
import { DAY_START_MINUTE, phaseFor, snapshotDayOpen } from '@/sim/clock'
import { xpForLevel } from '@/sim/progression'
import { checkQuests } from '@/sim/quests'
import { ENERGY_MAX } from '@/sim/energy'
// pure map data, no Phaser — state/ is where the layers meet
import { SPAWN } from '@/world/map/city'

/** ₹5,00,000 to start. Tunable — this is a game balance number, not a rule. */
const STARTING_CASH = 5_00_000_00

/**
 * A fresh save. Bare on purpose: holdings arrive at step 9, quests at 12,
 * notifications and events at 13. The panels already handle their empty states.
 */
export function newGame(name: string): GameState {
  // checkQuests auto-starts "First Day at Meridian" so the Tasks panel isn't empty
  const started = checkQuests({
    version: 6, // keep in sync with migrate.ts CURRENT_VERSION
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
      // read from the map rather than copied — the hardcoded pair that used to
      // live here went stale when the city was rebuilt and pointed inside a
      // building, which only showed up once A4 started honouring the field
      position: { x: SPAWN.x, y: SPAWN.y, scene: 'city' },
      energy: ENERGY_MAX,
    },
    market: {
      // deep copy — ticks build the game's own stock objects, never the module const.
      // previousClose is forced to the opening price: every later day opens flat
      // (rollMarketDay sets previousClose = price), so a seeded day-one gap would
      // be the one price move in the whole game nothing can account for — see
      // explainDay in sim/market (issue B6).
      stocks: structuredClone(STOCKS).map((s) => ({ ...s, previousClose: s.price })),
      activeEvents: [],
      history: {},
    },
    portfolio: { holdings: [], realisedPnL: 0, trades: [] },
    quests: { active: [], completed: [] },
    cases: { openCaseId: null, resolved: [] },
    notifications: [],
    flags: {},
    learned: [],
    mistakes: [],
    modules: {},
    // overwritten immediately below — the real snapshot needs the built state
    dayOpen: {
      day: 1,
      cash: STARTING_CASH,
      reputation: 0,
      realisedPnL: 0,
      holdingsValue: 0,
      questsCompleted: [],
    },
  }).state

  return { ...started, dayOpen: snapshotDayOpen(started) }
}
