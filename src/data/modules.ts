/**
 * Step C-f. The Academy's course, as five modules. Each names the Ledger
 * concepts it covers, what to go and do in the game, and a short check.
 * Content only — sim/modules.ts scores it, ModulesPanel shows it.
 */
export interface QuizQuestion {
  q: string
  options: string[]
  /** index into `options` */
  answer: number
}

export interface Module {
  id: string
  title: string
  blurb: string
  /** Ledger concept ids this module leans on */
  concepts: string[]
  /** the in-game task that teaches it */
  doWhat: string
  quiz: QuizQuestion[]
}

export const MODULES: Module[] = [
  {
    id: 'loan-files',
    title: 'Reading a loan file',
    blurb:
      'A credit decision is a reading exercise. The figures on the file already tell you whether the business can carry more debt — the trick is knowing which lines to look at first.',
    concepts: ['debt-service-cover', 'operating-cash-flow', 'credit-score'],
    doWhat: 'Resolve Sharma Textiles and Anand Dairy at the Bank. Commit a risk read on each before you decide.',
    quiz: [
      {
        q: 'Debt-service cover is:',
        options: [
          'revenue divided by total debt',
          'operating cash flow divided by interest already owed',
          'profit divided by the loan amount',
          'collateral divided by the loan amount',
        ],
        answer: 1,
      },
      {
        q: 'A business shows healthy revenue but its operating cash flow is a fraction of it. This is:',
        options: [
          'normal and nothing to worry about',
          'a reason the loan is safer than it looks',
          'a flag — find out where the money went before lending',
          'only relevant for listed companies',
        ],
        answer: 2,
      },
      {
        q: 'Debt-service cover of 1.1× means:',
        options: [
          'cash barely covers the interest already owed',
          'the business has 1.1 years to repay',
          'the loan is 110% collateralised',
          'comfortable headroom',
        ],
        answer: 0,
      },
      {
        q: 'A high credit score next to thin cash flow tells you:',
        options: [
          'approve — the score settles it',
          'the score is a past record; the cash flow is the current risk',
          'the figures must be wrong',
          'reject on the score alone',
        ],
        answer: 1,
      },
      {
        q: 'Anand Dairy has strong cover, low leverage and a contracted buyer. Rejecting it would be:',
        options: [
          'the safe call',
          'correct — never lend to dairies',
          'an unsound call; over-caution has a cost too',
          'fine, since the outcome is a roll anyway',
        ],
        answer: 2,
      },
    ],
  },
  {
    id: 'balance-sheet',
    title: 'Balance-sheet stress',
    blurb:
      'Some businesses look fine on the income statement and are quietly buried in debt. Leverage and collateral cover are how you see it before the default does.',
    concepts: ['leverage', 'collateral-cover'],
    doWhat: 'Resolve Girish Steel and Prakash Cold Storage at the Bank.',
    quiz: [
      {
        q: 'Leverage, as the game measures it, is:',
        options: [
          'existing debt expressed as years of profit needed to clear it',
          'debt minus cash',
          'the interest rate on the loan',
          'debt divided by revenue',
        ],
        answer: 0,
      },
      {
        q: 'Existing debt equal to nine years of profit is:',
        options: ['comfortable', 'fine if the score is high', 'heavily over-levered', 'irrelevant without the P/E'],
        answer: 2,
      },
      {
        q: 'Collateral cover of 25% means:',
        options: [
          'the security would absorb a quarter of the loss',
          'the loan is 25% approved',
          'the business owns 25% of its premises',
          'a strong backstop',
        ],
        answer: 0,
      },
      {
        q: 'Prakash Cold Storage: thin collateral, and the premises are leased. The leased premises matter because:',
        options: [
          'leased premises are always fraud',
          'a charge over assets you do not own is not real security',
          'rent is tax-deductible',
          'they do not matter',
        ],
        answer: 1,
      },
      {
        q: 'A well-collateralised loan to an over-levered business is best handled by:',
        options: [
          'full unsecured approval',
          'flat rejection every time',
          'a reduced or collateral-backed approval — the prudent middle',
          'approving double to be safe',
        ],
        answer: 2,
      },
    ],
  },
  {
    id: 'cash-vs-profit',
    title: 'Cash is not profit',
    blurb:
      'Revenue is what you are owed. Profit is an accounting figure. Cash is what is actually in the account — and it is the only one that pays an interest bill.',
    concepts: ['operating-cash-flow', 'margin'],
    doWhat: 'Resolve Vector Trading at the Bank.',
    quiz: [
      {
        q: 'Vector Trading turns ₹1.2 crore of revenue into ₹40,000 of cash. The lesson is:',
        options: [
          'revenue growth is all that matters',
          'when the numbers disagree, trust the cash',
          'trading firms are always safe',
          'the credit score overrides this',
        ],
        answer: 1,
      },
      {
        q: 'Operating margin is:',
        options: [
          'revenue minus expenses, as a share of revenue',
          'cash flow minus interest',
          'the loan rate minus inflation',
          'profit divided by debt',
        ],
        answer: 0,
      },
      {
        q: 'A 4% operating margin means:',
        options: [
          'a small cost overrun can wipe out the year',
          'plenty of room to absorb a bad quarter',
          'the business is fraudulent',
          'nothing without the sector',
        ],
        answer: 0,
      },
      {
        q: 'A spotless credit score the accounts do not support should make you:',
        options: [
          'trust the score',
          'more suspicious, not less',
          'approve faster',
          'ignore the accounts',
        ],
        answer: 1,
      },
    ],
  },
  {
    id: 'diversification',
    title: "Don't bet the book",
    blurb:
      'A portfolio that is mostly one stock is a bet on that one stock, whatever else is in it. Spreading holdings is what stops a single headline from being a bad day.',
    concepts: ['diversification', 'unrealised-pnl'],
    doWhat: 'At the Exchange, hold at least three different stocks at once and check the allocation bar.',
    quiz: [
      {
        q: 'Concentration risk is:',
        options: [
          'the risk that a stock is expensive',
          'the risk from one holding being a large share of the book',
          'the risk of holding cash',
          'the brokerage on a large trade',
        ],
        answer: 1,
      },
      {
        q: 'Your allocation bar is 70% one stock. This is:',
        options: [
          'well diversified',
          'fine if that stock is up',
          'a concentrated position — one bad headline hurts the whole book',
          'only a problem if you used leverage',
        ],
        answer: 2,
      },
      {
        q: 'Unrealised profit is:',
        options: [
          'profit you have booked by selling',
          'what a holding is worth on paper right now, before you sell',
          'the brokerage you saved',
          'dividend income',
        ],
        answer: 1,
      },
      {
        q: 'A large unrealised gain is best treated as:',
        options: [
          'money in the bank',
          'a reason to buy more of the same stock',
          "not yours until you sell — don't spend it in your head",
          'proof the analysis was right',
        ],
        answer: 2,
      },
    ],
  },
  {
    id: 'reading-the-tape',
    title: 'Reading the tape',
    blurb:
      'Prices move on three things at once: a slow drift toward fair value, random noise, and an event shock when real news lands. Telling them apart is most of trading well.',
    concepts: ['drift-noise-shock', 'pe-ratio', 'debt-to-equity'],
    doWhat: 'Trade through a day when a market event fires. Watch which sectors move, and by how much.',
    quiz: [
      {
        q: 'A stock moves 1% on a quiet day with no news. That is most likely:',
        options: ['a signal to buy', 'a signal to sell', 'noise', 'an event shock'],
        answer: 2,
      },
      {
        q: 'An infrastructure-spending headline lands. The intended lesson is:',
        options: [
          'buy every stock',
          'read the headline and work out which sectors actually benefit',
          'sell everything',
          'headlines never matter',
        ],
        answer: 1,
      },
      {
        q: 'A high P/E means the market has priced in:',
        options: [
          'a dividend cut',
          'a lot of future growth — and room to be disappointed',
          'low debt',
          'an imminent takeover',
        ],
        answer: 1,
      },
      {
        q: 'Debt-to-equity above 2 tells you the company:',
        options: [
          'has no debt',
          'is funded mostly by its owners',
          'depends heavily on lenders staying comfortable',
          'is about to pay a special dividend',
        ],
        answer: 2,
      },
      {
        q: 'An event shock to a weak-linked sector is deliberately kept:',
        options: [
          'larger than a day of noise, so it always pays to react',
          'smaller than a day of noise, so you have to think',
          'exactly zero',
          'random each time',
        ],
        answer: 1,
      },
    ],
  },
]

export function getModule(id: string): Module | undefined {
  return MODULES.find((m) => m.id === id)
}
