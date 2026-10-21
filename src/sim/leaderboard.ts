/**
 * Issue B9. The class leaderboard — two boards, kept apart on purpose.
 *
 * The learning board ranks on work: what somebody passed, how accurately, and
 * how much better they got between their first try and their latest. Nothing
 * on it can be won by a lucky day in the market, which is the whole claim the
 * game makes about itself.
 *
 * The trading board ranks on profit and loss from the market alone. It exists
 * because pretending students don't care who made the most money does not stop
 * them caring — better to show it, label it honestly, and keep it off the
 * board that counts. Both are percentages of the same starting capital, never
 * balances: see MemberSummary in sim/cohort.ts for why.
 *
 * Pure. The rows come from class_board() in docs/supabase.sql, which is what
 * decides who is allowed to read them.
 */

/** one member's published figures, as the database hands them over */
export interface BoardMember {
  userId: string
  displayName: string
  workPassed: number
  accuracy: number | null
  improvement: number | null
  returnPct: number | null
  day: number
}

export interface BoardRow {
  /** shared by everyone on the same figures: 1, 2, 2, 4 */
  rank: number
  member: BoardMember
  /** the player reading the board */
  me: boolean
}

export type BoardKind = 'learning' | 'trading'

/** what each board is ranked on, in a sentence a student can argue with */
export const BOARD_RULE: Record<BoardKind, string> = {
  learning:
    'Ranked on work passed first, then on how accurate it was, then on how much someone improved between tries. Nothing here moves because of a lucky day in the market.',
  trading:
    'Ranked on profit and loss from trading only (wages from a job do not count) as a percentage of the ₹5,00,000 everybody starts with. This one is partly luck, and it is kept separate for that reason.',
}

/* The comparison keys. Each returns the values to sort on, most significant
   first, with ties on the whole key sharing a rank. Nulls sort last whichever
   way the column runs — somebody who has not tried anything has not come
   last, they are simply not on the board yet. */

const LOW = Number.NEGATIVE_INFINITY
const at = (n: number | null): number => (n === null ? LOW : n)

const keyOf = (kind: BoardKind, m: BoardMember): number[] =>
  kind === 'learning'
    ? [m.workPassed, at(m.accuracy), at(m.improvement)]
    : [at(m.returnPct)]

const compare = (a: number[], b: number[]): number => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return b[i] - a[i]
  return 0
}

/** has this member published enough to stand on that board at all? */
export function eligible(kind: BoardKind, m: BoardMember): boolean {
  return kind === 'learning' ? m.accuracy !== null || m.workPassed > 0 : m.returnPct !== null
}

/**
 * The board, best first. `meId` marks the reader's own row so the screen can
 * find it without searching by name — two students may well pick the same one.
 */
export function board(kind: BoardKind, members: BoardMember[], meId?: string): BoardRow[] {
  const standing = members
    .filter((m) => eligible(kind, m))
    .sort((a, b) => {
      const c = compare(keyOf(kind, a), keyOf(kind, b))
      return c !== 0 ? c : a.displayName.localeCompare(b.displayName)
    })

  let rank = 0
  let previous: number[] | null = null
  return standing.map((member, i) => {
    const key = keyOf(kind, member)
    if (previous === null || compare(previous, key) !== 0) rank = i + 1
    previous = key
    return { rank, member, me: member.userId === meId }
  })
}

/**
 * Where the reader stands, for the line under the board. Returns null when
 * they are on it and already visible in the top few, so the screen can say
 * nothing rather than repeat a row they are looking at.
 */
export function myStanding(rows: BoardRow[], shown: number): BoardRow | null {
  const mine = rows.findIndex((r) => r.me)
  if (mine === -1 || mine < shown) return null
  return rows[mine]
}
