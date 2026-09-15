/**
 * The shapes every layer agrees on.
 *
 * Write the type here FIRST, before the screen that shows it and before the
 * simulation that produces it. The UI is being built on mock data, and the
 * only thing stopping that mock data from drifting away from what the
 * simulation can really produce is this file.
 *
 * Money is always stored in paise (1 rupee = 100 paise) as a whole number.
 * Floating point rupees drift by a paisa after enough trades and the player
 * eventually notices.
 */

export type Paise = number

export type SkillName =
  | 'analysis'
  | 'risk'
  | 'trading'
  | 'accounting'
  | 'economics'
  | 'negotiation'
  | 'fintech'
  | 'leadership'
  | 'data'
  | 'communication'

export type Sector =
  | 'banking'
  | 'construction'
  | 'steel'
  | 'cement'
  | 'it'
  | 'payments'
  | 'pharma'
  | 'consumer'
  | 'energy'
  | 'logistics'

export type BuildingId =
  | 'bank'
  | 'exchange'
  | 'fintech'
  | 'academy'
  | 'apartment'
  /** Risk & Compliance — where the pattern files are read (issue B4) */
  | 'risk'

/* ---------- clock ---------- */

export type DayPhase = 'pre_open' | 'open' | 'closed'

export interface Clock {
  day: number
  /** minutes since midnight, in game time */
  minute: number
  phase: DayPhase
}

/* ---------- market ---------- */

export interface Stock {
  id: string
  name: string
  ticker: string
  sector: Sector
  price: Paise
  /** yesterday's closing price, for the day change figure */
  previousClose: Paise
  /** hidden from the player: what the price drifts towards */
  fairValue: Paise
  /** 0.005 = quiet, 0.04 = wild */
  volatility: number
  fundamentals: Fundamentals
}

export interface Fundamentals {
  marketCap: Paise
  revenue: Paise
  earnings: Paise
  peRatio: number
  revenueGrowth: number
  debtToEquity: number
}

export interface PricePoint {
  day: number
  minute: number
  price: Paise
}

export interface MarketEvent {
  id: string
  headline: string
  /** the player never sees this map — they work it out from the headline */
  sectorShocks: Partial<Record<Sector, number>>
  decayMinutes: number
  firedAt: { day: number; minute: number }
}

export interface MarketState {
  stocks: Stock[]
  activeEvents: MarketEvent[]
  /** capped at the last 200 points per stock so saves stay small */
  history: Record<string, PricePoint[]>
}

/* ---------- portfolio ---------- */

export interface Holding {
  stockId: string
  quantity: number
  averageCost: Paise
}

export interface Trade {
  id: string
  stockId: string
  side: 'buy' | 'sell'
  quantity: number
  price: Paise
  day: number
  minute: number
}

export interface PortfolioState {
  holdings: Holding[]
  realisedPnL: Paise
  trades: Trade[]
}

/* ---------- cases ---------- */

export type CaseChoiceId = string

export interface CaseChoice {
  id: CaseChoiceId
  label: string
  detail?: string
  /**
   * Does this choice step out of the way of the file's hazard? A rejected
   * loan, a trimmed position, an escalated audit. It decides which way the
   * outcome roll reads: guarded choices are vindicated when the hazard lands,
   * unguarded ones are vindicated when it doesn't.
   *
   * Loan cases leave it off — the four standard choice ids already say.
   */
  guards?: boolean
  /** multiplies the hazard for a choice that still takes the risk on */
  riskMult?: number
}

/**
 * Issue B4. A case used to be a loan and nothing else, which capped the whole
 * library at about thirty minutes of content: you could not author an
 * allocation exercise or a fraud-pattern file without changing the type.
 *
 * It is now a union on `kind`. Everything shared lives on `CaseBase`; the
 * evidence the player reads and the hidden truth they are judged against are
 * per-kind. `sim/cases/index.ts` branches once, at the top, and the compiler
 * makes sure every branch is handled.
 *
 * Each kind sits in a different building, which is the point — the city stops
 * being decoration when the file you can read depends on where you walked.
 */
export type CaseKind = 'loan' | 'allocation' | 'pattern'

export interface CaseBase {
  id: string
  building: BuildingId
  title: string
  /** what the player is shown */
  brief: string
  choices: CaseChoice[]
  /** used to write the explanation after the outcome */
  teaches: string[]
}

/* --- loan: can this borrower carry the debt --- */

export interface LoanFigures {
  revenue: Paise
  expenses: Paise
  existingDebt: Paise
  interestPaid: Paise
  cashFlow: Paise
  creditScore: number
  collateralValue: Paise
  sector: Sector
}

export interface LoanTruth {
  defaultRisk: number
  drivers: string[]
}

export interface LoanCase extends CaseBase {
  kind: 'loan'
  figures: LoanFigures
  /** never shown before the player decides */
  truth: LoanTruth
}

/* --- allocation: is this book shaped like it should be --- */

/** one position in a book the player is asked to judge, not to trade */
export interface BookLine {
  name: string
  sector: Sector
  value: Paise
  note?: string
}

export interface AllocationTruth {
  /** every choice a careful analyst could defend, not just the best one */
  soundChoices: CaseChoiceId[]
  /** chance the book as it stands takes a serious hit */
  hitRisk: number
  drivers: string[]
}

export interface AllocationCase extends CaseBase {
  kind: 'allocation'
  book: BookLine[]
  /** what the book was supposed to respect — the rules it is measured against */
  mandate: string[]
  truth: AllocationTruth
}

/* --- pattern: does this set of accounts hold together --- */

export interface LedgerLine {
  label: string
  value: string
  /** a second line, where the figure needs context to be readable */
  note?: string
}

