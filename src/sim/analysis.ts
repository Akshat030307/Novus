import type { GameState, MistakeRecord } from '@/sim/types'
import { getCase } from '@/data/cases'
import { rupees } from '@/lib/format'

/**
 * Step C-e. Reads the day just finished and says one useful thing about it.
 * Pure — no store, no rng. `analyseDay` writes the day-end debrief line;
 * `spotMistakes` writes the records the Mistakes panel later finds patterns
 * in. Both look only at activity dated to `state.clock.day`.
 */

/** the biggest single holding as a share of the whole book, if there is one */
function topHolding(state: GameState): { name: string; share: number } | null {
  const { holdings } = state.portfolio
  if (holdings.length === 0) return null
  const priceOf = (id: string) => state.market.stocks.find((s) => s.id === id)?.price ?? 0
  const nameOf = (id: string) => state.market.stocks.find((s) => s.id === id)?.name ?? id
  const valued = holdings.map((h) => ({ name: nameOf(h.stockId), value: priceOf(h.stockId) * h.quantity }))
  const total = valued.reduce((t, v) => t + v.value, 0)
  if (total <= 0) return null
  const top = valued.reduce((a, b) => (b.value > a.value ? b : a))
  return { name: top.name, share: top.value / total }
}

const NOISE_TRADES = 6 // trades in one ~6-minute day past which it's churn
const CONCENTRATION = 0.6

export function analyseDay(state: GameState): string | null {
  const day = state.clock.day

  const unsoundToday = state.cases.resolved.filter(
    (r) => r.day === day && r.judgement === 'unsound',
  )
  if (unsoundToday.length > 0) {
    return 'You made an unsound call today. The outcome is a roll — the reasoning is the part to go back over.'
  }

  const top = topHolding(state)
  if (top && top.share >= CONCENTRATION) {
    return `Your book is ${Math.round(top.share * 100)}% ${top.name}. One bad headline there is a bad day — spread it out.`
  }

  const tradesToday = state.portfolio.trades.filter((t) => t.day === day).length
  if (tradesToday >= NOISE_TRADES) {
    return `${tradesToday} trades today. On a quiet tape most of that is noise, not signal.`
  }

  return null
}

export function spotMistakes(state: GameState): MistakeRecord[] {
  const day = state.clock.day
  const found: MistakeRecord[] = []

  for (const r of state.cases.resolved) {
    if (r.day !== day || r.judgement !== 'unsound') continue
    const title = getCase(r.caseId)?.title ?? r.caseId
    found.push({
      id: `unsound_call-${day}-${r.caseId}`,
      kind: 'unsound_call',
      day,
      note: `${title} — the figures on the file did not support that call.`,
    })
  }

  const top = topHolding(state)
  if (top && top.share >= CONCENTRATION) {
    found.push({
      id: `concentration-${day}`,
      kind: 'concentration',
      day,
      note: `Ended the day ${Math.round(top.share * 100)}% in ${top.name}. That is a bet on one stock, whatever else is in the book.`,
    })
  }

  const tradesToday = state.portfolio.trades.filter((t) => t.day === day)
  if (tradesToday.length >= NOISE_TRADES) {
    const turnover = tradesToday.reduce((t, x) => t + x.price * x.quantity, 0)
    found.push({
      id: `noise_trade-${day}`,
      kind: 'noise_trade',
      day,
      note: `${tradesToday.length} trades in one day, ${rupees(turnover, { short: true })} turned over. Reacting to every tick.`,
    })
  }

  return found
}

/** append the day's mistakes to the log, skipping any already recorded */
export function logMistakes(state: GameState): GameState {
  const have = new Set(state.mistakes.map((m) => m.id))
  const fresh = spotMistakes(state).filter((m) => !have.has(m.id))
  if (fresh.length === 0) return state
  return { ...state, mistakes: [...state.mistakes, ...fresh] }
}
