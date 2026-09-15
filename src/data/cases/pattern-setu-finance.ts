import type { PatternCase } from '@/sim/types'

/**
 * Issue B5. Rhymes with IL&FS (`echoes: 'ilfs'`): an infrastructure lender
 * whose assets ran for fifteen years and whose funding ran for ninety days,
 * rated AAA the whole way down. Nothing was overdue until everything was.
 *
 * The lesson the Casebook card makes and this file tests: a rating is an
 * opinion about credit, not about whether you can refinance on Tuesday. The
 * tell is never in the arrears line — it is in the gap between how long you
 * lent for and how long you borrowed for.
 *
 * Setu Finance is invented, as everything playable in Novus is.
 */
export const patternSetuFinance: PatternCase = {
  kind: 'pattern',
  id: 'pattern-setu-finance',
  building: 'risk',
  title: 'Setu Finance — quarterly funding review',
  brief:
    'Setu Finance lends to road and water projects and is rated AAA by two agencies. ' +
    'Nothing in its book is overdue. The review is routine and the desk has already ' +
    'signed off twice. Read the funding side, not just the lending side.',
  accounts: [
    { label: 'Loan book', value: '₹18,600 crore', note: 'road, water and power projects' },
    { label: 'Average remaining life of assets', value: '11.4 years' },
    {
      label: 'Funded by commercial paper',
      value: '₹6,900 crore',
      note: 'average tenor 84 days',
    },
    { label: 'Funded by bank term loans', value: '₹7,200 crore', note: 'average tenor 4.1 years' },
    { label: 'Funded by equity and reserves', value: '₹1,850 crore' },
    { label: 'Overdue accounts', value: 'nil', note: 'nothing past 30 days' },
    { label: 'Credit rating', value: 'AAA', note: 'reaffirmed six weeks ago by both agencies' },
    {
      label: 'Commercial paper maturing this quarter',
      value: '₹3,400 crore',
      note: 'against ₹210 crore of scheduled loan repayments in the same period',
    },
    { label: 'Undrawn bank lines', value: '₹640 crore' },
    { label: 'Projects past original completion date', value: '9 of 31' },
    { label: 'Group entities', value: '112', note: 'subsidiaries and joint ventures' },
  ],
  flags: [
    {
      id: 'tenor-gap',
      label: 'Eleven-year assets funded by eighty-four-day paper',
    },
    {
      id: 'rollover',
      label: '₹3,400 crore to refinance this quarter against ₹210 crore coming in',
    },
    { id: 'thin-lines', label: 'Undrawn lines nowhere near the paper that has to be rolled' },
    { id: 'rating-comfort', label: 'A rating being used as evidence the funding is safe' },
    { id: 'group-sprawl', label: 'A hundred-plus entities, so the real exposure is hard to see' },
    { id: 'no-arrears', label: 'No overdue accounts anywhere in the book' },
    { id: 'delays', label: 'Nine of thirty-one projects running late' },
    { id: 'sector', label: 'Lending concentrated in infrastructure' },
  ],
  choices: [
    {
      id: 'clear',
      label: 'Clear it',
      detail: 'AAA, nothing overdue, two clean reviews behind it.',
      guards: false,
      riskMult: 1,
    },
    {
      id: 'require_liquidity',
      label: 'Require a liquidity buffer',
      detail: 'No sign-off until committed lines cover the quarter’s paper.',
      guards: true,
      riskMult: 0.45,
    },
    {
      id: 'escalate',
      label: 'Escalate the funding mismatch',
      detail: 'Refer it up with the tenor gap and the rollover schedule marked.',
      guards: true,
      riskMult: 0.4,
    },
    {
      id: 'watchlist',
      label: 'Put it on the watchlist',
      detail: 'Note the mismatch, look again next quarter.',
      guards: false,
      riskMult: 0.95,
    },
  ],
  truth: {
    // late projects and infrastructure concentration are real features of the
    // business and not the tell; "no arrears" is the decoy that does the most
    // work, because it is the line everyone reaches for as reassurance.
    realFlags: ['tenor-gap', 'rollover', 'thin-lines', 'rating-comfort', 'group-sprawl'],
    soundChoices: ['require_liquidity', 'escalate'],
    fraudRisk: 0.7,
    drivers: [
      'assets averaging 11.4 years funded by paper averaging 84 days',
      '₹3,400 crore to roll this quarter with ₹640 crore of committed lines behind it',
      'a credit rating being read as a liquidity opinion, which it is not',
      '112 group entities, so nobody can see the whole exposure at once',
    ],
    echoes: 'ilfs',
  },
  teaches: [
    'a rating is an opinion on credit, not on whether you can refinance next week',
    'nothing is overdue right up until the moment the funding stops',
    'the maturity gap is the risk, not the arrears line',
  ],
}
