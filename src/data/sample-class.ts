import type { Attempt } from '@/sim/attempts'
import type { Assignment, CohortMember, MemberSummary } from '@/sim/cohort'
import { CONCEPTS } from '@/data/concepts'
import { MODULES } from '@/data/modules'

/**
 * The sample class at /teach/sample. Invented from end to end: no row here
 * came from, or will ever reach, the database.
 *
 * It exists because an empty dashboard cannot show what it is for. A teacher
 * deciding whether to use Novus should see a class with a week of play in it
 * — who has done the work, who is late, and the "what to teach next" box —
 * before they are asked to create one.
 *
 * Shaped so every part of the page has something in it, through the same
 * `buildRows` / `whatToTeachNext` a real class goes through:
 *   - trading the noise is the widest habit (7 of 12)
 *   - the credit desk is not landing (5 of the 11 who tried it)
 *   - judging calls by outcome (4) and missed tells (3) clear the bar
 *   - concentration (2) and the unstarted student (1) fall below it
 */

const DAY = 86_400_000

export const SAMPLE_CLASS_NAME = 'FY B.Com · Finance elective, Tuesday group'

type Row = [refId: string, score: number, outOf: number, daysAgo: number]
type Mistakes = Partial<Record<'unsound_call' | 'concentration' | 'noise_trade' | 'missed_flags', number>>

interface SampleStudent {
  name: string
  /** null: joined, never opened the Class tab again, so nothing published */
  summary: { day: number; level: number; modules: number; concepts: number; sound: number; unsound: number; mistakes: Mistakes } | null
  attempts: Row[]
}

const CD = 'credit-desk'
const CP = 'cash-vs-profit'
const IL = 'replay-ilfs'

const STUDENTS: SampleStudent[] = [
  {
    name: 'Aarav Menon',
    summary: { day: 11, level: 5, modules: 3, concepts: 9, sound: 8, unsound: 1, mistakes: { noise_trade: 2 } },
    attempts: [[CD, 3, 5, 9], [CD, 5, 5, 7], [CP, 4, 4, 4], [IL, 3, 3, 1]],
  },
  {
    name: 'Diya Kulkarni',
    summary: { day: 9, level: 4, modules: 2, concepts: 8, sound: 6, unsound: 1, mistakes: { unsound_call: 1 } },
    attempts: [[CD, 5, 5, 8], [CP, 3, 4, 3], [IL, 2, 3, 1]],
  },
  {
    name: 'Farhan Qureshi',
    summary: { day: 7, level: 3, modules: 1, concepts: 5, sound: 3, unsound: 3, mistakes: { noise_trade: 4, unsound_call: 2, concentration: 1 } },
    attempts: [[CD, 2, 5, 8], [CD, 3, 5, 6], [CP, 2, 4, 3]],
  },
  {
    name: 'Ishita Bose',
    summary: { day: 13, level: 6, modules: 4, concepts: 11, sound: 11, unsound: 0, mistakes: {} },
    attempts: [[CD, 5, 5, 10], [CP, 4, 4, 5], [IL, 3, 3, 2]],
  },
  {
    name: 'Kabir Singh',
    summary: { day: 6, level: 3, modules: 1, concepts: 6, sound: 4, unsound: 1, mistakes: { noise_trade: 3, missed_flags: 1 } },
    attempts: [[CD, 4, 5, 6], [CP, 2, 4, 1]],
  },
  {
    name: 'Meera Pillai',
    summary: { day: 8, level: 4, modules: 2, concepts: 7, sound: 6, unsound: 0, mistakes: { missed_flags: 2 } },
    attempts: [[CD, 5, 5, 7], [IL, 3, 3, 0]],
  },
  {
    name: 'Nikhil Das',
    summary: null,
    attempts: [],
  },
  {
    name: 'Priya Shetty',
    summary: { day: 4, level: 2, modules: 0, concepts: 4, sound: 1, unsound: 3, mistakes: { noise_trade: 1, unsound_call: 3 } },
    attempts: [[CD, 3, 5, 3]],
  },
  {
    name: 'Rohan Joshi',
    summary: { day: 10, level: 4, modules: 2, concepts: 8, sound: 7, unsound: 2, mistakes: { noise_trade: 2, concentration: 2 } },
    attempts: [[CD, 4, 5, 9], [CD, 4, 5, 8], [CD, 5, 5, 6], [CP, 3, 4, 3], [IL, 1, 3, 1]],
  },
  {
    name: 'Sana Sheikh',
    summary: { day: 9, level: 4, modules: 3, concepts: 9, sound: 7, unsound: 0, mistakes: { missed_flags: 1 } },
    attempts: [[CD, 5, 5, 8], [CP, 4, 4, 4]],
  },
  {
    name: 'Tenzin Norbu',
    summary: { day: 7, level: 3, modules: 1, concepts: 6, sound: 4, unsound: 2, mistakes: { noise_trade: 1, unsound_call: 1 } },
    attempts: [[CD, 3, 5, 7], [CP, 3, 4, 4]],
  },
  {
    name: 'Zoya Fernandes',
    summary: { day: 6, level: 3, modules: 1, concepts: 5, sound: 4, unsound: 1, mistakes: { noise_trade: 2 } },
    attempts: [[CD, 4, 5, 6]],
  },
]

