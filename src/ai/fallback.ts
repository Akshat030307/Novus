import type { FinancialCase, ResolvedCase } from '@/sim/types'
import { rupees } from '@/lib/format'

/**
 * Written stand-in text, used when AI wording is off or a call fails. The whole
 * game plays on these — the model layer only ever makes them read a shade
 * warmer. Keep them good enough that you would not miss the model.
 */

export interface CaseIntroParams {
  fc: FinancialCase
}

export interface CaseExplanationParams {
  fc: FinancialCase
  r: ResolvedCase
  drivers: string[]
}

/** the loan story — the brief is already written as prose, so this is it */
export function fallbackCaseIntro({ fc }: CaseIntroParams): string {
  return fc.brief
}

/** the plain-language "what happened and why", pointing back at the figures */
export function fallbackCaseExplanation({ fc, r, drivers }: CaseExplanationParams): string {
  const f = fc.figures
  const name = fc.title.split(' — ')[0]
  const profit = f.revenue - f.expenses
  const pct = Math.round(fc.truth.defaultRisk * 100)

  const profitClause =
    profit > 0
      ? `turned ${rupees(f.revenue)} of revenue into ${rupees(profit)} of profit`
      : `ran ${rupees(f.revenue)} of revenue at a loss`
  const interestClause =
    f.interestPaid > 0
      ? `against ${rupees(f.interestPaid)} of interest already owed`
      : 'with no interest currently owed'
  const coverClause =
    f.interestPaid > 0
      ? ` — cover of about ${(f.cashFlow / f.interestPaid).toFixed(1)}×.`
      : '.'

  const numbers = `${name} ${profitClause} and ${rupees(f.cashFlow)} of operating cash, ${interestClause}${coverClause}`
  const drove = drivers.length ? ` What weighed on it: ${drivers.join('; ')}.` : ''

  const rejected = r.choice === 'reject'
  let call: string
  if (r.judgement === 'sound') {
    call =
      r.outcome === 'good'
        ? rejected
          ? ` It would have defaulted, so turning away a ${pct}% risk was right.`
          : ` It repaid, and the approval was well judged.`
        : rejected
          ? ` It would have repaid this time — but rejecting a ${pct}% risk is still correct. Reward the reasoning, not the roll.`
          : ` It defaulted, yet the approval was defensible at ${pct}% risk — a sound call can still go bad.`
  } else {
    call =
      r.outcome === 'good'
        ? ` It worked out, but the figures did not support that call. You got away with it.`
        : rejected
          ? ` It would have repaid. Rejecting a credit this clean leaves money on the table.`
          : ` It defaulted — and at ${pct}% risk, an unsecured full approval was the wrong call.`
  }

  return numbers + drove + call
}
