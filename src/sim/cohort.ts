import type { GameState } from '@/sim/types'
import type { Attempt } from '@/sim/attempts'
import { bestAttempt, percent, progressOn, type Progress } from '@/sim/attempts'
import { bookSummary } from '@/sim/portfolio'
import { STARTING_CAPITAL } from '@/sim/economy'
import { CONCEPTS } from '@/data/concepts'
import { MODULES } from '@/data/modules'
import { moduleProgress } from '@/sim/modules'

/**
 * Issue B3. What an instructor actually needs, computed from what a cohort can
 * legitimately see.
 *
 * The interesting half is not the completion table — every product has one of
 * those. It is `whatToTeachNext`: the game already logs typed mistakes per
 * player, so the same records that tell one student "you keep trading the
 * noise" tell a teacher "eleven of your nineteen students keep trading the
 * noise, take the first fifteen minutes of Thursday on it." Nothing else in
 * this market does that, and it falls out of work already done.
 *
 * Pure. `state/cohorts.ts` fetches; this decides what the numbers mean.
 */

/** the compact, self-published progress a member shares with their cohort */
export interface MemberSummary {
  day: number
  level: number
  modulesPassed: number
  modulesTotal: number
  conceptsLearned: number
  conceptsTotal: number
  soundCalls: number
  unsoundCalls: number
  /** mistake kind -> how many times it has been logged */
  mistakes: Record<string, number>

  /* ---- the class leaderboard (issue B9) ----
   * These five are read by classmates, not only by the teacher, through
   * class_board() in docs/supabase.sql. Everything above stays teacher-only.
   * They are figures about work and about trading, never a balance: a board
   * of everyone's cash is both a privacy leak and a contest in luck. */

  /** drills and module checks passed, counted once each however many tries */
  workPassed?: number
  /** mean best score across everything attempted, in percent; null if nothing */
  accuracy?: number | null
  /** mean points gained between first and latest try; null with nothing to compare */
  improvement?: number | null
  /** trading profit as a percentage of the capital everybody starts with */
  returnPct?: number
  /** the student asked to be left off the class board */
  hidden?: boolean
}

export interface CohortMember {
  userId: string
  displayName: string
  summary: MemberSummary | null
  joinedAt: string
}

export interface Assignment {
  id: string
  kind: 'drill' | 'module'
  refId: string
  title: string
  dueAt: string | null
  /** set work that does not count towards the class figures — practice, not homework */
  optional?: boolean
}

/**
 * What a member shares. Deliberately a summary rather than the save: an
 * instructor has no business reading someone's cash, their career or their
 * transcripts, and the cheapest way to guarantee that is to never send them.
 */
export function buildSummary(state: GameState, attempts: Attempt[] = []): MemberSummary {
  const mistakes: Record<string, number> = {}
  for (const m of state.mistakes) mistakes[m.kind] = (mistakes[m.kind] ?? 0) + 1

  // one best attempt per thing attempted — a drill run forty times is still
  // one piece of work, and counting runs would reward grinding over learning
  const refs = [...new Set(attempts.map((a) => a.refId))]
  const bests = refs.map((r) => bestAttempt(attempts, r)).filter((b): b is Attempt => b !== null)
  const gains = refs
    .map((r) => progressOn(attempts, r))
    .filter((p): p is Progress => p !== null)

  const book = bookSummary(state)
  // realised plus unrealised, against the capital everyone opens with. Wages
  // from a job are deliberately left out: this board is about the market.
  const traded = state.portfolio.realisedPnL + book.unrealised

  return {
    workPassed: bests.filter((b) => b.passed).length,
    accuracy: bests.length === 0 ? null : round1(mean(bests.map(percent))),
    improvement: gains.length === 0 ? null : round1(mean(gains.map((g) => g.gained))),
    returnPct: round1((traded / STARTING_CAPITAL) * 100),
    day: state.clock.day,
    level: state.player.level,
    modulesPassed: MODULES.filter((m) => moduleProgress(state, m.id).passed).length,
    modulesTotal: MODULES.length,
    conceptsLearned: state.learned.length,
    conceptsTotal: CONCEPTS.length,
    soundCalls: state.cases.resolved.filter((r) => r.judgement === 'sound').length,
    unsoundCalls: state.cases.resolved.filter((r) => r.judgement === 'unsound').length,
    mistakes,
  }
}

const mean = (xs: number[]): number => xs.reduce((t, x) => t + x, 0) / xs.length
const round1 = (n: number): number => Math.round(n * 10) / 10

/* ---------- the completion table ---------- */

