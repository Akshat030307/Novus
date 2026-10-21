import { MODULES } from '@/data/modules'
import { encodeSpec, specTitle, type ScenarioSpec } from '@/sim/aim'
import type { Assignment, NewAssignment } from '@/sim/cohort'

/**
 * Syllabus to term plan (issue B13).
 *
 * The TinyFish Agent reads a college's syllabus and hands back its courses and
 * units. This file decides what a unit means for Novus, and it is a rule, not
 * a model: every match is a keyword that appears in the syllabus text, and the
 * keywords are printed beside the match. A teacher who sees "matched on:
 * working capital, cash management" can agree or delete it in one glance,
 * which is the whole reason the matching is not done by the Agent.
 *
 * Pure. No network, no clock: dates come in as arguments.
 */

export interface SyllabusUnit {
  title: string
  topics: string[]
  hours: number | null
}

export interface SyllabusCourse {
  title: string
  semester: string
  units: SyllabusUnit[]
}

export interface SyllabusRead {
  url: string
  institution: string
  programme: string
  courses: SyllabusCourse[]
  readAt?: string
  readBy?: string
}

/** something Novus can set: a module check, or a drill, possibly aimed */
interface Target {
  kind: 'module' | 'drill'
  refId: string
  title: string
  /** what it practises, in a teacher's words */
  why: string
  words: string[]
}

const moduleTitle = (id: string) => MODULES.find((m) => m.id === id)?.title ?? id
const drill = (spec: ScenarioSpec, why: string, words: string[]): Target => ({
  kind: 'drill',
  refId: encodeSpec(spec),
  title: specTitle(spec),
  why,
  words,
})
const mod = (id: string, why: string, words: string[]): Target => ({ kind: 'module', refId: id, title: moduleTitle(id), why, words })
const plain = (d: string) => ({ drill: d, focus: null, count: null, hard: false })

/**
 * The vocabulary of a commerce syllabus, mapped onto what Novus teaches.
 * Order matters only for ties: the more specific idea is listed first.
 */
const TARGETS: Target[] = [
  mod('cash-vs-profit', 'cash against reported profit', ['working capital', 'cash management', 'cash flow', 'cash budget', 'operating cycle', 'receivables', 'liquidity', 'fund flow']),
  drill({ drill: 'credit-desk', focus: 'cash', count: 3, hard: false }, 'lending decisions where cash and profit disagree', ['working capital financing', 'cash management', 'credit policies', 'receivables management']),
  mod('balance-sheet', 'leverage and collateral cover', ['capital structure', 'leverage', 'debt equity', 'debt-equity', 'financial statement analysis', 'balance sheet', 'ratio analysis', 'solvency']),
  drill({ drill: 'credit-desk', focus: 'leverage', count: 3, hard: false }, 'a balance sheet that cannot carry more debt', ['capital structure', 'debt vs equity', 'financial risk', 'types of leverage', 'cost of capital']),
  mod('loan-files', 'reading a loan file before lending', ['credit appraisal', 'lending', 'loan', 'advances', 'retail banking', 'corporate banking', 'rural banking', 'priority sector', 'commercial bank', 'microfinance']),
  drill({ drill: 'credit-desk', focus: 'collateral', count: 3, hard: false }, 'security that only looks like protection', ['collateral', 'secured loan', 'mortgage', 'pledge', 'hypothecation']),
  drill(plain('credit-desk'), 'five real-looking credit decisions', ['credit appraisal', 'credit policies', 'kyc', 'npa', 'non-performing', 'loan', 'advances']),
  mod('diversification', 'spreading risk, not just counting holdings', ['portfolio', 'diversif', 'mutual fund', 'asset allocation', 'risk and return', 'systematic investment']),
  drill({ drill: 'build-a-book', focus: 'concentration', count: null, hard: false }, 'building a book under a concentration cap', ['portfolio', 'mutual fund', 'asset allocation', 'balanced fund', 'diversif']),
  mod('reading-the-tape', 'telling news from noise in prices', ['stock market', 'share price', 'capital market', 'secondary market', 'stock exchange', 'market index', 'equity share', 'sensex', 'nifty']),
  drill({ drill: 'spot-the-shock', focus: 'noise', count: null, hard: false }, 'which sectors a headline actually moves', ['monetary policy', 'rbi', 'interest rate', 'inflation', 'repo', 'reserve bank', 'fiscal']),
  drill(plain('replay-ilfs'), 'a funding squeeze, replayed from the record', ['nbfc', 'asset liability', 'refinanc', 'credit rating', 'rating agenc', 'money market']),
  drill(plain('replay-satyam'), 'accounts that could not be trusted, replayed', ['corporate governance', 'fraud', 'audit', 'window dressing', 'creative accounting']),
]

