import type { Clock, MarketEvent, MarketState, Paise, Sector, Stock } from '@/sim/types'
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

/** The three forces behind one minute's move, before they are collapsed. */
export interface MoveTerms {
  drift: number
  noise: number
  shock: number
  /** the three added and clamped — what actually multiplies the price */
  total: number
}

/**
 * One stock, one minute. The single place the three terms are combined, so
 * `tickMarket` and `explainDay` can never disagree about what moved a price.
 */
function moveTerms(stock: Stock, z: number, events: MarketEvent[], clock: Clock): MoveTerms {
  const drift = driftTerm(stock)
  const noise = noiseTerm(stock, z)
  const shock = shockTerm(events, stock.sector, clock)
  return { drift, noise, shock, total: clamp(drift + noise + shock, -MAX_STEP, MAX_STEP) }
}

const stepPrice = (price: number, total: number) => Math.max(1, Math.round(price * (1 + total)))

/** One game minute of price movement. Pure — returns a fresh MarketState. */
export function tickMarket(market: MarketState, seed: string, clock: Clock): MarketState {
  const rng = makeRng(`${seed}|${clock.day}|${clock.minute}`)

  const stocks = market.stocks.map((stock) => {
    const { total } = moveTerms(stock, rng.normal(), market.activeEvents, clock)
    return { ...stock, price: stepPrice(stock.price, total) }
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

/* ---------- issue B6: what actually moved this thing today ---------- */

/** Today's move, split across the three forces that caused it. */
export interface DayAttribution {
  from: Paise
  to: Paise
  /** paise of today's move owed to each force; the three sum to `to - from` */
  drift: Paise
  noise: Paise
  shock: Paise
  minutes: number
  /** false if the replay didn't land on the live price — then don't show it */
  exact: boolean
}

/**
 * Replay the day for one stock and attribute every paise of its move.
 *
 * Nothing about this is stored. The rng is a pure function of seed, day and
 * minute, and `activeEvents` keeps the whole day's events (they are cleared
 * only at the roll), so the day can be recomputed exactly from the save —
 * which is also what `exact` checks.
 *
 * Each minute's realised move is split between drift, noise and shock in
 * proportion to their share of that minute's total, so the parts always add
 * back up to the whole. A term can exceed the total or run against it — drift
 * pulling up while noise drags down is real, and worth seeing.
 *
 * The point of showing this: on almost every quiet day, noise dwarfs both the
 * drift and any sector shock. That is the lesson.
 */
export function explainDay(
  market: MarketState,
  seed: string,
  clock: Clock,
  stockId: string,
): DayAttribution | null {
  const index = market.stocks.findIndex((s) => s.id === stockId)
  if (index < 0) return null

  const live = market.stocks[index]
  // the driver stops ticking the moment the clock reaches MARKET_CLOSE — the
  // phase flips to 'closed' before that minute is ever ticked, so the last
  // real tick of the day is MARKET_CLOSE - 1
  const upto = Math.min(clock.minute, MARKET_CLOSE - 1)
  if (upto < MARKET_OPEN) return null // nothing has traded yet today

  let price: number = live.previousClose
  let drift = 0
  let noise = 0
  let shock = 0

  for (let minute = MARKET_OPEN; minute <= upto; minute++) {
    const rng = makeRng(`${seed}|${clock.day}|${minute}`)
    // the tick draws one normal per stock, in order — walk to this one's
    for (let i = 0; i < index; i++) rng.normal()

    const at: Clock = { ...clock, minute }
    const terms = moveTerms({ ...live, price }, rng.normal(), market.activeEvents, at)
    const next = stepPrice(price, terms.total)
    const moved = next - price

    if (terms.total !== 0) {
      drift += (moved * terms.drift) / terms.total
      noise += (moved * terms.noise) / terms.total
      shock += (moved * terms.shock) / terms.total
    }
    price = next
  }

  return {
    from: live.previousClose,
    to: live.price,
    drift: Math.round(drift),
    noise: Math.round(noise),
    shock: Math.round(shock),
    minutes: upto - MARKET_OPEN + 1,
    exact: price === live.price,
  }
}
