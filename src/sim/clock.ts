import type { Clock, DayPhase, DayEndReport, DayOpen, GameState, Paise } from '@/sim/types'
import { MARKET_OPEN, MARKET_CLOSE } from '@/lib/format'
import { rollMarketDay } from '@/sim/market'
import { rollDayEvent } from '@/sim/events'
import { analyseDay, logMistakes } from '@/sim/analysis'
import { restoreEnergy, RESTORE_OVERNIGHT } from '@/sim/energy'
import { getQuestDef } from '@/data/quests'

/**
 * Step 7. One real second = one game minute, so a trading day (9:15 to 3:30)
 * runs about six real minutes.
 *
 * Everything here is pure — no timer, no store, no `Math.random()`. The timer
 * lives in state/useGameClock.ts, which is the only part that ticks. At the
 * close it hands off to buildDayEndReport() and startNextDay().
 *
 * Issue A1: the close diffs against `state.dayOpen`, a snapshot taken when the
 * day started. Before that snapshot existed, four of the report's figures were
 * hardcoded.
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

/** mark-to-market value of every open position, at today's prices */
export function holdingsValue(state: GameState): Paise {
  return state.portfolio.holdings.reduce((total, h) => {
    const price = state.market.stocks.find((s) => s.id === h.stockId)?.price ?? h.averageCost
    return total + price * h.quantity
  }, 0)
}

/** what the close will diff against */
export function snapshotDayOpen(state: GameState): DayOpen {
  return {
    day: state.clock.day,
    cash: state.player.cash,
    reputation: state.player.reputation,
    realisedPnL: state.portfolio.realisedPnL,
    holdingsValue: holdingsValue(state),
    questsCompleted: [...state.quests.completed],
  }
}

/** Roll into the next trading day. `rollMarketDay` clears the day's events; the
 *  next day's fires from the driver when the clock reaches it. */
export function startNextDay(state: GameState): GameState {
  // log the day's mistakes before the clock rolls past it
  const logged = logMistakes(state)
  const rolled: GameState = {
    ...logged,
    player: restoreEnergy(logged.player, RESTORE_OVERNIGHT),
    clock: {
      day: logged.clock.day + 1,
      minute: DAY_START_MINUTE,
      phase: phaseFor(DAY_START_MINUTE),
    },
    market: rollMarketDay(logged.market),
  }
  // snapshot last, so the new day opens against the new day's prices
  return { ...rolled, dayOpen: snapshotDayOpen(rolled) }
}

/**
 * The summary shown at 3:30, every figure diffed against the day's open.
 *
 * `unrealisedPnL` is the unbooked profit still sitting in open positions, not
 * a daily delta — buying during the day moves position *value* without moving
 * profit, so a close-minus-open on value would read as a phantom gain.
 */
export function buildDayEndReport(state: GameState): DayEndReport {
  const { player, portfolio, clock, quests } = state
  // a save from before A1 (or a hand-built state) may not have today's open
  const open = state.dayOpen?.day === clock.day ? state.dayOpen : snapshotDayOpen(state)

  const invested = portfolio.holdings.reduce((t, h) => t + h.averageCost * h.quantity, 0)
  const value = holdingsValue(state)

  const finishedToday = quests.completed.filter((id) => !open.questsCompleted.includes(id))

  return {
    day: clock.day,
    cashOpen: open.cash,
    cashClose: player.cash,
    realisedPnL: portfolio.realisedPnL - open.realisedPnL,
    unrealisedPnL: value - invested,
    /** cash + open positions, close against open — the honest day figure */
    netChange: player.cash + value - (open.cash + open.holdingsValue),
    tradeCount: portfolio.trades.filter((t) => t.day === clock.day).length,
    xpGained: state.cases.resolved
      .filter((r) => r.day === clock.day)
      .reduce((t, r) => t + r.xpChange, 0),
    reputationChange: player.reputation - open.reputation,
    questsCompleted: finishedToday.map((id) => getQuestDef(id)?.title ?? id),
    tomorrowHeadline: rollDayEvent(state.seed, clock.day + 1)?.event.headline ?? null,
    lesson: analyseDay(state),
  }
}
