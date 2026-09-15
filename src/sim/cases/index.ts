import type {
  AllocationCase,
  CaseChoiceId,
  CasePrediction,
  FinancialCase,
  FlagScore,
  GameState,
  LevelUpReport,
  LoanCase,
  PatternCase,
  ResolvedCase,
} from '@/sim/types'
import { makeRng } from '@/sim/rng'
import { awardProgress, caseSkillGains } from '@/sim/progression'
import { caseEnergyCost, spendEnergy } from '@/sim/energy'
import { rupees } from '@/lib/format'

/**
 * Step 10, generalised by issue B4. Resolving a file:
 *
 *   1. the player picks a choice (and, on a pattern file, ticks red flags)
 *   2. adjust the hazard for that choice — a smaller or collateralised loan
 *      genuinely loses less when it goes bad
 *   3. sample the hazard with the seeded rng
 *   4. apply cash, XP and reputation deltas
 *   5. `explainCase` rebuilds the explanation from what was on screen
 *
 * The rule that makes this teach anything: `judgeChoice` scores the reasoning
 * against the hidden truth, never against the dice. A player who rejects a
 * 42% risk was right even when that borrower would have repaid.
 *
 * Three kinds share that skeleton and differ only in what the evidence is and
 * what "the hazard" means — a default, a concentrated book taking a hit, a set
 * of accounts really being what it looks like.
 */

export type CaseOutcome = ResolvedCase['outcome'] // 'good' | 'bad'
export type Judgement = ResolvedCase['judgement'] // 'sound' | 'unsound'

/** what the player hands in */
export interface CaseSubmission {
  choice: CaseChoiceId
  prediction?: CasePrediction
  /** pattern files: the flag ids ticked */
  flags?: string[]
  /** game minutes the file was open — a rushed read costs more focus (A2) */
  minutesSpent?: number
}

type StdChoice = 'approve_full' | 'approve_reduced' | 'approve_with_collateral' | 'reject'

interface ChoiceEffect {
  /** multiplies the sampled hazard */
  riskMult: number
  /** true where the choice steps out of the hazard's way */
  guards: boolean
}

/** the four ids every loan file uses; other kinds declare it on the choice */
const LOAN_EFFECTS: Record<StdChoice, ChoiceEffect> = {
  approve_full: { riskMult: 1, guards: false },
  approve_reduced: { riskMult: 0.85, guards: false },
  approve_with_collateral: { riskMult: 0.7, guards: false },
  reject: { riskMult: 1, guards: true },
}

const RISKY = 0.3 // at or above this, a full unsecured approve is not defensible

/** the chance the thing this file is about actually happens */
export function caseRisk(fc: FinancialCase): number {
  switch (fc.kind) {
    case 'loan':
      return fc.truth.defaultRisk
    case 'allocation':
      return fc.truth.hitRisk
    case 'pattern':
      return fc.truth.fraudRisk
  }
}

function effectFor(fc: FinancialCase, choiceId: string): ChoiceEffect {
  if (fc.kind === 'loan') return LOAN_EFFECTS[choiceId as StdChoice] ?? LOAN_EFFECTS.approve_full
  const choice = fc.choices.find((c) => c.id === choiceId)
  return { riskMult: choice?.riskMult ?? 1, guards: Boolean(choice?.guards) }
}

/** C-d: did the player's risk band contain the real risk. */
export function gradePrediction(prediction: CasePrediction, risk: number): boolean {
  if (prediction.risk === 'low') return risk < 0.2
  if (prediction.risk === 'mid') return risk >= 0.2 && risk <= 0.4
  return risk > 0.4
}

/**
 * The reasoning verdict — measured against the truth, not the outcome.
 *
 * Loan files derive it from the risk, because the four standard calls sit on a
 * scale. The other kinds name their defensible answers outright: there is no
 * scale that says whether escalating a set of accounts was right.
 */
export function judgeChoice(fc: FinancialCase, choiceId: string): Judgement {
  if (fc.kind !== 'loan') {
    return fc.truth.soundChoices.includes(choiceId) ? 'sound' : 'unsound'
  }
  const risk = fc.truth.defaultRisk
  switch (choiceId) {
    case 'reject':
      return risk >= RISKY ? 'sound' : 'unsound'
    case 'approve_full':
      return risk < RISKY ? 'sound' : 'unsound'
    default:
      // approve_reduced / approve_with_collateral — the prudent middle, always defensible
      return 'sound'
  }
}

/** how the red-flag ticks on a pattern file scored */
export function scoreFlags(fc: PatternCase, ticked: string[] = []): FlagScore {
  const real = new Set(fc.truth.realFlags)
  const picked = new Set(ticked)
  return {
    found: [...picked].filter((id) => real.has(id)).length,
    of: real.size,
    wrong: [...picked].filter((id) => !real.has(id)).length,
  }
}

