/**
 * Issue B2. One attempt at a drill or a module check.
 *
 * Deliberately not part of `GameState`: the world save is one slot and always
 * will be, but a learning record is the opposite shape — append-only, never
 * overwritten, and still interesting after the run it came from is gone. The
 * two are kept in separate stores and separate tables for that reason.
 *
 * Scores are whole over whole — 3 of 5, not 0.6 — so nothing rounds on the way
 * in and the fraction shown is the fraction stored. `percent` is for display
 * and is computed on the way out, never saved.
 *
 * Pure: shapes and readers only. Ids and timestamps are minted in
 * `state/attempts.ts`, because neither belongs to the seeded world.
 */

export type AttemptKind = 'module' | 'drill'

export interface Attempt {
  id: string
  kind: AttemptKind
  /** module id or scenario id */
  refId: string
  score: number
  outOf: number
  passed: boolean
  /** ISO timestamp, minted when the attempt was recorded */
  at: string
  /** runner-specific extras, e.g. how many risk reads were right */
  detail?: Record<string, number>
}

/** what to write; the store fills in the rest */
export type NewAttempt = Omit<Attempt, 'id' | 'at'>

export const percent = (a: Attempt): number => Math.round((a.score / a.outOf) * 100)

export const asFraction = (a: Attempt): string => `${a.score}/${a.outOf}`

/** every attempt at one thing, newest first */
export function attemptsFor(all: Attempt[], refId: string): Attempt[] {
  return all.filter((a) => a.refId === refId).sort((x, y) => (x.at < y.at ? 1 : -1))
}

/** the best score, ties broken by the earliest — reaching it sooner is better */
export function bestAttempt(all: Attempt[], refId: string): Attempt | null {
  const mine = attemptsFor(all, refId)
  if (mine.length === 0) return null
  return mine.reduce((best, a) =>
    percent(a) > percent(best) || (percent(a) === percent(best) && a.at < best.at) ? a : best,
  )
}

/**
 * First attempt against most recent. This is the figure the whole issue exists
 * for — a single best score hides whether someone improved or got lucky once.
 * Null until there are two attempts to compare.
 */
export interface Progress {
  first: Attempt
  latest: Attempt
  /** percentage points gained since the first go; may be negative */
  gained: number
  tries: number
}

export function progressOn(all: Attempt[], refId: string): Progress | null {
  const mine = attemptsFor(all, refId)
  if (mine.length < 2) return null
  const latest = mine[0]
  const first = mine[mine.length - 1]
  return { first, latest, gained: percent(latest) - percent(first), tries: mine.length }
}
