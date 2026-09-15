import type { Replay } from './types'
import { satyamReplay } from './satyam-2008'
import { ilfsReplay } from './ilfs-2018'

/**
 * Issue B7. Replays of real, concluded periods.
 *
 * Principle 5 keeps the *playable simulation* fictional and that does not
 * change: no real company ever appears in the market, the loan files or the
 * price series. Replaying a labelled, concluded, sourced past period is
 * history, which is the same reasoning that already permits the Casebook.
 *
 * The hard rule for this folder, and the reason it is small: **every fact in a
 * replay must already appear on the Casebook card it is drawn from**, which
 * means it has been through the issue A5 source check and carries the card's
 * citations. Nothing here invents a price, a date or a figure to make a step
 * work. Where the record is coarse, the step is coarse.
 *
 * That is also why the drills are decision-shaped rather than trading-shaped.
 * A tick-by-tick replay would need intraday data nobody here has, and inventing
 * it under a real company's name is exactly the thing the project refuses to do.
 */
export const REPLAYS: Replay[] = [satyamReplay, ilfsReplay]

export function getReplay(id: string): Replay | undefined {
  return REPLAYS.find((r) => r.id === id)
}

export type { Replay, ReplayStep } from './types'