function rewardFor(judgement: Judgement, outcome: CaseOutcome) {
  if (judgement === 'sound') {
    return outcome === 'good'
      ? { cashChange: 5_000_00, xpChange: 45, reputationChange: 4 }
      : { cashChange: 0, xpChange: 40, reputationChange: 1 } // sound but unlucky — no penalty
  }
  return outcome === 'bad'
    ? { cashChange: -8_000_00, xpChange: 15, reputationChange: -4 }
    : { cashChange: 0, xpChange: 10, reputationChange: 0 } // unsound but lucky — nothing earned
}

export function resolveCase(
  state: GameState,
  fc: FinancialCase,
  submission: CaseSubmission,
): { state: GameState; resolved: ResolvedCase; levelUps: LevelUpReport[] } {
  const { choice, prediction, flags, minutesSpent } = submission
  const rng = makeRng(`${state.seed}|case|${fc.id}|${state.clock.day}`)
  const effect = effectFor(fc, choice)
  const risk = caseRisk(fc)

  // one roll, read two ways. A choice that stepped out of the way is vindicated
  // when the hazard lands; one that took it on is vindicated when it doesn't.
  const hazard = rng.chance(risk * (effect.guards ? 1 : effect.riskMult))
  const outcome: CaseOutcome = effect.guards ? (hazard ? 'good' : 'bad') : hazard ? 'bad' : 'good'

  const judgement = judgeChoice(fc, choice)
  const { cashChange, xpChange, reputationChange } = rewardFor(judgement, outcome)

  const resolved: ResolvedCase = {
    caseId: fc.id,
    kind: fc.kind,
    choice,
    outcome,
    judgement,
    cashChange,
    xpChange,
    reputationChange,
    day: state.clock.day,
    ...(prediction && { prediction, predictionRight: gradePrediction(prediction, risk) }),
    ...(fc.kind === 'pattern' && { flagScore: scoreFlags(fc, flags) }),
  }

  const { player, levelUps } = awardProgress(
    spendEnergy(
      { ...state.player, cash: state.player.cash + cashChange },
      caseEnergyCost(minutesSpent),
    ),
    { xp: xpChange, reputation: reputationChange, skills: caseSkillGains(resolved) },
  )

  return {
    state: {
      ...state,
      player,
      cases: {
        openCaseId: state.cases.openCaseId,
        resolved: [...state.cases.resolved, resolved],
      },
    },
    resolved,
    levelUps,
  }
}

/** Risk 2 unlock: a blunt second opinion. Deliberately coarse — it aids
 *  without trivialising the "judge the reasoning" call. */
export function riskRead(fc: FinancialCase): string {
  const risky = caseRisk(fc) >= 0.3
  switch (fc.kind) {
    case 'loan':
      return risky
        ? 'This one smells risky — the figures need to really stack up.'
        : 'Looks manageable on the face of it.'
    case 'allocation':
      return risky
        ? 'This book is carrying more in one direction than it looks.'
        : 'Nothing here is obviously out of shape.'
    case 'pattern':
      return risky
        ? 'Something in these accounts does not sit right.'
        : 'Odd, but odd is not the same as wrong.'
  }
}

/* ---------- explanation (recomputed, never stored) ---------- */

export type RatioVerdict = 'strong' | 'ok' | 'weak'

export interface CaseRatio {
  label: string
  value: string
  verdict: RatioVerdict
}

/** one red flag, after the fact: was it real, and did the player see it */
export interface FlagVerdict {
  label: string
  real: boolean
  ticked: boolean
}

export interface Explanation {
  ratios: CaseRatio[]
  /** pattern files only */
  flags?: FlagVerdict[]
  drivers: string[]
  realRisk: number
  /** what that number means on this kind of file */
  riskLabel: string
  /** the one line that matters — reward the reasoning */
  verdict: string
}

export function explainCase(fc: FinancialCase, resolved: ResolvedCase): Explanation {
  const pct = Math.round(caseRisk(fc) * 100)
  const base = {
    drivers: fc.truth.drivers,
    realRisk: caseRisk(fc),
    verdict: verdictLine(fc, resolved, pct),
  }
  switch (fc.kind) {
    case 'loan':
      return { ...base, riskLabel: 'Real default risk on this file', ratios: loanRatios(fc) }
    case 'allocation':
      return {
        ...base,
        riskLabel: 'Chance this book took a serious hit as it stood',
        ratios: bookRatios(fc),
      }
    case 'pattern':
      return {
        ...base,
        riskLabel: 'Chance the accounts really were what they looked like',
        ratios: [],
        flags: flagVerdicts(fc, resolved),
      }
  }
}

