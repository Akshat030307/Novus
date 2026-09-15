import type { GameState } from '@/sim/types'
import type { Attempt } from '@/sim/attempts'
import { bestAttempt } from '@/sim/attempts'
import { CONCEPTS } from '@/data/concepts'
import { MODULES } from '@/data/modules'
import { moduleProgress } from '@/sim/modules'

/**
 * Issue B8. A certificate is a narrower claim than a transcript: not "here is
 * everything this player did" but "this player cleared a named, published bar."
 *
 * Two rules make it worth anything, and both are the point of the file:
 *
 *   The bar is written down, in full, before you meet it. Every requirement is
 *   shown with its progress from the first time you look at the panel, so
 *   nobody is ever told "you have earned something" without having been able
 *   to read what it takes.
 *
 *   It is measured, never awarded. Nothing here grants a certificate for
 *   effort or time served. `assess` returns the counts and the panel refuses
 *   to issue until every one is met.
 *
 * Pure — counts only. Issuing goes through `state/transcripts.ts`, which is
 * where the code and the server timestamp come from.
 */

export interface RequirementResult {
  id: string
  label: string
  /** how far along, in whole units the player can count themselves */
  got: number
  need: number
  met: boolean
}

export interface Certificate {
  id: string
  title: string
  blurb: string
  /** what a reader should take it to mean, and what it does not mean */
  scope: string
  requirements: {
    id: string
    label: string
    need: number
    got: (state: GameState, attempts: Attempt[]) => number
  }[]
}

const modulesPassed = (state: GameState) =>
  MODULES.filter((m) => moduleProgress(state, m.id).passed).length

const soundCalls = (state: GameState, kind?: string) =>
  state.cases.resolved.filter(
    (r) => r.judgement === 'sound' && (kind ? r.kind === kind : true),
  ).length

const bestScore = (attempts: Attempt[], refId: string) => {
  const best = bestAttempt(attempts, refId)
  return best ? best.score : 0
}

const cleanPatternReads = (state: GameState) =>
  state.cases.resolved.filter(
    (r) => r.flagScore && r.flagScore.found === r.flagScore.of && r.flagScore.wrong === 0,
  ).length

export const CERTIFICATES: Certificate[] = [
  {
    id: 'credit-foundation',
    title: 'Credit Analysis — Foundation',
    blurb:
      'The reading end of a lending desk: whether a business can carry more debt, and how to say so in a way that survives the outcome going the other way.',
    scope:
      'Awarded on work done inside a simulation. It says the holder can read a credit file and defend a call on the figures. It is not a professional licence and does not qualify anyone to lend.',
    requirements: [
      {
        id: 'modules',
        label: 'All course modules passed',
        need: MODULES.length,
        got: (s) => modulesPassed(s),
      },
      {
        id: 'sound-loans',
        label: 'Sound calls on credit files',
        need: 4,
        got: (s) => soundCalls(s, 'loan'),
      },
      {
        id: 'credit-desk',
        label: 'The credit desk drill, cleared without a slip',
        need: 5,
        got: (_s, a) => bestScore(a, 'credit-desk'),
      },
      {
        id: 'concepts',
        label: 'Concepts unlocked in the Ledger',
        need: 8,
        got: (s) => s.learned.length,
      },
    ],
  },
  {
    id: 'conduct-foundation',
    title: 'Market Conduct — Foundation',
    blurb:
      'The other half of the job: telling a price move from a story, keeping a book that can survive one bad headline, and saying which line on a page is actually the tell.',
    scope:
      'Awarded on work done inside a simulation. It says the holder can separate signal from noise and read a set of accounts for pattern. It is not a professional licence and is not a compliance qualification.',
    requirements: [
      {
        id: 'shock',
        label: 'Spot the shock, read cleanly',
        need: 1,
        got: (_s, a) => (bestAttempt(a, 'spot-the-shock')?.passed ? 1 : 0),
      },
      {
        id: 'book',
        label: 'Build a book, both rules met',
        need: 2,
        got: (_s, a) => bestScore(a, 'build-a-book'),
      },
      {
        id: 'pattern',
        label: 'Compliance files read with every tell found and nothing over-flagged',
        need: 2,
        got: (s) => cleanPatternReads(s),
      },
      {
        id: 'sound-pattern',
        label: 'Sound calls on compliance files',
        need: 2,
        got: (s) => soundCalls(s, 'pattern'),
      },
      {
        id: 'concepts',
        label: 'Concepts unlocked in the Ledger',
        need: 6,
        got: (s) => s.learned.length,
      },
    ],
  },
]

export function getCertificate(id: string): Certificate | undefined {
  return CERTIFICATES.find((c) => c.id === id)
}

/** where the player stands against one certificate's published bar */
export function assess(
  cert: Certificate,
  state: GameState,
  attempts: Attempt[],
): { requirements: RequirementResult[]; earned: boolean } {
  const requirements = cert.requirements.map((r) => {
    const got = Math.min(r.got(state, attempts), r.need)
    return { id: r.id, label: r.label, got, need: r.need, met: got >= r.need }
  })
  return { requirements, earned: requirements.every((r) => r.met) }
}

/** the total concept count, so a requirement can be read against something */
export const CONCEPT_TOTAL = CONCEPTS.length
