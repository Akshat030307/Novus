import type { Replay } from './types'

/**
 * Drawn entirely from the IL&FS card in `data/casebook.ts`, checked against its
 * cited sources in issue A5. Nothing here is invented to make a step work —
 * where the public record is coarse, so is the step.
 */
export const ilfsReplay: Replay = {
  id: 'replay-ilfs',
  title: 'IL&FS, 2018',
  casebookId: 'ilfs',
  role:
    'You run credit at a debt fund holding short-term paper issued by large non-bank lenders. Each step shows only what was public at that point.',
  caution:
    'A concluded, documented event, replayed as history. It is not a prediction about any company and it is not advice. You are marked on what was defensible at the time, not on knowing the ending.',
  steps: [
    {
      when: 'Early 2018',
      known: [
        'Group debt is around ₹91,000 crore.',
        'Much of the borrowing is short-term; the assets it funds pay back over decades.',
        'The group has grown to several hundred subsidiaries and associate entities.',
        'It is rated AAA.',
      ],
      question: 'You hold its commercial paper. What do you do?',
      options: [
        { id: 'roll', label: 'Keep rolling it — AAA, and nothing is overdue' },
        { id: 'size', label: 'Cap the exposure and stop adding' },
        { id: 'exit', label: 'Let the paper run off and do not renew' },
        { id: 'add', label: 'Add — the yield is good for the rating' },
      ],
      defensible: ['size', 'exit'],
      outcome: 'The rating held. Payments continued as scheduled.',
      note:
        'Owing money back sooner than the assets pay you means depending on always being able to borrow again. A rating is an opinion on credit, not on whether the market will refinance you next quarter — and several hundred entities is a structure outsiders, and the board, could not see through.',
    },
    {
      when: 'Mid-2018',
      known: [
        'Payments begin to be missed.',
        'The rating is still AAA.',
        'Debt has risen far faster than the cash the assets throw off.',
      ],
      question: 'The rating has not moved. Does that settle it?',
      options: [
        { id: 'trust', label: 'Yes — the agencies see more than we do' },
        { id: 'act', label: 'No — missed payments outrank a rating, cut the exposure' },
        { id: 'hedge', label: 'No — hold but stop treating the rating as evidence' },
        { id: 'wait', label: 'Yes — wait for a downgrade before acting' },
      ],
      defensible: ['act', 'hedge'],
      outcome:
        'The rating was held to the end of August 2018. The serious defaults came from September, and the firm was rated default by mid-September — weeks, not years.',
      note:
        'A rating that never moves until it moves all at once is a known failure mode, not a surprise. Waiting for the downgrade means acting after everyone who did not wait.',
    },
    {
      when: 'Late 2018',
      known: [
        'The government supersedes the board.',
        'Non-bank funding costs jump across the whole market, including for lenders with no connection to the firm.',
      ],
      question: 'Why did unrelated lenders re-price?',
      options: [
        { id: 'coincidence', label: 'Coincidence — they had their own problems' },
        {
          id: 'contagion',
          label: 'Every lender re-priced short-term non-bank funding risk at once',
        },
        { id: 'sentiment', label: 'General market sentiment turned' },
        { id: 'regulation', label: 'A regulator forced the change' },
      ],
      defensible: ['contagion'],
      outcome: 'Funding costs stayed elevated across the sector well beyond the firm itself.',
      note:
        'Contagion, not coincidence. If your funding depends on a market staying open, someone else closing it is your problem too — which is the same maturity-mismatch lesson, one level up.',
    },
  ],
}