export interface PlanItem {
  /** 1-based teaching week this lands in */
  week: number
  unit: string
  target: Omit<Target, 'words'>
  /** the syllabus words that produced this match, shown to the teacher */
  matchedOn: string[]
}

export interface TermPlan {
  course: string
  weeks: number
  items: PlanItem[]
  /** units nothing in Novus covers, said plainly rather than padded out */
  unmatched: string[]
  /** units Novus does cover, through work this class already has set */
  alreadySet: string[]
}

/**
 * A word counts only at the start of a word in the syllabus, so "rbi" is not
 * found inside another word. Stems ("diversif", "refinanc") still match their
 * endings, because only the front edge is anchored.
 */
const has = (text: string, word: string) =>
  new RegExp(`(^|[^a-z])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(text)

/** how many weeks a unit takes: stated hours over the class's weekly hours, or two */
const weeksFor = (u: SyllabusUnit, hoursPerWeek: number) =>
  u.hours ? Math.max(1, Math.round(u.hours / hoursPerWeek)) : 2

/**
 * One course becomes a week-by-week plan. Each unit gets its share of the
 * term from its stated hours; the best one or two Novus matches for it are
 * due at the end of that unit's last week. Anything already set for the class
 * is left out, so running it twice does not double the work.
 */
export function planCourse(
  course: SyllabusCourse,
  { hoursPerWeek = 4, perUnit = 2, already = [] as Assignment[] } = {},
): TermPlan {
  const items: PlanItem[] = []
  const unmatched: string[] = []
  const alreadySet: string[] = []
  const used = new Set(already.filter((a) => !a.forUser).map((a) => a.refId))
  let week = 1

  for (const unit of course.units) {
    const span = weeksFor(unit, hoursPerWeek)
    const last = week + span - 1
    const text = `${unit.title} ${unit.topics.join(' ')}`.toLowerCase()

    const matching = TARGETS.map((t) => ({ t, hits: t.words.filter((w) => has(text, w)) })).filter((s) => s.hits.length > 0)
    const scored = matching.filter((s) => !used.has(s.t.refId)).sort((a, b) => b.hits.length - a.hits.length)

    const picked = scored.slice(0, perUnit)
    // "not covered" and "already set" are different news for a teacher
    if (picked.length === 0) (matching.length ? alreadySet : unmatched).push(unit.title)
    for (const { t, hits } of picked) {
      used.add(t.refId)
      const { words: _words, ...target } = t
      items.push({ week: last, unit: unit.title, target, matchedOn: hits })
    }
    week = last + 1
  }
  return { course: course.title, weeks: week - 1, items, unmatched, alreadySet }
}

/**
 * The plan as assignments, due on the Friday of each item's week counted from
 * `start` (a Monday is assumed but not required). Times are 5 pm local so a
 * deadline reads as "by the end of Friday", not "midnight".
 */
export function planToAssignments(plan: TermPlan, start: Date): NewAssignment[] {
  return plan.items.map((it) => {
    const due = new Date(start)
    due.setDate(due.getDate() + (it.week - 1) * 7 + 4)
    due.setHours(17, 0, 0, 0)
    return { kind: it.target.kind, refId: it.target.refId, title: it.target.title, dueAt: due.toISOString(), forUser: null }
  })
}
