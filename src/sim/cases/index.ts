import type {
  CasePrediction,
  FinancialCase,
  GameState,
  LevelUpReport,
  ResolvedCase,
} from '@/sim/types'
import { makeRng } from '@/sim/rng'
import { awardProgress, caseSkillGains } from '@/sim/progression'

/**
 * Step 10. Resolving a credit file:
 *
 *   1. the player picks a choice
 *   2. adjust the default risk for that choice — a smaller or collateralised
 *      loan genuinely loses less when it goes bad
 *   3. sample the outcome with the seeded rng
 *   4. apply cash, XP and reputation deltas
 *   5. `explainCase` rebuilds the explanation from figures that were on screen
 *
 * The rule that makes this teach anything: `judgeChoice` scores the reasoning
 * against the hidden truth, never against the dice. A player who rejects a
 * 42% risk was right even when that borrower would have repaid.
 */

export type CaseOutcome = ResolvedCase['outcome'] // 'good' | 'bad'
export type Judgement = ResolvedCase['judgement'] // 'sound' | 'unsound'

type StdChoice = 'approve_full' | 'approve_reduced' | 'approve_with_collateral' | 'reject'

interface ChoiceEffect {
  /** multiplies the sampled default risk */
  riskMult: number
  /** false for `reject` — no money is at stake, the outcome is counterfactual */
  lends: boolean
}

const CHOICE_EFFECTS: Record<StdChoice, ChoiceEffect> = {
  approve_full: { riskMult: 1, lends: true },
  approve_reduced: { riskMult: 0.85, lends: true },
  approve_with_collateral: { riskMult: 0.7, lends: true },
  reject: { riskMult: 1, lends: false },
}

const RISKY = 0.3 // at or above this, a full unsecured approve is not defensible

/** C-d: did the player's risk band contain the real default risk. */
export function gradePrediction(prediction: CasePrediction, defaultRisk: number): boolean {
  if (prediction.risk === 'low') return defaultRisk < 0.2
  if (prediction.risk === 'mid') return defaultRisk >= 0.2 && defaultRisk <= 0.4
  return defaultRisk > 0.4
}

/** The reasoning verdict — measured against the truth, not the outcome. */
export function judgeChoice(defaultRisk: number, choice: string): Judgement {
  switch (choice) {
    case 'reject':
      return defaultRisk >= RISKY ? 'sound' : 'unsound'
    case 'approve_full':
      return defaultRisk < RISKY ? 'sound' : 'unsound'
    default:
      // approve_reduced / approve_with_collateral — the prudent middle, always defensible
      return 'sound'
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
  choiceId: string,
  prediction?: CasePrediction,
): { state: GameState; resolved: ResolvedCase; levelUps: LevelUpReport[] } {
  const rng = makeRng(`${state.seed}|case|${fc.id}|${state.clock.day}`)
  const effect = CHOICE_EFFECTS[choiceId as StdChoice] ?? CHOICE_EFFECTS.approve_full

  let outcome: CaseOutcome
  if (effect.lends) {
    outcome = rng.chance(fc.truth.defaultRisk * effect.riskMult) ? 'bad' : 'good'
  } else {
    // rejected: 'good' means the borrower you turned away would have defaulted
    outcome = rng.chance(fc.truth.defaultRisk) ? 'good' : 'bad'
  }

  const judgement = judgeChoice(fc.truth.defaultRisk, choiceId)
  const { cashChange, xpChange, reputationChange } = rewardFor(judgement, outcome)

  const resolved: ResolvedCase = {
    caseId: fc.id,
    choice: choiceId,
    outcome,
    judgement,
    cashChange,
    xpChange,
    reputationChange,
    day: state.clock.day,
    ...(prediction && {
      prediction,
      predictionRight: gradePrediction(prediction, fc.truth.defaultRisk),
    }),
  }

  const { player, levelUps } = awardProgress(
    { ...state.player, cash: state.player.cash + cashChange },
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
  return fc.truth.defaultRisk >= 0.3
    ? 'This one smells risky — the figures need to really stack up.'
    : 'Looks manageable on the face of it.'
}

/* ---------- explanation (recomputed, never stored) ---------- */

export type RatioVerdict = 'strong' | 'ok' | 'weak'

export interface CaseRatio {
  label: string
  value: string
  verdict: RatioVerdict
}

export interface Explanation {
  ratios: CaseRatio[]
  drivers: string[]
  realRisk: number
  /** the one line that matters — reward the reasoning */
  verdict: string
}

export function explainCase(fc: FinancialCase, resolved: ResolvedCase): Explanation {
  const f = fc.figures
  const profit = f.revenue - f.expenses
  const dscr = f.interestPaid > 0 ? f.cashFlow / f.interestPaid : Infinity
  const margin = f.revenue > 0 ? profit / f.revenue : 0
  const leverageYears = profit > 0 ? f.existingDebt / profit : Infinity
  const collateralCover = f.existingDebt > 0 ? f.collateralValue / f.existingDebt : Infinity

  const ratios: CaseRatio[] = [
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

  return {
    ratios,
    drivers: fc.truth.drivers,
    realRisk: fc.truth.defaultRisk,
    verdict: verdictLine(resolved, Math.round(fc.truth.defaultRisk * 100)),
  }
}

function verdictLine(r: ResolvedCase, pct: number): string {
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
