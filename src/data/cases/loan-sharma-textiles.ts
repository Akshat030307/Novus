import type { FinancialCase } from '@/sim/types'

/**
 * The Sharma Textiles credit file. Figures match the worked example in
 * docs/architecture.md — thin debt-service cover against an unconfirmed buyer.
 */
export const loanSharmaTextiles: FinancialCase = {
  id: 'loan-sharma-textiles',
  building: 'bank',
  title: 'Sharma Textiles — working capital loan',
  brief:
    'Sharma Textiles has run a weaving unit outside Surat for eleven years. ' +
    'They want ₹10,00,000 for four new looms to take on a larger export order. ' +
    'The family has banked with Meridian since the unit opened and has never ' +
    'missed a payment. The order is real; the buyer is not yet confirmed.',
  figures: {
    revenue: 42_00_000_00,
    expenses: 36_00_000_00,
    existingDebt: 18_00_000_00,
    interestPaid: 2_10_000_00,
    cashFlow: 3_20_000_00,
    creditScore: 690,
    collateralValue: 7_00_000_00,
    sector: 'consumer',
  },
  choices: [
    { id: 'approve_full', label: 'Approve in full', detail: '₹10,00,000 at the standard rate' },
    { id: 'approve_reduced', label: 'Approve reduced', detail: '₹6,00,000, same rate' },
    {
      id: 'approve_with_collateral',
      label: 'Approve against collateral',
      detail: '₹10,00,000, looms and premises charged',
    },
    { id: 'reject', label: 'Reject', detail: 'No facility at this time' },
  ],
  truth: {
    defaultRisk: 0.42,
    drivers: ['thin debt-service cover', 'buyer not confirmed'],
  },
  teaches: ['debt service coverage ratio', 'collateral cover'],
}
