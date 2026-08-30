import type { FinancialCase } from '@/sim/types'

/** Big revenue, tiny profit, and debt that is already nine years of earnings. */
export const girishSteel: FinancialCase = {
  id: 'loan-girish-steel',
  building: 'bank',
  title: 'Girish Steel Fabricators — plant upgrade',
  brief:
    'Girish Steel fabricates structural sections for road contractors. Order book ' +
    'is full and revenue is up year on year. They want ₹15,00,000 to replace an ' +
    'ageing rolling line. The founder is confident the new line pays for itself in ' +
    'two years.',
  figures: {
    revenue: 90_00_000_00,
    expenses: 84_00_000_00,
    existingDebt: 55_00_000_00,
    interestPaid: 6_60_000_00,
    cashFlow: 5_00_000_00,
    creditScore: 645,
    collateralValue: 30_00_000_00,
    sector: 'steel',
  },
  choices: [
    { id: 'approve_full', label: 'Approve in full', detail: '₹15,00,000 at the standard rate' },
    { id: 'approve_reduced', label: 'Approve reduced', detail: '₹8,00,000, same rate' },
    {
      id: 'approve_with_collateral',
      label: 'Approve against collateral',
      detail: '₹15,00,000, rolling line and yard charged',
    },
    { id: 'reject', label: 'Reject', detail: 'No facility at this time' },
  ],
  truth: {
    defaultRisk: 0.55,
    drivers: [
      'existing debt is nine years of profit',
      'cash flow does not cover the interest already owed',
    ],
  },
  teaches: ['leverage', 'reading the balance sheet behind the revenue'],
}