function loanRatios(fc: LoanCase): CaseRatio[] {
  const f = fc.figures
  const profit = f.revenue - f.expenses
  const dscr = f.interestPaid > 0 ? f.cashFlow / f.interestPaid : Infinity
  const margin = f.revenue > 0 ? profit / f.revenue : 0
  const leverageYears = profit > 0 ? f.existingDebt / profit : Infinity
  const collateralCover = f.existingDebt > 0 ? f.collateralValue / f.existingDebt : Infinity

  return [
    {
      label: 'Debt-service cover',
      value: dscr === Infinity ? '—' : `${dscr.toFixed(1)}×`,
      verdict: dscr >= 2 ? 'strong' : dscr >= 1.3 ? 'ok' : 'weak',
    },
    {
      label: 'Operating margin',
      value: `${(margin * 100).toFixed(0)}%`,
      verdict: margin >= 0.15 ? 'strong' : margin >= 0.07 ? 'ok' : 'weak',
    },
    {
      label: 'Debt / annual profit',
      value: leverageYears === Infinity ? '—' : `${leverageYears.toFixed(1)} yrs`,
      verdict: leverageYears <= 3 ? 'strong' : leverageYears <= 6 ? 'ok' : 'weak',
    },
    {
      label: 'Collateral / existing debt',
      value: collateralCover === Infinity ? '—' : `${(collateralCover * 100).toFixed(0)}%`,
      verdict: collateralCover >= 0.75 ? 'strong' : collateralCover >= 0.4 ? 'ok' : 'weak',
    },
    {
      label: 'Credit score',
      value: String(f.creditScore),
      verdict: f.creditScore >= 720 ? 'strong' : f.creditScore >= 660 ? 'ok' : 'weak',
    },
  ]
}

/** the shape of a book, measured — the same three questions every time */
export function bookRatios(fc: AllocationCase): CaseRatio[] {
  const total = fc.book.reduce((t, b) => t + b.value, 0)
  if (total <= 0) return []

  const bySector = new Map<string, number>()
  for (const line of fc.book) bySector.set(line.sector, (bySector.get(line.sector) ?? 0) + line.value)

  const topLine = Math.max(...fc.book.map((b) => b.value)) / total
  const topSector = Math.max(...bySector.values()) / total

  return [
    {
      label: 'Positions held',
      value: String(fc.book.length),
      verdict: fc.book.length >= 6 ? 'strong' : fc.book.length >= 4 ? 'ok' : 'weak',
    },
    {
      label: 'Biggest single name',
      value: `${Math.round(topLine * 100)}%`,
      verdict: topLine <= 0.2 ? 'strong' : topLine <= 0.4 ? 'ok' : 'weak',
    },
    {
      label: 'Biggest sector',
      value: `${Math.round(topSector * 100)}%`,
      verdict: topSector <= 0.3 ? 'strong' : topSector <= 0.5 ? 'ok' : 'weak',
    },
    {
      label: 'Sectors covered',
      value: String(bySector.size),
      verdict: bySector.size >= 5 ? 'strong' : bySector.size >= 3 ? 'ok' : 'weak',
    },
    { label: 'Book value', value: rupees(total, { short: true }), verdict: 'ok' },
  ]
}

function flagVerdicts(fc: PatternCase, r: ResolvedCase): FlagVerdict[] {
  // which flags were ticked is not stored — only the score is — so the ticks
  // are reconstructed where they can be and left blank where they cannot.
  // `flagScore` is what the transcript reads; this is the teaching view.
  const real = new Set(fc.truth.realFlags)
  const found = r.flagScore?.found ?? 0
  const wrong = r.flagScore?.wrong ?? 0
  let realLeft = found
  let decoyLeft = wrong
  return fc.flags.map((flag) => {
    const isReal = real.has(flag.id)
    const ticked = isReal ? realLeft-- > 0 : decoyLeft-- > 0
    return { label: flag.label, real: isReal, ticked }
  })
}

function verdictLine(fc: FinancialCase, r: ResolvedCase, pct: number): string {
  if (fc.kind === 'loan') return loanVerdict(r, pct)

  const guarded = Boolean(fc.choices.find((c) => c.id === r.choice)?.guards)
  const noun = fc.kind === 'allocation' ? 'the book' : 'the file'

  if (r.judgement === 'sound') {
    if (r.outcome === 'good') {
      return guarded
        ? `It came apart, and acting on ${noun} was the right call.`
        : `It held, and leaving ${noun} alone was defensible on what you could see.`
    }
    return guarded
      ? `Nothing happened this time — but at ${pct}% you were still right to act. Don't chase the outcome.`
      : `It came apart, yet the call was defensible at ${pct}%. A sound call can still go bad.`
  }
  if (r.outcome === 'good') {
    return `It worked out, but the evidence did not support that call. You got away with it.`
  }
  return `It came apart — and at ${pct}%, that call was not one the evidence supported.`
}

function loanVerdict(r: ResolvedCase, pct: number): string {
  const rejected = r.choice === 'reject'
  if (r.judgement === 'sound') {
    if (r.outcome === 'good') {
      return rejected
        ? `It would have defaulted. Turning away a ${pct}% risk was the right call.`
        : `It repaid, and the approval was well judged.`
    }
    return rejected
      ? `It would have repaid — but rejecting a ${pct}% risk is still correct. Don't chase the outcome.`
      : `It defaulted, yet the approval was defensible at ${pct}% risk. A sound call can still go bad.`
  }
  if (r.outcome === 'good') {
    return `It worked out, but the numbers did not support that call. You got away with it.`
  }
  return rejected
    ? `It would have repaid. Rejecting a credit this clean leaves money on the table.`
    : `It defaulted — and at ${pct}% risk, an unsecured full approval was the wrong call.`
}