export interface Cell {
  /** null where they have not attempted it at all */
  best: Attempt | null
  tries: number
  /** gained since the first attempt, in percentage points; null under two tries */
  gained: number | null
  /** attempted after the deadline, and only then */
  late: boolean
}

export interface Row {
  member: CohortMember
  cells: Cell[]
  done: number
  passed: number
}

export function buildRows(
  members: CohortMember[],
  assignments: Assignment[],
  attempts: Attempt[],
): Row[] {
  const byUser = new Map<string, Attempt[]>()
  for (const a of attempts) {
    // an attempt's owner is carried alongside it by state/cohorts.ts
    const owner = (a as Attempt & { userId?: string }).userId ?? ''
    if (!byUser.has(owner)) byUser.set(owner, [])
    byUser.get(owner)!.push(a)
  }

  return members
    .map((member) => {
      const mine = byUser.get(member.userId) ?? []
      const cells = assignments.map((assignment) => {
        const best = bestAttempt(mine, assignment.refId)
        const prog = progressOn(mine, assignment.refId)
        const all = mine.filter((a) => a.refId === assignment.refId)
        return {
          best,
          tries: all.length,
          gained: prog ? prog.gained : null,
          // late only if *every* attempt came after the deadline — someone who
          // did it on time and practised again afterwards has not been late
          late: Boolean(
            assignment.dueAt && all.length > 0 && all.every((a) => a.at > assignment.dueAt!),
          ),
        }
      })
      return {
        member,
        cells,
        done: cells.filter((c) => c.best).length,
        passed: cells.filter((c) => c.best?.passed).length,
      }
    })
    .sort((a, b) => a.member.displayName.localeCompare(b.member.displayName))
}

/* ---------- the part a teacher can act on ---------- */

export interface Lesson {
  /** what to put in front of the class */
  headline: string
  /** how many of them it applies to */
  affected: number
  of: number
  /** why this came up */
  detail: string
}

const MISTAKE_LESSON: Record<string, { headline: string; detail: string }> = {
  unsound_call: {
    headline: 'Judging the call by how it turned out',
    detail:
      'They are reading the outcome back into the decision. Worth an exercise where a sound call loses money and an unsound one does not.',
  },
  concentration: {
    headline: 'One name, most of the book',
    detail:
      'Counting holdings instead of spreading risk. The allocation case makes this visible faster than explaining it does.',
  },
  noise_trade: {
    headline: 'Trading the noise',
    detail:
      'Reacting to movement that means nothing. The price breakdown under the chart shows how little of a day is signal.',
  },
  missed_flags: {
    headline: 'Reading a file too fast',
    detail:
      'The tells are being missed, or everything is being flagged at once. Slow down the compliance files and mark the decoys together.',
  },
}

/**
 * The teaching agenda, most widespread first. Only things at least a quarter
 * of the cohort are doing — a lesson plan built around one student's habit is
 * not a lesson plan.
 */
export function whatToTeachNext(rows: Row[], assignments: Assignment[]): Lesson[] {
  const withSummary = rows.filter((r) => r.member.summary)
  const lessons: Lesson[] = []
  const of = rows.length
  if (of === 0) return lessons
  // at least a quarter of the class, and never fewer than two people — one
  // student's habit is a conversation with that student, not a lesson plan
  const threshold = Math.max(2, Math.ceil(of / 4))

  for (const [kind, copy] of Object.entries(MISTAKE_LESSON)) {
    const affected = withSummary.filter((r) => (r.member.summary!.mistakes[kind] ?? 0) > 0).length
    if (affected >= threshold) lessons.push({ ...copy, affected, of })
  }

  assignments.forEach((assignment, i) => {
    if (assignment.optional) return
    const attempted = rows.filter((r) => r.cells[i].best)
    const failing = attempted.filter((r) => !r.cells[i].best!.passed).length
    if (attempted.length >= threshold && failing >= threshold) {
      lessons.push({
        headline: `${assignment.title} is not landing`,
        affected: failing,
        of: attempted.length,
        detail:
          'Most of the people who have attempted it have not cleared it. Worth working one through together before setting it again.',
      })
    }
  })

  const notStarted = rows.filter((r) => r.done === 0).length
  if (assignments.length > 0 && notStarted >= threshold) {
    lessons.push({
      headline: 'A group has not started at all',
      affected: notStarted,
      of,
      detail: 'Not a teaching problem yet — check they can sign in and see the assignment.',
    })
  }

  return lessons.sort((a, b) => b.affected / b.of - a.affected / a.of)
}

/* ---------- the four figures at the top of a class ---------- */

