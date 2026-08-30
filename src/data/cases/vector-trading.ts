import type { FinancialCase } from '@/sim/types'

/** A crore of revenue that somehow throws off ₹40,000 of cash, next to a
 *  spotless credit score. When the numbers disagree, trust the cash. */
export const vectorTrading: FinancialCase = {
  id: 'loan-vector-trading',
  building: 'bank',
  title: 'Vector Trading Co — inventory finance',
  brief:
    'Vector Trading buys and resells packaged goods to kirana distributors. The ' +
    'application shows ₹1.2 crore of turnover and a near-perfect credit score. They ' +
    'want ₹10,00,000 against stock. The audited accounts arrived late and are light ' +
    'on detail.',
  figures: {
    revenue: 1_20_00_000_00,
    expenses: 1_17_00_000_00,
    existingDebt: 20_00_000_00,
    interestPaid: 2_40_000_00,
    cashFlow: 40_000_00,
    creditScore: 810,
    collateralValue: 5_00_000_00,
    sector: 'consumer',
  },
  choices: [
    { id: 'approve_full', label: 'Approve in full', detail: '₹10,00,000 against stock' },
    { id: 'approve_reduced', label: 'Approve reduced', detail: '₹4,00,000 against stock' },
    {
      id: 'approve_with_collateral',
      label: 'Approve against collateral',
      detail: '₹10,00,000, stock and receivables charged',
    },
    { id: 'reject', label: 'Reject', detail: 'Ask for audited accounts first' },
  ],
  truth: {
    defaultRisk: 0.6,
    drivers: [
      '₹1.2 crore of revenue produces ₹40,000 of cash',
      'a spotless score the accounts do not support',
    ],
  },
  teaches: ['stated revenue versus cash generated', 'when the numbers disagree, trust the cash'],
}
