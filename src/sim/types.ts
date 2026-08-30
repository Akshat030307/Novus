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
}

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

export interface FinancialCase {
  id: string
  building: BuildingId
  title: string
  /** what the player is shown */
  brief: string
  figures: LoanFigures
  choices: CaseChoice[]
  /** never shown before the player decides */
  truth: {
    defaultRisk: number
    drivers: string[]
  }
  /** used to write the explanation after the outcome */
  teaches: string[]
}

export interface ResolvedCase {
  caseId: string
  choice: CaseChoiceId
  /** did the dice go the player's way */
  outcome: 'good' | 'bad'
  /** was the reasoning sound, regardless of the outcome */
  judgement: 'sound' | 'unsound'
  cashChange: Paise
  xpChange: number
  reputationChange: number
  day: number
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
export interface DayEndReport {
  day: number
  cashOpen: Paise
  cashClose: Paise
  /** profit booked from sells today */
  realisedPnL: Paise
  /** change in the mark-to-market value of open positions today */
  unrealisedPnL: Paise
  tradeCount: number
  xpGained: number
  reputationChange: number
  /** titles of quests that completed today */
  questsCompleted: string[]
  /** tomorrow's leading headline, shown as a teaser; null on a quiet day */
  tomorrowHeadline: string | null
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
}
