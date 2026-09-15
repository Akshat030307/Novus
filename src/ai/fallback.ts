import type { AllocationCase, FinancialCase, LoanCase, PatternCase, ResolvedCase } from '@/sim/types'
import { rupees } from '@/lib/format'
import { caseRisk } from '@/sim/cases'

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

/**
 * The plain-language "what happened and why", pointing back at what was on
 * screen. Since issue B4 that differs by kind — a book has no debt-service
 * cover and a set of accounts has no borrower — so each kind gets its own
 * opening and they share the closing line about the call.
 */
export function fallbackCaseExplanation({ fc, r, drivers }: CaseExplanationParams): string {
  const pct = Math.round(caseRisk(fc) * 100)
  const opening =
    fc.kind === 'loan'
      ? loanNumbers(fc)
      : fc.kind === 'allocation'
        ? bookNumbers(fc)
        : accountNumbers(fc)
  const drove = drivers.length ? ` What weighed on it: ${drivers.join('; ')}.` : ''
  return opening + drove + callLine(fc, r, pct)
}

function loanNumbers(fc: LoanCase): string {
  const f = fc.figures
  const name = fc.title.split(' — ')[0]
  const profit = f.revenue - f.expenses

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

  return `${name} ${profitClause} and ${rupees(f.cashFlow)} of operating cash, ${interestClause}${coverClause}`
}

function bookNumbers(fc: AllocationCase): string {
  const total = fc.book.reduce((t, b) => t + b.value, 0)
  const bySector = new Map<string, number>()
  for (const line of fc.book) bySector.set(line.sector, (bySector.get(line.sector) ?? 0) + line.value)
  const topSector = [...bySector.entries()].sort((a, b) => b[1] - a[1])[0]
  const share = total > 0 ? Math.round((topSector[1] / total) * 100) : 0
  return (
    `${fc.book.length} holdings, ${rupees(total, { short: true })} in all, across ` +
    `${bySector.size} sectors — with ${share}% of it in ${topSector[0]}.`
  )
}

function accountNumbers(fc: PatternCase): string {
  const name = fc.title.split(' — ')[0]
  const real = fc.truth.realFlags.length
  return (
    `${name}'s accounts carried ${real} line${real === 1 ? '' : 's'} that genuinely did not ` +
    `hold together, among ${fc.flags.length} things that looked odd.`
  )
}

/** the closing sentence — the same shape for every kind, in that kind's words */
function callLine(fc: FinancialCase, r: ResolvedCase, pct: number): string {
  const stoodAside =
    fc.kind === 'loan'
      ? r.choice === 'reject'
      : Boolean(fc.choices.find((c) => c.id === r.choice)?.guards)
  const bad = fc.kind === 'loan' ? 'defaulted' : 'came apart'
  const good = fc.kind === 'loan' ? 'repaid' : 'held'

  if (r.judgement === 'sound') {
    return r.outcome === 'good'
      ? stoodAside
        ? ` It would have ${bad}, so standing aside at ${pct}% was right.`
        : ` It ${good}, and the call was well judged.`
      : stoodAside
        ? ` It would have ${good} this time — but acting at ${pct}% is still correct. Reward the reasoning, not the roll.`
        : ` It ${bad}, yet the call was defensible at ${pct}% — a sound call can still go bad.`
  }
  return r.outcome === 'good'
    ? ` It worked out, but the evidence did not support that call. You got away with it.`
    : stoodAside
      ? ` It would have ${good}. Acting on evidence this thin costs something too.`
      : ` It ${bad} — and at ${pct}%, that call was not one the evidence supported.`
}
