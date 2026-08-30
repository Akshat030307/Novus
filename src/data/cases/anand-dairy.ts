import type { FinancialCase } from '@/sim/types'

/** A clean credit. The lesson is that turning it away is the mistake. */
export const anandDairy: FinancialCase = {
  id: 'loan-anand-dairy',
  building: 'bank',
  title: 'Anand Dairy — cold-chain expansion',
  brief:
    'Anand Dairy collects from 400 farmers across two districts and sells chilled ' +
    'milk to a listed retailer on a three-year contract. They want ₹8,00,000 to add ' +
    'refrigerated vans. Margins have held for six years and the contract has two ' +
    'years left to run.',
  figures: {
    revenue: 60_00_000_00,
    expenses: 48_00_000_00,
    existingDebt: 6_00_000_00,
    interestPaid: 70_000_00,
    cashFlow: 9_00_000_00,
    creditScore: 780,
    collateralValue: 20_00_000_00,
    sector: 'consumer',
  },
  choices: [
    { id: 'approve_full', label: 'Approve in full', detail: '₹8,00,000 at the standard rate' },
    { id: 'approve_reduced', label: 'Approve reduced', detail: '₹5,00,000, same rate' },
    {
      id: 'approve_with_collateral',
      label: 'Approve against collateral',
      detail: '₹8,00,000, vans and premises charged',
    },
    { id: 'reject', label: 'Reject', detail: 'No facility at this time' },
  ],
  truth: {
    defaultRisk: 0.08,
    drivers: ['nothing material — strong cover, low leverage, a contracted buyer'],
  },
  teaches: ['recognising a safe credit', 'over-caution has a cost'],
}
