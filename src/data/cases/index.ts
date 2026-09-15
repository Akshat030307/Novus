import type { BuildingId, CaseKind, FinancialCase, LoanCase } from '@/sim/types'
import { loanSharmaTextiles } from './loan-sharma-textiles'
import { anandDairy } from './anand-dairy'
import { girishSteel } from './girish-steel'
import { prakashColdStorage } from './prakash-cold-storage'
import { vectorTrading } from './vector-trading'
import { allocationTrustBook } from './allocation-trust-book'
import { patternSahyadriSoftware } from './pattern-sahyadri-software'
import { patternSetuFinance } from './pattern-setu-finance'
import { patternHarbourTrade } from './pattern-harbour-trade'

/**
 * One entry per case; the case engine looks them up by id.
 *
 * Since issue B4 the library is no longer all loans, and where a file lives
 * matters: loans are at the Bank, books at the Exchange, accounts at Risk &
 * Compliance. `atBuilding` is what each interior asks for.
 */
const ALL: FinancialCase[] = [
  loanSharmaTextiles,
  anandDairy,
  girishSteel,
  prakashColdStorage,
  vectorTrading,
  allocationTrustBook,
  patternSahyadriSoftware,
  patternSetuFinance,
  patternHarbourTrade,
]

export const CASES: Record<string, FinancialCase> = Object.fromEntries(
  ALL.map((c) => [c.id, c]),
)

/** the order the manager hands the files over in */
export const CASE_ORDER: string[] = ALL.map((c) => c.id)

export function getCase(id: string): FinancialCase | undefined {
  return CASES[id]
}

export function casesOfKind(kind: CaseKind): FinancialCase[] {
  return ALL.filter((c) => c.kind === kind)
}

export function atBuilding(building: BuildingId): FinancialCase[] {
  return ALL.filter((c) => c.building === building)
}

/**
 * Issue B5. The playable file that rhymes with a Casebook entry, if there is
 * one. The link is declared on the case (`truth.echoes`) rather than on the
 * Casebook, so a case can never point at history that is not there.
 */
export function caseEchoing(casebookId: string): FinancialCase | undefined {
  return ALL.find((c) => c.kind === 'pattern' && c.truth.echoes === casebookId)
}

/** the credit-desk drill is five loan files and stays that way */
export const LOAN_ORDER: string[] = ALL.filter((c): c is LoanCase => c.kind === 'loan').map(
  (c) => c.id,
)
