import type { PatternCase } from '@/sim/types'

/**
 * Issue B4's second proof, and the hinge for B5: a pattern file.
 *
 * There is no borrower and no book. The player is handed a set of accounts and
 * asked the question a compliance desk actually asks — does this hold together?
 * — then has to say which specific lines are the tell before making the call.
 *
 * It rhymes with Satyam (`echoes: 'satyam'`): a very large cash balance that
 * earns almost nothing, profit the operating cash flow never backs up, margins
 * better than anyone comparable, and a promoter stake falling while shares are
 * pledged. Every one of those is in the Casebook card, sourced. The company
 * here is invented, as everything playable in Novus is.
 */
export const patternSahyadriSoftware: PatternCase = {
  kind: 'pattern',
  id: 'pattern-sahyadri-software',
  building: 'risk',
  title: 'Sahyadri Software — accounts referred by the auditor',
  brief:
    'Sahyadri Software is a mid-sized services firm that has grown fast for six ' +
    'years. Its auditor has referred the latest accounts to Risk & Compliance ' +
    'without saying why. Nothing here is illegal on its face, and the company ' +
    'has never missed a payment. Read the lines and say what you think.',
  accounts: [
    { label: 'Reported revenue', value: '₹2,180 crore', note: 'up 34% on last year' },
    { label: 'Reported net profit', value: '₹412 crore' },
    { label: 'Operating margin', value: '26%', note: 'sector median is 14%' },
    {
      label: 'Cash and bank balances',
      value: '₹1,940 crore',
      note: 'held across current accounts',
    },
    {
      label: 'Interest income on that cash',
      value: '₹11 crore',
      note: 'about 0.6% on the balance',
    },
    { label: 'Cash from operations', value: '₹96 crore', note: 'against ₹412 crore of profit' },
    { label: 'Trade receivables', value: '₹690 crore', note: '116 days of sales outstanding' },
    { label: 'Promoter holding', value: '8.2%', note: 'was 31% four years ago' },
    { label: 'Promoter shares pledged', value: '74% of the holding' },
    { label: 'Headcount', value: '11,400', note: 'payroll is the largest single cost' },
    { label: 'Audit fee', value: '₹1.9 crore', note: 'unchanged for three years' },
  ],
  flags: [
    { id: 'idle-cash', label: 'A very large cash balance earning almost no interest' },
    { id: 'profit-no-cash', label: 'Profit the operating cash flow does not back up' },
    { id: 'margin-outlier', label: 'Margins well above every comparable firm' },
    { id: 'promoter-exit', label: 'A promoter stake falling fast, with shares pledged' },
    { id: 'receivables', label: 'Receivables stretching past a hundred days' },
    { id: 'growth', label: 'Revenue growing faster than the sector' },
    { id: 'headcount', label: 'A large headcount for the revenue reported' },
    { id: 'audit-fee', label: 'An audit fee that has not risen in three years' },
  ],
  choices: [
    {
      id: 'clear',
      label: 'Clear it',
      detail: 'Fast growth, healthy margins, never missed a payment.',
      guards: false,
      riskMult: 1,
    },
    {
      id: 'query_the_cash',
      label: 'Query the cash line',
      detail: 'Ask for bank confirmations directly from the banks.',
      guards: true,
      riskMult: 0.6,
    },
    {
      id: 'escalate',
      label: 'Escalate for a full review',
      detail: 'Refer it up with the cash and cash-flow lines marked.',
      guards: true,
      riskMult: 0.4,
    },
    {
      id: 'watchlist',
      label: 'Put it on the watchlist',
      detail: 'No action now, look again next quarter.',
      guards: false,
      riskMult: 0.9,
    },
  ],
  truth: {
    // growth, headcount and the audit fee are the decoys. Each is odd on its
    // own and none of them is evidence — which is the second half of the
    // lesson, because a reviewer who flags everything has flagged nothing.
    realFlags: ['idle-cash', 'profit-no-cash', 'margin-outlier', 'promoter-exit', 'receivables'],
    soundChoices: ['query_the_cash', 'escalate'],
    fraudRisk: 0.8,
    drivers: [
      '₹1,940 crore of cash returning 0.6% is a balance that may not be there',
      '₹412 crore of profit and ₹96 crore of operating cash cannot both be true for long',
      'a 26% margin in a 14% sector needs an explanation nobody has given',
      'a promoter cutting their stake from 31% to 8% while pledging the rest is a view',
    ],
    echoes: 'satyam',
  },
  teaches: [
    'when reported profit and operating cash disagree, believe the cash',
    'a cash pile that earns nothing may not exist',
    'flagging everything is the same as flagging nothing',
  ],
}
