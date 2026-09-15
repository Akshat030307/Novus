import type { AllocationCase } from '@/sim/types'

/**
 * Issue B4's proof that a case no longer has to be a loan. Nothing about this
 * file is a credit decision: there is no borrower, no default, and the figures
 * are positions rather than accounts.
 *
 * The lesson is the one every retail book gets wrong. This book looks
 * diversified — eight names — and is not: two thirds of it is one bet on
 * construction spending, wearing three different tickers.
 */
export const allocationTrustBook: AllocationCase = {
  kind: 'allocation',
  id: 'alloc-trust-book',
  building: 'exchange',
  title: 'The Nalanda Trust book — annual review',
  brief:
    'The Nalanda Education Trust keeps a small endowment at the Exchange and its ' +
    'board reviews the book once a year. The mandate is plain and was written by ' +
    'people who are not investors. The book has drifted since it was last looked ' +
    'at, and the trustees want to know whether it still does what they asked for.',
  mandate: [
    'No single holding above a fifth of the book.',
    'No single sector above a third of the book.',
    'At least five sectors represented.',
    'The trust spends from this book every year, so it cannot afford a bad year it has to sit through.',
  ],
  book: [
    { name: 'Sethu Infra', sector: 'construction', value: 9_20_000_00, note: 'roads and ports' },
    { name: 'Kalash Cement', sector: 'cement', value: 6_40_000_00, note: 'sells into infrastructure' },
    { name: 'Lohit Steel', sector: 'steel', value: 5_80_000_00, note: 'sells into infrastructure' },
    { name: 'Patha Logistics', sector: 'logistics', value: 2_10_000_00, note: 'freight, mostly project cargo' },
    { name: 'Suvarna Bank', sector: 'banking', value: 1_80_000_00 },
    { name: 'Grihini Foods', sector: 'consumer', value: 1_40_000_00 },
    { name: 'Vaidya Pharma', sector: 'pharma', value: 90_000_00 },
    { name: 'Anvaya Systems', sector: 'it', value: 40_000_00 },
  ],
  choices: [
    {
      id: 'leave_as_is',
      label: 'Leave it alone',
      detail: 'Eight names across six sectors. It reads diversified on paper.',
      guards: false,
      riskMult: 1,
    },
    {
      id: 'trim_the_top',
      label: 'Trim the top holding',
      detail: 'Bring Sethu Infra back under a fifth and hold the rest.',
      guards: true,
      riskMult: 0.8,
    },
    {
      id: 'cut_the_theme',
      label: 'Cut the whole theme back',
      detail: 'Construction, cement and steel are one bet. Halve all three.',
      guards: true,
      riskMult: 0.5,
    },
    {
      id: 'buy_more_infra',
      label: 'Add to the winner',
      detail: 'Infrastructure spending is rising. Lean into it.',
      guards: false,
      riskMult: 1.4,
    },
  ],
  truth: {
    // trimming the single biggest name satisfies the letter of the mandate and
    // is defensible; cutting the theme is the better answer. Both are sound —
    // a case with exactly one acceptable answer teaches a rule, not judgement.
    soundChoices: ['trim_the_top', 'cut_the_theme'],
    hitRisk: 0.55,
    drivers: [
      'construction, cement and steel are 65% of the book and move together',
      'logistics here is project cargo, so it leans the same way again',
      'eight names, but effectively two bets',
      'the trust spends from this book, so it cannot wait out a bad year',
    ],
  },
  teaches: [
    'counting holdings is not the same as spreading risk',
    'sectors that sell to each other are one position wearing several names',
  ],
}
