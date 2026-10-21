import { SCENARIOS } from '@/data/scenarios'

/**
 * Issue B11. A drill, aimed.
 *
 * Every child's week is different, so the same five loan files are the wrong
 * answer for all of them. A teacher picks a drill, points it at the thing one
 * student keeps getting wrong, and sets how long and how strict it is. What
 * comes out is still one of the drills that already exists — nobody is writing
 * new loan files in a form at eleven at night, and a badly written case teaches
 * the wrong thing more efficiently than no case at all.
 *
 * An aimed drill is carried entirely in its `refId`:
 *
 *     credit-desk?focus=collateral&n=3&hard=1
 *
 * which means the assignment row, the attempt rows, the leaderboard and the
 * student's badge all work exactly as they already did, with no new table and
 * no join. A plain `credit-desk` still decodes to the drill with nothing
 * aimed, so everything set before this existed keeps working.
 *
 * Pure. ui/ renders it, state/ stores the string.
 */

export interface Focus {
  id: string
  label: string
  /** what a run aimed here actually puts in front of the student */
  blurb: string
  /** which drills can carry this focus */
  drills: string[]
  /** the loan files that lead with it, for the credit desk */
  cases?: string[]
  /** weakAreas() ids this is an answer to — see sim/cohort.ts */
  answers: string[]
}

export const FOCUSES: Focus[] = [
  {
    id: 'collateral',
    label: 'Collateral cover',
    blurb:
      'Files where the security looks like protection and is not: a charge worth a quarter of the exposure, or plant in a building somebody else owns.',
    drills: ['credit-desk'],
    cases: ['loan-prakash-cold-storage', 'loan-sharma-textiles'],
    answers: ['work:credit-desk', 'habit:missed_flags'],
  },
  {
    id: 'cash',
    label: 'Cash against reported profit',
    blurb:
      'Files where the income statement and the bank account disagree. The lesson is to believe the cash.',
    drills: ['credit-desk'],
    cases: ['loan-vector-trading', 'loan-sharma-textiles'],
    answers: ['work:cash-vs-profit', 'work:credit-desk'],
  },
  {
    id: 'leverage',
    label: 'Leverage behind the revenue',
    blurb:
      'Files with healthy sales and a balance sheet that cannot carry another rupee of debt.',
    drills: ['credit-desk'],
    cases: ['loan-girish-steel', 'loan-prakash-cold-storage'],
    answers: ['work:credit-desk', 'habit:missed_flags'],
  },
  {
    id: 'over-caution',
    label: 'The cost of saying no',
    blurb:
      'Files that are sound and look dull. Rejecting a safe credit is a mistake with no paper trail, which is why it goes unlearned.',
    drills: ['credit-desk'],
    cases: ['loan-anand-dairy', 'loan-girish-steel'],
    answers: ['work:credit-desk'],
  },
  {
    id: 'concentration',
    label: 'One name, most of the book',
    blurb: 'Building a book under a cap, where counting holdings is not the same as spreading risk.',
    drills: ['build-a-book'],
    answers: ['habit:concentration'],
  },
  {
    id: 'noise',
    label: 'Trading the noise',
    blurb: 'A headline and a market, where most of the movement means nothing.',
    drills: ['spot-the-shock'],
    answers: ['habit:noise_trade'],
  },
  {
    id: 'outcome',
    label: 'Judging a call by how it turned out',
    blurb:
      'A documented period walked forward, marked on what was defensible at the time rather than on knowing the ending.',
    drills: ['replay-satyam', 'replay-ilfs'],
    answers: ['habit:unsound_call'],
  },
]

/**
 * Which drills have a stricter mark worth offering. Spot the shock is already
 * "the whole sector map, no strays" and there is nothing sensible between that
 * and guessing, so the form does not pretend otherwise.
 */
export const CAN_BE_STRICT = ['credit-desk', 'build-a-book']

/** how many files a drill can be asked for, where that means anything */
export const CAN_BE_COUNTED = ['credit-desk']

export const focusById = (id: string | null): Focus | null =>
  (id && FOCUSES.find((f) => f.id === id)) || null

/** the focuses a given drill can be pointed at */
export const focusesFor = (drill: string): Focus[] => FOCUSES.filter((f) => f.drills.includes(drill))

export interface ScenarioSpec {
  /** a scenario id from data/scenarios.ts */
  drill: string
  focus: string | null
  /** how many files, where the drill has files; null means "all of them" */
  count: number | null
  /** stricter pass mark — the reasoning has to be right as well as the call */
  hard: boolean
}

export const plainSpec = (drill: string): ScenarioSpec => ({
  drill,
  focus: null,
  count: null,
  hard: false,
})

/** the refId an aimed drill is stored and logged under */
export function encodeSpec(spec: ScenarioSpec): string {
  const q = new URLSearchParams()
  if (spec.focus) q.set('focus', spec.focus)
  if (spec.count !== null) q.set('n', String(spec.count))
  if (spec.hard) q.set('hard', '1')
  const tail = q.toString()
  return tail ? `${spec.drill}?${tail}` : spec.drill
}

export function decodeSpec(refId: string): ScenarioSpec {
  const [drill, tail] = refId.split('?')
  if (!tail) return plainSpec(drill)
  const q = new URLSearchParams(tail)
  const n = Number(q.get('n'))
  return {
    drill,
    focus: q.get('focus'),
    count: Number.isFinite(n) && n > 0 ? n : null,
    hard: q.get('hard') === '1',
  }
}

/** does this refId name a drill that has been pointed at something? */
export const isAimed = (refId: string): boolean => refId.includes('?')

const drillTitle = (drill: string) => SCENARIOS.find((s) => s.id === drill)?.title ?? drill

/** what the assignment is called, in a teacher's words */
export function specTitle(spec: ScenarioSpec): string {
  const base = drillTitle(spec.drill)
  const focus = focusById(spec.focus)
  const bits = [focus ? `${base}: ${focus.label.toLowerCase()}` : base]
  if (spec.count !== null) bits.push(`${spec.count} files`)
  if (spec.hard) bits.push('strict')
  return bits.length > 1 ? `${bits[0]} (${bits.slice(1).join(', ')})` : bits[0]
}

/**
 * The sentence under the form, so a teacher can see what they are about to
 * set before they set it rather than by running it themselves.
 */
export function specPreview(spec: ScenarioSpec, fileCount: number): string {
  const focus = focusById(spec.focus)
  const what = focus ? focus.blurb : (SCENARIOS.find((s) => s.id === spec.drill)?.brief ?? '')
  const scale =
    spec.count !== null && fileCount > 0 ? ` ${fileCount} ${fileCount === 1 ? 'file' : 'files'}.` : ''
  const strict = spec.hard
    ? ' To pass, the risk read has to be right as well as the call: a lucky approval does not count.'
    : ''
  return `${what}${scale}${strict}`
}
