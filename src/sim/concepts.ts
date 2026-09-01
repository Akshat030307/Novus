import type { GameState } from './types'

/**
 * Step C-a. Which Ledger concepts unlock once a given case is resolved — a
 * plain map from case id to concept id, kept separate from the free-text
 * `teaches` on the case itself (that stays display-only, for the outcome
 * explanation).
 */
const CASE_CONCEPTS: Record<string, string[]> = {
  'loan-sharma-textiles': ['debt-service-cover', 'collateral-cover', 'credit-score', 'default-risk'],
  'loan-anand-dairy': ['margin'],
  'loan-girish-steel': ['leverage'],
  'loan-prakash-cold-storage': ['collateral-cover'],
  'loan-vector-trading': ['operating-cash-flow'],
}

/** any single holding worth this share of the book or more counts as concentrated */
const CONCENTRATION_THRESHOLD = 0.5

function isConcentrated(state: GameState): boolean {
  const { holdings } = state.portfolio
  if (holdings.length === 0) return false
  const priceOf = (id: string) => state.market.stocks.find((s) => s.id === id)?.price ?? 0
  const values = holdings.map((h) => priceOf(h.stockId) * h.quantity)
  const total = values.reduce((a, b) => a + b, 0)
  return total > 0 && values.some((v) => v / total >= CONCENTRATION_THRESHOLD)
}

/**
 * Recomputes which Ledger concepts the player should know by now, from the
 * save alone — nothing extra to keep in sync. Pure and idempotent: safe to
 * call after any action, and a concept once learned is never un-learned.
 */
export function checkConcepts(state: GameState): { state: GameState; unlocked: string[] } {
  const shouldKnow = new Set<string>()

  for (const r of state.cases.resolved) {
    for (const id of CASE_CONCEPTS[r.caseId] ?? []) shouldKnow.add(id)
  }
  if (state.portfolio.trades.length > 0) {
    shouldKnow.add('pe-ratio')
    shouldKnow.add('debt-to-equity')
    shouldKnow.add('unrealised-pnl')
  }
  if (isConcentrated(state)) shouldKnow.add('diversification')
  if (state.notifications.some((n) => n.kind === 'market')) shouldKnow.add('drift-noise-shock')

  const already = new Set(state.learned)
  const unlocked = [...shouldKnow].filter((id) => !already.has(id))
  if (unlocked.length === 0) return { state, unlocked: [] }

  return { state: { ...state, learned: [...state.learned, ...unlocked] }, unlocked }
}
