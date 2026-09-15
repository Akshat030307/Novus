import type { Replay } from './types'

/**
 * Drawn entirely from the Satyam card in `data/casebook.ts`, which was checked
 * against its cited sources in issue A5. No figure, date or event here appears
 * that is not on that card.
 */
export const satyamReplay: Replay = {
  id: 'replay-satyam',
  title: 'Satyam, 2008',
  casebookId: 'satyam',
  role:
    'You cover Indian IT for a mid-sized fund. You hold the stock. Each step shows only what was public at that point.',
  caution:
    'A concluded, documented event, replayed as history. It is not a prediction about any company and it is not advice. You are marked on what was defensible at the time, not on knowing the ending.',
  steps: [
    {
      when: 'Through 2008, from the published accounts',
      known: [
        'Reported operating margins run well above the rest of the sector.',
        'Cash and bank balances are reported at ₹5,361 crore as at 30 September 2008.',
        'Reported profit is not backed up by the operating cash flow.',
      ],
      question: 'What do you do with the position?',
      options: [
        { id: 'hold', label: 'Hold — the numbers are excellent' },
        { id: 'ask', label: 'Ask management about the cash and the cash flow' },
        { id: 'trim', label: 'Trim the position pending an answer' },
        { id: 'add', label: 'Add — best margins in the sector' },
      ],
      defensible: ['ask', 'trim'],
      outcome:
        'No public explanation was given for either the margin gap or the cash that earned almost nothing.',
      note:
        'A very large cash balance generating almost no interest income is the single clearest tell on this file, and it was on the balance sheet the whole time. Margins conspicuously better than every comparable firm are a question, not a result.',
    },
    {
      when: 'December 2008',
      known: [
        'The company proposes buying two promoter-linked firms using company cash.',
        'Shareholders block it.',
        'Promoter holding has fallen to single digits, with shares pledged.',
      ],
      question: 'Does the blocked acquisition change your read?',
      options: [
        { id: 'noise', label: 'No — shareholders stopped it, the system worked' },
        { id: 'governance', label: 'Yes — treat it as a governance failure and cut' },
        { id: 'watch', label: 'Yes — keep the position but demand the cash be confirmed' },
        { id: 'buy', label: 'Yes — the block is a positive, buy the dip' },
      ],
      defensible: ['governance', 'watch'],
      outcome:
        'The chairman resigned three weeks later, admitting the accounts had been falsified for years.',
      note:
        'An attempt to move company cash into promoter-linked entities is a reason to doubt that the cash — and the people reporting it — can be trusted. That the block succeeded says nothing about whether the attempt should have been made.',
    },
    {
      when: '7 January 2009',
      known: [
        'The chairman admits the fraud in a letter to the board and resigns.',
        'Of ₹5,361 crore of reported cash and bank balances, ₹5,004 crore did not exist.',
        'The wider inflation of revenue and profit from 2003 is put at about ₹7,136 crore.',
      ],
      question: 'The share price falls about 78% that day. What is the lesson you write down?',
      options: [
        {
          id: 'unknowable',
          label: 'Fraud is unknowable from outside — nobody could have seen this',
        },
        {
          id: 'cash',
          label: 'When reported profit and operating cash disagree, believe the cash',
        },
        { id: 'timing', label: 'Sell any stock that falls sharply' },
        { id: 'luck', label: 'Position sizing is the only defence against anything' },
      ],
      defensible: ['cash'],
      outcome:
        'The company was auctioned by a government-appointed board and bought by Tech Mahindra.',
      note:
        'The specific fraud was hidden. The shape of it was not: idle cash, profit without cash flow, outlier margins and a departing promoter were all published. Reading the ending backwards into "nobody could have known" is the bias this drill exists to work against.',
    },
  ],
}
