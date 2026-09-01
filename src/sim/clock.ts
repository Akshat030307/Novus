import type { Clock, DayPhase, DayEndReport, GameState } from '@/sim/types'
import { MARKET_OPEN, MARKET_CLOSE } from '@/lib/format'
import { rollMarketDay } from '@/sim/market'
import { rollDayEvent } from '@/sim/events'
import { analyseDay, logMistakes } from '@/sim/analysis'

/**
 * Step 7. One real second = one game minute, so a trading day (9:15 to 3:30)
 * runs about six real minutes.
 *
 * Everything here is pure — no timer, no store, no `Math.random()`. The timer
 * lives in state/useGameClock.ts, which is the only part that ticks. At the
 * close it hands off to buildDayEndReport() and startNextDay().
 *
 * The driver ticks the market and fires the day's event; buildDayEndReport
 * peeks at tomorrow's headline (recomputed, nothing stored).
 */

/** the next day opens on a short pre-open beat before 9:15 */
export const DAY_START_MINUTE = MARKET_OPEN - 15 // 9:00 am

export function phaseFor(minute: number): DayPhase {
  if (minute < MARKET_OPEN) return 'pre_open'
  if (minute < MARKET_CLOSE) return 'open'
  return 'closed'
}

/**
 * One game minute forward. Never runs past the close: the minute freezes at
 * MARKET_CLOSE and `closed` is true on the tick that first reaches it — the
 * driver's cue to show the day-end summary.
 */
export function advanceClock(clock: Clock): { clock: Clock; closed: boolean } {
  if (clock.minute >= MARKET_CLOSE) {
    return { clock: { ...clock, phase: 'closed' }, closed: false }
  }
  const minute = clock.minute + 1
  return { clock: { ...clock, minute, phase: phaseFor(minute) }, closed: minute >= MARKET_CLOSE }
}

/** Roll into the next trading day. `rollMarketDay` clears the day's events; the
 *  next day's fires from the driver when the clock reaches it. */
export function startNextDay(state: GameState): GameState {
  // log the day's mistakes before the clock rolls past it
  const logged = logMistakes(state)
  return {
    ...logged,
    clock: {
      day: logged.clock.day + 1,
      minute: DAY_START_MINUTE,
      phase: phaseFor(DAY_START_MINUTE),
    },
    market: rollMarketDay(logged.market),
  }
}

/**
 * The summary shown at 3:30. Open P&L, trade count and case XP for the day are
 * real; booked-P&L-today still needs a day-open snapshot (trade XP isn't
 * counted here — it isn't recorded per trade).
 */
export function buildDayEndReport(state: GameState): DayEndReport {
  const { player, portfolio, market } = state

  const invested = portfolio.holdings.reduce((t, h) => t + h.averageCost * h.quantity, 0)
  const value = portfolio.holdings.reduce((t, h) => {
    const price = market.stocks.find((s) => s.id === h.stockId)?.price ?? h.averageCost
    return t + price * h.quantity
  }, 0)

  return {
    day: state.clock.day,
    cashOpen: player.cash,
    cashClose: player.cash,
    realisedPnL: 0,
    unrealisedPnL: value - invested,
    tradeCount: portfolio.trades.filter((t) => t.day === state.clock.day).length,
    xpGained: state.cases.resolved
      .filter((r) => r.day === state.clock.day)
      .reduce((t, r) => t + r.xpChange, 0),
    reputationChange: 0,
    questsCompleted: [],
    tomorrowHeadline: rollDayEvent(state.seed, state.clock.day + 1)?.event.headline ?? null,
    lesson: analyseDay(state),
  }
}
