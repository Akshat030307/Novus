/**
 * Step C-a2. The Casebook — real, concluded financial events, as study
 * material. The one place in Novus real companies appear (docs/education.md
 * principle 5): historical record, not advice, sources cited.
 *
 * DRAFT. These cards are written from well-established public accounts. Every
 * figure and date needs a pass against the cited sources before this ships to
 * anyone. The `tools/casebook-ingest/` skeleton is where that pipeline goes.
 */
export interface CasebookEntry {
  id: string
  title: string
  year: string
  oneLine: string
  timeline: string[]
  numbers: string[]
  /** the tells that were visible before it broke */
  redFlags: string[]
  /** Ledger concept ids (data/concepts.ts) this reinforces */
  teaches: string[]
  /** the fictional Novus case it rhymes with */
  pairsWith: string
  questions: { q: string; a: string }[]
  sources: { label: string; url: string }[]
}

export const CASEBOOK: CasebookEntry[] = [
  {
    id: 'satyam',
    title: 'Satyam Computers',
    year: '2009',
    oneLine:
      "One of India's largest IT firms had been reporting cash and profits that did not exist. The chairman confessed in a letter to the board.",
    timeline: [
      'For years, revenues, margins and — above all — the bank balance were inflated in the accounts.',
      'A 2008 attempt to buy two promoter-linked firms with Satyam cash was blocked by shareholders.',
      'January 2009: chairman Ramalinga Raju admitted the fraud in writing. The share price fell around 78% in a day.',
      'The company was auctioned by a government-appointed board and bought by Tech Mahindra.',
    ],
    numbers: [
      'Around ₹7,100 crore of cash and bank balances on the books were fabricated.',
      'Reported operating margins ran well above the rest of the sector.',
      'Promoter holding had fallen to single digits, with pledged shares.',
    ],
    redFlags: [
      'A very large cash pile that earned almost no interest.',
      'Reported profit that the operating cash flow never backed up.',
      'Margins conspicuously better than every comparable firm.',
      'A falling promoter stake and pledged shares.',
    ],
    teaches: ['operating-cash-flow', 'margin', 'credit-score'],
    pairsWith: 'Vector Trading — a spotless score the accounts do not support',
    questions: [
      {
        q: 'Which single line on the balance sheet was the clearest tell?',
        a: 'Cash and bank balances. A huge balance that generates no interest income is a balance that may not be there.',
      },
      {
        q: 'Why did the blocked acquisition matter as a warning?',
        a: 'Trying to move company cash into promoter-linked entities is a reason to doubt that the cash — and the people reporting it — can be trusted.',
      },
    ],
    sources: [
      { label: 'Wikipedia — Satyam scandal', url: 'https://en.wikipedia.org/wiki/Satyam_scandal' },
      { label: 'SEBI', url: 'https://www.sebi.gov.in/' },
    ],
  },
  {
    id: 'ilfs',
    title: 'IL&FS',
    year: '2018',
    oneLine:
      'A large, top-rated infrastructure financier defaulted on its debt, and the shock ran through the whole non-bank lending sector.',
    timeline: [
      'IL&FS borrowed heavily, much of it short-term, to fund infrastructure assets that pay back over decades.',
      'Mid-2018: it began missing payments on commercial paper and other obligations.',
      'Ratings were cut from top-grade to default within days.',
      'The government superseded the board; NBFC funding costs jumped across the market.',
    ],
    numbers: [
      'Group debt was around ₹91,000 crore.',
      'The group had grown to several hundred subsidiaries and associate entities.',
      'It held an investment-grade rating almost up to the first default.',
    ],
    redFlags: [
      'Short-term borrowing funding long-dated assets — an asset-liability mismatch.',
      'Debt rising far faster than the cash the assets threw off.',
      'A structure too complex for outsiders — or the board — to see through.',
      'A rating that never moved until it moved all at once.',
    ],
    teaches: ['leverage', 'debt-to-equity', 'operating-cash-flow', 'drift-noise-shock'],
    pairsWith: 'Girish Steel — existing debt is nine years of profit',
    questions: [
      {
        q: 'What is an asset-liability mismatch, in one sentence?',
        a: 'Owing money back sooner than the things you spent it on will pay you — so you depend on always being able to borrow again.',
      },
      {
        q: 'Why did one firm’s default move unrelated NBFCs?',
        a: 'It made every lender re-price the risk of short-term NBFC funding at once — contagion, not a coincidence.',
      },
    ],
    sources: [
      { label: 'Wikipedia — IL&FS', url: 'https://en.wikipedia.org/wiki/IL%26FS' },
      { label: 'Reserve Bank of India', url: 'https://www.rbi.org.in/' },
    ],
  },
  {
    id: 'pnb-lou',
    title: 'Punjab National Bank — letters of undertaking',
    year: '2018',
    oneLine:
      'A multi-year fraud at a single branch issued bank guarantees that the bank’s own systems never recorded.',
    timeline: [
      'Two employees at one Mumbai branch issued letters of undertaking over the international messaging system.',
      'The messaging terminal was not linked to the bank’s core system, so the guarantees left no trace in its books.',
      'The credit was rolled over for roughly seven years before a new officer refused to continue it.',
      'February 2018: the bank disclosed the fraud. The main beneficiaries had already left the country.',
    ],
    numbers: [
      'The exposure was disclosed at around ₹11,400 crore and later put higher.',
      'It ran for about seven years undetected.',
      'It was concentrated in one branch and a handful of staff.',
    ],
    redFlags: [
      'Messaging system and core banking system never reconciled against each other.',
      'Authority to commit the bank concentrated in one or two people.',
      'Trade-finance credit rolled over indefinitely rather than settled.',
      'A long-standing client relationship treated as a reason not to check.',
    ],
    teaches: ['credit-score', 'default-risk'],
    pairsWith: 'the fraud-pattern case (planned) — a control that was not there',
    questions: [
      {
        q: 'How were the guarantees invisible to the bank?',
        a: 'They were sent on a system that was never tied into the bank’s ledgers, so nothing in the official records showed the liability.',
      },
      {
        q: 'What ordinary control would have caught it?',
        a: 'Reconciling outgoing messages against the core banking system — and not letting the same people initiate and approve.',
      },
    ],
    sources: [
      {
        label: 'Wikipedia — Punjab National Bank Scam',
        url: 'https://en.wikipedia.org/wiki/Punjab_National_Bank_Scam',
      },
    ],
  },
  {
    id: 'harshad-mehta',
    title: 'The 1992 securities scam',
    year: '1992',
    oneLine:
      'A broker used gaps in how banks settled government-bond trades to pour bank money into the stock market.',
    timeline: [
      'Bank funds meant for inter-bank bond deals were routed, via fake receipts, into equities.',
      'The index roughly quadrupled in a year; some stocks rose tenfold and more.',
      'April 1992: a newspaper investigation exposed the mechanism. The market crashed.',
      'The fallout led directly to a statutory market regulator, an electronic exchange, and dematerialised shares.',
    ],
    numbers: [
      'The diverted sums were put at roughly ₹4,000 crore.',
      'The benchmark index went from about 1,000 to about 4,500 before collapsing.',
      'One cement stock ran from a few hundred rupees to several thousand.',
    ],
    redFlags: [
      'A single broker able to move the whole market.',
      'Prices with no relationship to company earnings — P/E multiples far beyond anything the profits justified.',
      'Bank money reaching the stock market through instruments nobody was really checking.',
    ],
    teaches: ['drift-noise-shock', 'pe-ratio', 'default-risk'],
    pairsWith: 'the "reading the tape" module — telling a price move from a story',
    questions: [
      {
        q: 'What told you the 1992 rally was not real?',
        a: 'Share prices detached from earnings — valuations no plausible profit growth could support — plus a single participant driving the move.',
      },
      {
        q: 'What changed afterwards?',
        a: 'The regulator got statutory teeth, a transparent electronic exchange was built, and settlement moved off paper.',
      },
    ],
    sources: [
      {
        label: 'Wikipedia — 1992 Indian stock market scam',
        url: 'https://en.wikipedia.org/wiki/1992_Indian_stock_market_scam',
      },
    ],
  },
  {
    id: 'kingfisher',
    title: 'Kingfisher Airlines',
    year: '2012',
    oneLine:
      'An airline that never turned an annual profit borrowed its way through seven years before grounding its fleet.',
    timeline: [
      'Launched in 2005; expanded fast, including buying a low-cost rival on debt in 2007.',
      'Losses accumulated every year; net worth turned negative.',
      'October 2012: operations stopped and the flying licence lapsed.',
      'Banks later declared the company and its promoter willful defaulters and invoked guarantees.',
    ],
    numbers: [
      'Debt to a consortium of around 17 banks ran past ₹7,000 crore.',
      'The airline did not report a single profitable year.',
      'Part of the borrowing was secured against an optimistic valuation of the brand.',
    ],
    redFlags: [
      'Persistent operating losses — the core business never covered its costs.',
      'Negative net worth carried by fresh borrowing.',
      'Debt-funded expansion into an acquisition while already loss-making.',
      'Collateral leaning on an intangible whose value depended on the company surviving.',
    ],
    teaches: ['operating-cash-flow', 'margin', 'leverage', 'default-risk'],
    pairsWith: 'Sharma Textiles / Prakash Cold Storage — can the business carry more debt at all',
    questions: [
      {
        q: 'What is the problem with lending against brand value here?',
        a: 'A brand is only worth something if the company keeps operating. As security for the loan that keeps it operating, it is close to circular.',
      },
      {
        q: 'Which figure settled it, years before the grounding?',
        a: 'No profitable year. A business that never covers its own costs is repaid only out of new borrowing.',
      },
    ],
    sources: [
      {
        label: 'Wikipedia — Kingfisher Airlines',
        url: 'https://en.wikipedia.org/wiki/Kingfisher_Airlines',
      },
    ],
  },
  {
    id: 'gfc-2008',
    title: 'The 2008 financial crisis',
    year: '2008',
    oneLine:
      'US home loans to weak borrowers were packaged into securities rated as safe, sold worldwide, and then defaulted together.',
    timeline: [
      'Subprime mortgages were bundled into securities; the senior slices were rated top-grade.',
      'US house prices peaked in 2006 and fell; mortgage defaults rose.',
      'March 2008: Bear Stearns was rescued. September 2008: Lehman Brothers went bankrupt.',
      'Credit froze globally; a deep recession followed.',
    ],
    numbers: [
      'Major investment banks were leveraged in the region of 30 to 1.',
      'Lehman had around $600 billion in assets — the largest bankruptcy in US history.',
      'Much of the funding was very short-term borrowing rolled over daily.',
    ],
    redFlags: [
      'Extreme leverage — a small fall in asset values wipes out the equity.',
      'Reliance on rolling over short-term funding every day.',
      'Ratings that reflected the structure, not the quality of the underlying loans.',
      'House prices far above what local incomes could service — and assumed never to fall together.',
    ],
    teaches: ['leverage', 'debt-to-equity', 'diversification', 'drift-noise-shock'],
    pairsWith: 'the "don’t bet the book" module — correlation is concentration in disguise',
    questions: [
      {
        q: 'Why did "diversified" pools of mortgages fail together?',
        a: 'The loans were only diversified if house prices moved independently. They fell across the country at once, so the pool behaved like one big loan.',
      },
      {
        q: 'What does 30-to-1 leverage mean for the equity?',
        a: 'A roughly 3% fall in asset value is enough to erase it entirely.',
      },
    ],
    sources: [
      {
        label: 'Wikipedia — 2007–2008 financial crisis',
        url: 'https://en.wikipedia.org/wiki/2007%E2%80%932008_financial_crisis',
      },
      {
        label: 'Wikipedia — Bankruptcy of Lehman Brothers',
        url: 'https://en.wikipedia.org/wiki/Bankruptcy_of_Lehman_Brothers',
      },
    ],
  },
]

export function getCasebookEntry(id: string): CasebookEntry | undefined {
  return CASEBOOK.find((e) => e.id === id)
}
