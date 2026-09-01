/**
 * The Ledger's cards. Content only — plain language, no filler, the same
 * voice as the rest of the interface. `getConcept` is how ui/components/
 * Explain.tsx and the Ledger panel look one up.
 */
export interface Concept {
  id: string
  label: string
  /** shown in mono next to the label, when there is a clean one */
  formula?: string
  /** one or two sentences — what it is */
  short: string
  /** what a good and a bad value look like */
  goodBad: string
  furtherReading?: { label: string; url: string }
}

export const CONCEPTS: Concept[] = [
  {
    id: 'debt-service-cover',
    label: 'Debt-service cover',
    formula: 'operating cash flow ÷ interest paid',
    short:
      "How many times over a business's operating cash flow covers the interest it already owes this year.",
    goodBad: 'Above 2× is comfortable. Below 1.3× and one soft month is a missed payment.',
    furtherReading: {
      label: 'Wikipedia — Debt service coverage ratio',
      url: 'https://en.wikipedia.org/wiki/Debt_service_coverage_ratio',
    },
  },
  {
    id: 'operating-cash-flow',
    label: 'Cash isn’t revenue',
    short:
      "Revenue is what a business is owed. Operating cash flow is what actually landed in the account. A business can show a profit and still run out of cash.",
    goodBad:
      'When cash flow sits far below revenue, ask where the money went before the loan looks safer than it is.',
    furtherReading: { label: 'Wikipedia — Cash flow', url: 'https://en.wikipedia.org/wiki/Cash_flow' },
  },
  {
    id: 'leverage',
    label: 'Leverage',
    formula: 'existing debt ÷ annual profit, in years',
    short:
      "How much of a business runs on borrowed money rather than its own. High leverage turns small swings in profit into large swings in what's left for the owners.",
    goodBad: 'Under 3 years of profit to clear the debt is comfortable. Past 6 and a bad year threatens the business itself.',
    furtherReading: {
      label: 'Wikipedia — Leverage (finance)',
      url: 'https://en.wikipedia.org/wiki/Leverage_(finance)',
    },
  },
  {
    id: 'collateral-cover',
    label: 'Collateral cover',
    formula: 'collateral value ÷ existing debt',
    short:
      "What a lender can actually recover if a loan goes bad, as a share of what's owed. Collateral is a backstop, not a reason to lend badly.",
    goodBad: 'Above 75% cover is solid. Under 40% and the security barely dents the loss.',
    furtherReading: {
      label: 'Wikipedia — Collateral (finance)',
      url: 'https://en.wikipedia.org/wiki/Collateral_(finance)',
    },
  },
  {
    id: 'credit-score',
    label: 'Credit score',
    short:
      "A single number summarising how reliably a business has repaid in the past. A starting point, not the whole picture — the figures on the file can tell a different story.",
    goodBad: 'A score of 720+ reads strong on its own. A high score next to thin cash flow is still a risk.',
    furtherReading: { label: 'Wikipedia — Credit score', url: 'https://en.wikipedia.org/wiki/Credit_score' },
  },
  {
    id: 'margin',
    label: 'Operating margin',
    formula: '(revenue − expenses) ÷ revenue',
    short: "What's left of revenue after expenses, as a share. Thin margins leave little room to absorb a bad quarter.",
    goodBad: '15%+ is strong. Below 7% and a small cost overrun wipes out the year.',
    furtherReading: {
      label: 'Wikipedia — Operating margin',
      url: 'https://en.wikipedia.org/wiki/Operating_margin',
    },
  },
  {
    id: 'default-risk',
    label: 'Default risk, and reasoning over dice',
    short:
      "The real chance a loan goes bad, worked out from the figures. Never shown before you decide, and the outcome is sampled from it — but the score is on whether the file supported the call you made, not on which way the sample landed.",
    goodBad: 'There is no safe number. A sound call at 40% risk that still goes bad is still sound.',
  },
  {
    id: 'pe-ratio',
    label: 'Price-to-earnings (P/E)',
    formula: 'share price ÷ earnings per share',
    short: 'The price of a share divided by how much the company earns per share — a rough gauge of how expensive it is relative to its profit.',
    goodBad: 'A high P/E means the market has priced in a lot of future growth, and a lot of room to be disappointed.',
    furtherReading: {
      label: 'Wikipedia — Price-to-earnings ratio',
      url: 'https://en.wikipedia.org/wiki/Price%E2%80%93earnings_ratio',
    },
  },
  {
    id: 'debt-to-equity',
    label: 'Debt-to-equity (D/E)',
    formula: 'total debt ÷ shareholder equity',
    short: "How a listed company is funded: borrowed money against the owners' own stake. The market panel's version of leverage.",
    goodBad: 'Below 1 means equity outweighs debt. Well above it and the company depends on lenders staying comfortable.',
    furtherReading: {
      label: 'Wikipedia — Debt-to-equity ratio',
      url: 'https://en.wikipedia.org/wiki/Debt-to-equity_ratio',
    },
  },
  {
    id: 'unrealised-pnl',
    label: 'Realised vs unrealised profit',
    short: "Unrealised profit is what a holding is worth right now, on paper. It isn't yours until you sell — realised profit is what's actually booked.",
    goodBad: "A big unrealised gain can vanish before you sell it. Don't spend it in your head.",
    furtherReading: {
      label: 'Wikipedia — Mark-to-market accounting',
      url: 'https://en.wikipedia.org/wiki/Mark-to-market_accounting',
    },
  },
  {
    id: 'diversification',
    label: 'Diversification',
    short: "Spreading money across holdings so one bad headline can't wreck the whole book. A portfolio that's mostly one stock is a bet on that one stock, whatever else sits in it.",
    goodBad: 'No single holding dominating the allocation bar is a habit worth having, not a hard rule.',
    furtherReading: {
      label: 'Wikipedia — Diversification (finance)',
      url: 'https://en.wikipedia.org/wiki/Diversification_(finance)',
    },
  },
  {
    id: 'drift-noise-shock',
    label: 'Why prices move',
    short: 'Three forces, added together every tick: a slow drift toward what a stock is really worth, random noise that means nothing, and an event shock when real news lands.',
    goodBad: 'A 1% move on a quiet day is noise. A move that lines up with a headline you just read is signal.',
  },
]

export function getConcept(id: string): Concept | undefined {
  return CONCEPTS.find((c) => c.id === id)
}
