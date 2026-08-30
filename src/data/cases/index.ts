import type { FinancialCase } from '@/sim/types'
import { loanSharmaTextiles } from './loan-sharma-textiles'
import { anandDairy } from './anand-dairy'
import { girishSteel } from './girish-steel'
import { prakashColdStorage } from './prakash-cold-storage'
import { vectorTrading } from './vector-trading'

/** One entry per case; the case engine looks them up by id. */
const ALL: FinancialCase[] = [
  loanSharmaTextiles,
  anandDairy,
  girishSteel,
  prakashColdStorage,
  vectorTrading,
]

export const CASES: Record<string, FinancialCase> = Object.fromEntries(
  ALL.map((c) => [c.id, c]),
)

/** the order the manager hands the files over in */
export const CASE_ORDER: string[] = ALL.map((c) => c.id)

export function getCase(id: string): FinancialCase | undefined {
  return CASES[id]
}