export interface ClassTotals {
  students: number
  /** how many have published a progress summary at all */
  reporting: number
  /** student × assignment pairs */
  slots: number
  attempted: number
  passed: number
  late: number
}

export function classTotals(rows: Row[], assignments: Assignment[] = []): ClassTotals {
  // optional work is shown in the table but kept out of the figures: a teacher
  // asking "how far is my class" means the homework, not the extras
  const counts = (i: number) => !assignments[i]?.optional
  const cells = rows.flatMap((r) => r.cells.filter((_, i) => counts(i)))
  return {
    students: rows.length,
    reporting: rows.filter((r) => r.member.summary).length,
    slots: cells.length,
    attempted: cells.filter((c) => c.best).length,
    passed: cells.filter((c) => c.best?.passed).length,
    late: cells.filter((c) => c.late).length,
  }
}

/* ---------- what the performance charts draw ---------- */

export type ResultKind = 'passed' | 'notYet' | 'notStarted'

export interface AssignmentBreakdown {
  assignment: Assignment
  /** member ids in each bucket, so a chart can list or filter by them */
  passed: string[]
  notYet: string[]
  notStarted: string[]
}

/** per assignment: who has passed, who has tried and not yet, who hasn't started */
export function assignmentBreakdown(rows: Row[], assignments: Assignment[]): AssignmentBreakdown[] {
  return assignments.map((assignment, i) => {
    const out: AssignmentBreakdown = { assignment, passed: [], notYet: [], notStarted: [] }
    for (const r of rows) {
      const best = r.cells[i].best
      const bucket = !best ? out.notStarted : best.passed ? out.passed : out.notYet
      bucket.push(r.member.userId)
    }
    return out
  })
}

export function resultOf(cell: Cell): ResultKind {
  return !cell.best ? 'notStarted' : cell.best.passed ? 'passed' : 'notYet'
}

/** the habits a teacher can act on, in the order the lessons are written */
export const HABITS = Object.entries(MISTAKE_LESSON).map(([kind, l]) => ({ kind, label: l.headline }))

/**
 * One bucket per calendar day, oldest first, ending on `now`'s day. Days are
 * local, because a teacher reads "Tuesday" as their Tuesday. `now` is passed
 * in so the shape of the chart is a function of its inputs.
 */
export function activityByDay(
  attempts: Attempt[],
  now: number,
  days = 14,
): { day: string; passed: number; notYet: number }[] {
  const key = (t: number) => {
    const d = new Date(t)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  const buckets = new Map<string, { day: string; passed: number; notYet: number }>()
  const today = new Date(now)
  today.setHours(12, 0, 0, 0)
  for (let i = days - 1; i >= 0; i--) {
    const k = key(today.getTime() - i * 86_400_000)
    buckets.set(k, { day: k, passed: 0, notYet: 0 })
  }
  for (const a of attempts) {
    const b = buckets.get(key(Date.parse(a.at)))
    if (b) b[a.passed ? 'passed' : 'notYet']++
  }
  return [...buckets.values()]
}

/* ---------- taking the class out of the browser ---------- */

/** one CSV cell, quoted only when it has to be */
const cell = (v: string | number) => {
  const t = String(v)
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}

/**
 * The class as a spreadsheet: one row per student, one column per assignment,
 * plus the summary figures. Pure string building, so it can be tested and so
 * the download button has nothing to decide.
 */
export function toCsv(rows: Row[], assignments: Assignment[]): string {
  const head = [
    'Student',
    'Day',
    'Level',
    'Modules passed',
    'Modules total',
    'Concepts learned',
    'Concepts total',
    'Sound calls',
    'Unsound calls',
    ...assignments.flatMap((a) => [`${a.title} — result`, `${a.title} — score`, `${a.title} — attempts`]),
    ...HABITS.map((h) => `Habit: ${h.label}`),
  ]

  const body = rows.map((r) => {
    const s = r.member.summary
    return [
      r.member.displayName,
      s?.day ?? '',
      s?.level ?? '',
      s?.modulesPassed ?? '',
      s?.modulesTotal ?? '',
      s?.conceptsLearned ?? '',
      s?.conceptsTotal ?? '',
      s?.soundCalls ?? '',
      s?.unsoundCalls ?? '',
      ...r.cells.flatMap((c) => [
        !c.best ? 'not started' : c.best.passed ? 'passed' : 'not yet',
        c.best ? `${c.best.score}/${c.best.outOf}` : '',
        c.tries,
      ]),
      ...HABITS.map((h) => s?.mistakes[h.kind] ?? 0),
    ]
  })

  return [head, ...body].map((r) => r.map(cell).join(',')).join('\n')
}
