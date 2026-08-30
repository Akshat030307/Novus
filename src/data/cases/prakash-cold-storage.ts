import type { FinancialCase } from '@/sim/types'

/** Passable on its own terms, but the security barely covers a quarter of the
 *  exposure — so "approve against collateral" is not the protection it looks. */
export const prakashColdStorage: FinancialCase = {
  id: 'loan-prakash-cold-storage',
  building: 'bank',
  title: 'Prakash Cold Storage — refrigeration retrofit',
  brief:
    'Prakash runs a single cold store rented to vegetable traders near the wholesale ' +
    'market. They want ₹6,00,000 to replace the compressors. The building is leased, ' +
    'not owned; the only asset to charge is the plant itself.',
  figures: {
    revenue: 30_00_000_00,
    expenses: 25_50_000_00,
    existingDebt: 12_00_000_00,
    interestPaid: 1_50_000_00,
    cashFlow: 2_10_000_00,
    creditScore: 668,
    collateralValue: 3_00_000_00,
    sector: 'logistics',
  },
  choices: [
    { id: 'approve_full', label: 'Approve in full', detail: '₹6,00,000 at the standard rate' },
    { id: 'approve_reduced', label: 'Approve reduced', detail: '₹3,50,000, same rate' },
    {
      id: 'approve_with_collateral',
      label: 'Approve against collateral',
      detail: '₹6,00,000, compressors charged',
    },
    { id: 'reject', label: 'Reject', detail: 'No facility at this time' },
  ],
  truth: {
    defaultRisk: 0.4,
    drivers: [
      'collateral covers barely a quarter of the exposure',
      'debt-service cover is thin and the premises are leased',
    ],
  },
  teaches: ['collateral cover', 'a charge on weak security is not protection'],
}