/** the pass rule each runner logs with — see ModulesPanel and the drill components */
const passes = (refId: string, score: number, outOf: number) =>
  refId === CP ? score / outOf >= 0.6 : score === outOf

const titleOf = (refId: string) =>
  refId === CD ? 'The credit desk' : refId === IL ? 'Replay: IL&FS, 2018' : MODULES.find((m) => m.id === refId)!.title

/**
 * Dates are laid out relative to `now`, so the deadlines read as this week's
 * whenever the page is opened. Ids and user ids are stable.
 */
export function sampleClass(now: number = Date.now()): {
  members: CohortMember[]
  assignments: Assignment[]
  attempts: (Attempt & { userId: string })[]
} {
  // noon, so "N days ago" never straddles a date line in the table
  const noon = new Date(now)
  noon.setHours(12, 0, 0, 0)
  const at = (daysAgo: number, hour = 0) => new Date(noon.getTime() - daysAgo * DAY + hour * 3_600_000).toISOString()

  const assignments: Assignment[] = [
    { id: 'sample-a1', kind: 'drill', refId: CD, title: titleOf(CD), dueAt: at(5, 11) },
    { id: 'sample-a2', kind: 'module', refId: CP, title: titleOf(CP), dueAt: at(2, 11) },
    { id: 'sample-a3', kind: 'drill', refId: IL, title: titleOf(IL), dueAt: at(-3, 11) },
  ]

  const members: CohortMember[] = STUDENTS.map((s, i) => ({
    userId: `sample-u${i + 1}`,
    displayName: s.name,
    joinedAt: at(14),
    summary: s.summary && summaryOf(s.summary),
  }))

  const attempts = STUDENTS.flatMap((s, i) =>
    s.attempts.map(([refId, score, outOf, daysAgo], j) => ({
      id: `sample-${i + 1}-${j + 1}`,
      userId: `sample-u${i + 1}`,
      kind: refId === CP ? ('module' as const) : ('drill' as const),
      refId,
      score,
      outOf,
      passed: passes(refId, score, outOf),
      // spread across the evening, the way homework actually gets done
      at: at(daysAgo, 6 + ((i + j) % 5)),
    })),
  )

  return { members, assignments, attempts }
}

function summaryOf(s: NonNullable<SampleStudent['summary']>): MemberSummary {
  const mistakes: Record<string, number> = {}
  for (const [k, v] of Object.entries(s.mistakes)) if (v) mistakes[k] = v
  return {
    day: s.day,
    level: s.level,
    modulesPassed: s.modules,
    modulesTotal: MODULES.length,
    conceptsLearned: s.concepts,
    conceptsTotal: CONCEPTS.length,
    soundCalls: s.sound,
    unsoundCalls: s.unsound,
    mistakes,
  }
}