/** a red flag the player can tick. Some are real; the rest are decoys. */
export interface CaseFlag {
  id: string
  label: string
}

export interface PatternTruth {
  /** the ids in `flags` that genuinely point at something */
  realFlags: string[]
  soundChoices: CaseChoiceId[]
  /** chance the file really is what the flags suggest */
  fraudRisk: number
  drivers: string[]
  /** the Casebook entry this rhymes with — see data/casebook.ts (issue B5) */
  echoes?: string
}

export interface PatternCase extends CaseBase {
  kind: 'pattern'
  accounts: LedgerLine[]
  flags: CaseFlag[]
  truth: PatternTruth
}

export type FinancialCase = LoanCase | AllocationCase | PatternCase

/**
 * What the player commits before deciding, in step C-d. The risk band is
 * graded against the hidden truth; the note is shown back, not scored.
 * Optional throughout — skipping it costs the feedback, never the decision.
 */
export interface CasePrediction {
  risk: 'low' | 'mid' | 'high' // <20% / 20-40% / >40%
  note?: string
}

/** how a pattern case's red-flag ticks scored (issue B4) */
export interface FlagScore {
  /** real flags the player ticked */
  found: number
  /** real flags there were to find */
  of: number
  /** decoys the player ticked — reading too much into a file is its own error */
  wrong: number
}

export interface ResolvedCase {
  caseId: string
  /** which kind of file this was. Saves from before B4 are all 'loan'. */
  kind: CaseKind
  choice: CaseChoiceId
  /** did the dice go the player's way */
  outcome: 'good' | 'bad'
  /** was the reasoning sound, regardless of the outcome */
  judgement: 'sound' | 'unsound'
  cashChange: Paise
  xpChange: number
  reputationChange: number
  day: number
  /** absent for cases resolved before C-d, or when the player skipped it */
  prediction?: CasePrediction
  /** did the risk band contain the real risk */
  predictionRight?: boolean
  /** pattern cases only */
  flagScore?: FlagScore
}

/* ---------- quests ---------- */

export interface QuestStep {
  id: string
  text: string
  done: boolean
}

export interface QuestState {
  id: string
  title: string
  steps: QuestStep[]
  building?: BuildingId
}

/* ---------- player ---------- */

export interface Player {
  name: string
  role: 'intern'
  level: number
  xp: number
  xpToNext: number
  cash: Paise
  reputation: number
  skills: Record<SkillName, number>
  position: { x: number; y: number; scene: string }
  /**
   * Focus, 0-100. Deciding in a hurry and churning trades burn it; the
   * Cafeteria and a night's sleep buy it back. Below ENERGY_TIRED the
   * skill-unlocked hints stop showing — a tired analyst reads worse.
   * See sim/energy.ts.
   */
  energy: number
}

/* ---------- notifications ---------- */

export interface GameNotification {
  id: string
  kind: 'market' | 'quest' | 'money' | 'city'
  text: string
  day: number
  minute: number
}

/* ---------- day end & level up ---------- */

/**
 * Produced by sim/clock.ts when the market closes at 3:30pm and handed to the
 * day-end screen. Not part of GameState — it is a summary of the day just
 * finished, not something the save needs to carry.
 */
/**
 * What the world looked like when the day opened, so the close can diff
 * against it rather than guess. Written by `newGame` and `startNextDay`,
 * read only by `buildDayEndReport`.
 */
export interface DayOpen {
  day: number
  cash: Paise
  reputation: number
  /** cumulative booked P&L at the open — today's is the difference */
  realisedPnL: Paise
  /** mark-to-market value of open positions at the open */
  holdingsValue: Paise
  /** quest ids already finished at the open */
  questsCompleted: string[]
}

export interface DayEndReport {
  day: number
  cashOpen: Paise
  cashClose: Paise
  /** profit booked from sells today */
  realisedPnL: Paise
  /** unbooked profit still sitting in open positions (value minus cost) */
  unrealisedPnL: Paise
  /** cash + open positions at the close against the same at the open */
  netChange: Paise
  tradeCount: number
  xpGained: number
  reputationChange: number
  /** titles of quests that completed today */
  questsCompleted: string[]
  /** tomorrow's leading headline, shown as a teaser; null on a quiet day */
  tomorrowHeadline: string | null
  /** one plain-language teaching sentence about the day, or null (step C-e) */
  lesson: string | null
}

/**
 * Produced by sim/progression.ts when a trade or case result pushes the player
 * over an XP threshold. Drives the level-up popup.
 */
export interface LevelUpReport {
  newLevel: number
  /** short lines describing what the new level opened up */
  unlocks: string[]
}

/* ---------- the whole save ---------- */

export interface GameState {
  version: number
  seed: string
  clock: Clock
  player: Player
  market: MarketState
  portfolio: PortfolioState
  quests: { active: QuestState[]; completed: string[] }
  cases: { openCaseId: string | null; resolved: ResolvedCase[] }
  notifications: GameNotification[]
  flags: Record<string, boolean>
  /** ids of Ledger concepts unlocked so far — see sim/concepts.ts */
  learned: string[]
  /** recurring errors the game has spotted — see sim/analysis.ts (step C-e) */
  mistakes: MistakeRecord[]
  /** Academy module progress, keyed by module id (step C-f) */
  modules: Record<string, ModuleProgress>
  /** snapshot taken when the day opened — see DayOpen (issue A1) */
  dayOpen: DayOpen
}

/** one error, logged at the day boundary, with the lesson attached */
export interface MistakeRecord {
  id: string
  kind: 'unsound_call' | 'concentration' | 'noise_trade' | 'missed_flags'
  day: number
  note: string
}

export interface ModuleProgress {
  started: boolean
  passed: boolean
  /** best fraction correct on the end check, 0–1 */
  score?: number
}
