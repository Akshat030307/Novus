import type { GameState } from '@/sim/types'
import type { Attempt } from '@/sim/attempts'
import { bestAttempt, progressOn } from '@/sim/attempts'
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
}

/**
 * What a member shares. Deliberately a summary rather than the save: an
 * instructor has no business reading someone's cash, their career or their
 * transcripts, and the cheapest way to guarantee that is to never send them.
 */
export function buildSummary(state: GameState): MemberSummary {
  const mistakes: Record<string, number> = {}
  for (const m of state.mistakes) mistakes[m.kind] = (mistakes[m.kind] ?? 0) + 1

  return {
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
