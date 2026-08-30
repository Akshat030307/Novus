import type { Clock, MarketEvent, MarketState, Sector, Stock } from '@/sim/types'
import { makeRng } from '@/sim/rng'
import { MARKET_OPEN, MARKET_CLOSE } from '@/lib/format'

/**
 * Step 8. Price movement, three forces added together each game minute:
 *
 *   drift  = a gentle pull toward the hidden fairValue
 *   noise  = rng.normal() * volatility, scaled down to one minute
 *   shock  = decaying per-sector effects from active events (step 13)
 *
 *   price = round( price * (1 + drift + noise + shock) )
 *
 * Deterministic: the rng is re-seeded every tick from seed|day|minute, so
 * nothing about it needs saving — a loaded save resumes bit-identically from
 * the stored prices and history.
 *
 * TUNING — do this by playing, not by reasoning (see docs/build-steps.md).
 * These four constants and each stock's `volatility` in data/stocks.ts are the
 * dials for "alive but not frantic".
 */
const SESSION_MINUTES = MARKET_CLOSE - MARKET_OPEN // 375
/** fraction of the price-to-fair gap pulled in per minute */
const DRIFT_PER_MIN = 0.0006
/** 1 = a stock's volatility spread evenly across the trading day */
const NOISE_SCALE = 1
/** no single minute may move a price by more than this */
const MAX_STEP = 0.05
/** points of history kept per stock (architecture: last ~200) */
const HISTORY_CAP = 200

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

function driftTerm(stock: Stock): number {
  return DRIFT_PER_MIN * ((stock.fairValue - stock.price) / stock.price)
}

function noiseTerm(stock: Stock, z: number): number {
  return z * (stock.volatility / Math.sqrt(SESSION_MINUTES)) * NOISE_SCALE
}

function shockTerm(events: MarketEvent[], sector: Sector, clock: Clock): number {
  let total = 0
  for (const ev of events) {
    const base = ev.sectorShocks[sector]
    if (base === undefined) continue
    const elapsed =
      (clock.day - ev.firedAt.day) * SESSION_MINUTES + (clock.minute - ev.firedAt.minute)
    if (elapsed < 0 || elapsed >= ev.decayMinutes) continue
    // linear decay, spread over the event's life so the total impulse is
    // roughly `base`. Step 13 tunes this against real events.
    total += (base / ev.decayMinutes) * (1 - elapsed / ev.decayMinutes) * 2
  }
  return total
}

/** One game minute of price movement. Pure — returns a fresh MarketState. */
export function tickMarket(market: MarketState, seed: string, clock: Clock): MarketState {
  const rng = makeRng(`${seed}|${clock.day}|${clock.minute}`)

  const stocks = market.stocks.map((stock) => {
    const delta = clamp(
      driftTerm(stock) +
        noiseTerm(stock, rng.normal()) +
        shockTerm(market.activeEvents, stock.sector, clock),
      -MAX_STEP,
      MAX_STEP,
    )
    return { ...stock, price: Math.max(1, Math.round(stock.price * (1 + delta))) }
  })

  const history: MarketState['history'] = { ...market.history }
  for (const stock of stocks) {
    const series = [
      ...(history[stock.id] ?? []),
      { day: clock.day, minute: clock.minute, price: stock.price },
    ]
    history[stock.id] = series.length > HISTORY_CAP ? series.slice(-HISTORY_CAP) : series
  }

  return { ...market, stocks, history }
}

/**
 * Day rollover: yesterday's close becomes the reference for today's day-change
 * figure, and the day's events are cleared — a day is self-contained, its shock
 * has played out by the close. History keeps rolling across days.
 */
export function rollMarketDay(market: MarketState): MarketState {
  return {
    ...market,
    activeEvents: [],
    stocks: market.stocks.map((s) => ({ ...s, previousClose: s.price })),
  }
}
