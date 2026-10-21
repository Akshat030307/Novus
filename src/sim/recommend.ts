import {
  CAN_BE_COUNTED,
  CAN_BE_STRICT,
  FOCUSES,
  encodeSpec,
  focusById,
  specTitle,
  type ScenarioSpec,
} from '@/sim/aim'
import { appliesTo, type Assignment, type WeakArea } from '@/sim/cohort'
import BANK from '@/data/recommendations.json'

/**
 * Issue B12. What to set this student next, and why.
 *
 * Two halves, kept apart on purpose:
 *
 *   The pick is a rule in this file. A weak area names a habit or a piece of
 *   work; `FOCUSES` in sim/aim.ts says which drill answers it; the drill is
 *   aimed there and set for that one student. It is deterministic, it is
 *   readable, and a teacher can disagree with it on the evidence shown.
 *
 *   The reading is TinyFish's half. tools/tinyfish/recommend.mjs asks it, at
 *   build time, for current coverage of the thing the student keeps getting
 *   wrong, and writes data/recommendations.json. The game ships that file and
 *   never calls out: a static bundle cannot hold an API key, and a teacher
 *   opening a dashboard should not be waiting on somebody else's service.
 *
 * What TinyFish does NOT do is choose the exercise. A recommendation a teacher
 * cannot audit is worse than none, and "the model said so" is not a reason to
 * put a student through a drill.
 */

export interface Reading {
  title: string
  url: string
  site: string
  /** when the piece was published, as the search reported it */
  at: string | null
}

export interface Recommendation {
  /** the weak area it answers */
  area: WeakArea
  /** the drill, aimed */
  spec: ScenarioSpec
  /** what the assignment will be called */
  title: string
  /** the ref id it will be stored and logged under */
  refId: string
  /** why this, in a sentence built from their own record */
  why: string
  /** current coverage of the same problem, for the teacher — never for the game */
  reading: Reading[]
}

interface Bank {
  builtAt: string | null
  builtBy: string
  areas: Record<string, { reading: Reading[] }>
}

const bank = BANK as Bank

/** when the shipped reading was last refreshed, for the line under it */
export const readingBuiltAt = (): string | null => bank.builtAt

/**
 * The one thing to set next, or null when nothing is going wrong that a drill
 * answers. Work already set for this student is skipped — recommending what
 * somebody has already been given is how a dashboard loses a teacher's trust.
 */
export function recommendFor(
  weak: WeakArea[],
  assignments: Assignment[],
  userId: string,
): Recommendation | null {
  for (const area of weak) {
    const focus = FOCUSES.find((f) => f.answers.includes(area.id))
    if (!focus) continue

    const drill = focus.drills[0]
    const spec: ScenarioSpec = {
      drill,
      focus: focus.id,
      // a short run on one idea, where the drill has files to choose from
      count: CAN_BE_COUNTED.includes(drill) && focus.cases ? Math.min(3, focus.cases.length) : null,
      // a habit seen three times or more has survived the ordinary mark — but
      // only where the drill has a stricter mark to move to, or the title
      // would promise something the run does not do
      hard:
        CAN_BE_STRICT.includes(drill) && area.id.startsWith('habit:') && area.seen >= 3,
    }
    const refId = encodeSpec(spec)
    if (assignments.some((a) => a.refId === refId && appliesTo(a, userId))) continue

    return {
      area,
      spec,
      refId,
      title: specTitle(spec),
      why: `${area.why} This run is the same mistake with nothing else in the way.`,
      reading: bank.areas[area.id]?.reading ?? [],
    }
  }
  return null
}

/** every weak area the bank could hold reading for — used by the harvester */
export const bankableAreas = (): string[] => FOCUSES.flatMap((f) => f.answers)

export { focusById }
