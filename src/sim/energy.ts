import type { GameState, Player } from '@/sim/types'

/**
 * Issue A2. Energy is focus, not a second clock — the clock still ends the day.
 *
 * It falls when you decide in a hurry or churn trades, and it comes back over
 * a break and overnight. Below ENERGY_TIRED the skill-unlocked hints in the
 * case view stop showing: a tired analyst genuinely reads worse, which is the
 * only way a gauge like this earns its place on the HUD.
 *
 * Pure and deterministic — no rng, no clock of its own. Every number here is a
 * balance dial, tune it by playing.
 */

export const ENERGY_MAX = 100
/** below this the case view stops handing out its hints */
export const ENERGY_TIRED = 30

/** a file closed faster than this counts as rushed */
const HASTE_MINUTES = 20
const DRAIN_CASE_HASTY = 8
const DRAIN_CASE = 3
const DRAIN_TRADE = 2
/** extra cost once a trade is the third or later inside CHURN_WINDOW */
const DRAIN_CHURN = 5
const CHURN_TRADES = 3
const CHURN_WINDOW = 60 // game minutes

export const RESTORE_CAFETERIA = 25
export const RESTORE_OVERNIGHT = 40

export const clampEnergy = (n: number) => Math.max(0, Math.min(ENERGY_MAX, Math.round(n)))

export const isTired = (player: Player) => player.energy < ENERGY_TIRED

/**
 * What resolving a case costs. `minutesSpent` is how long the file was open —
 * the UI measures it off the game clock. Undefined (a drill, a scripted run)
 * is treated as unhurried.
 */
export function caseEnergyCost(minutesSpent?: number): number {
  return minutesSpent !== undefined && minutesSpent < HASTE_MINUTES
    ? DRAIN_CASE_HASTY
    : DRAIN_CASE
}

/** What one trade costs, including the penalty for a busy hour. */
export function tradeEnergyCost(state: GameState): number {
  const recent = state.portfolio.trades.filter(
    (t) => t.day === state.clock.day && state.clock.minute - t.minute < CHURN_WINDOW,
  ).length
  return DRAIN_TRADE + (recent >= CHURN_TRADES - 1 ? DRAIN_CHURN : 0)
}

export function spendEnergy(player: Player, amount: number): Player {
  return { ...player, energy: clampEnergy(player.energy - amount) }
}

export function restoreEnergy(player: Player, amount: number): Player {
  return { ...player, energy: clampEnergy(player.energy + amount) }
}
