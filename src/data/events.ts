import type { MarketEvent } from '@/sim/types'

/**
 * Step 13. The pool the day's event is drawn from. The player reads the
 * headline; the sector map they never see — working out who it helps is the
 * whole exercise.
 *
 * TUNING (do this by playing): a primary sector should move ~4-6% total over
 * the event's life, a secondary one ~1.5-2.5%, a contra one ~1-2%. Keep the
 * weak links under a day's noise so the headline prompts thinking, not a reflex.
 */
export type EventDef = Omit<MarketEvent, 'firedAt'>

export const EVENTS: EventDef[] = [
  {
    id: 'infra-spend',
    headline: 'Government clears ₹40,000 crore of highway and port projects',
    sectorShocks: { construction: 0.06, steel: 0.045, cement: 0.04, it: -0.012 },
    decayMinutes: 220,
  },
  {
    id: 'rate-hike',
    headline: 'Central bank raises the policy rate by 25 basis points',
    sectorShocks: { banking: -0.035, energy: -0.02, consumer: -0.015, it: 0.012 },
    decayMinutes: 260,
  },
  {
    id: 'monsoon-good',
    headline: 'Monsoon forecast revised sharply upward for the season',
    sectorShocks: { consumer: 0.03, cement: 0.025, energy: -0.015, pharma: -0.01 },
    decayMinutes: 200,
  },
  {
    id: 'it-export-slump',
    headline: 'US client budgets freeze; IT export outlook cut for the year',
    sectorShocks: { it: -0.05, payments: -0.02 },
    decayMinutes: 240,
  },
  {
    id: 'pharma-approvals',
    headline: 'Regulator clears a large batch of generic drug approvals',
    sectorShocks: { pharma: 0.045, consumer: 0.008 },
    decayMinutes: 180,
  },
  {
    id: 'steel-tariff',
    headline: 'Import tariff on finished steel doubled overnight',
    sectorShocks: { steel: 0.05, construction: -0.018, logistics: -0.012 },
    decayMinutes: 210,
  },
  {
    id: 'fuel-spike',
    headline: 'Global crude jumps 12% after a supply disruption',
    sectorShocks: { energy: 0.04, logistics: -0.03, consumer: -0.02, cement: -0.015 },
    decayMinutes: 200,
  },
  {
    id: 'payments-crackdown',
    headline: 'Regulator tightens rules on digital-wallet float balances',
    sectorShocks: { payments: -0.055, banking: 0.012 },
    decayMinutes: 230,
  },

  /* Harvested from real macro news by tools/tinyfish/harvest-events.mjs on
     2026-10-18 and promoted by hand. The pattern and its magnitude come from
     what was in the news; the wording is this file's own, so no real company
     can reach a market you can trade. Provenance for each is kept in
     tools/tinyfish/candidates/. */
  {
    id: 'bank-asset-quality',
    headline: 'Bad-loan ratios tick up across the banking system',
    sectorShocks: { banking: -0.045, payments: -0.015, consumer: -0.012 },
    decayMinutes: 240,
  },
  {
    id: 'freight-squeeze',
    headline: 'Freight rates spike as port congestion builds',
    sectorShocks: { logistics: 0.045, consumer: -0.018, steel: -0.012 },
    decayMinutes: 200,
  },
  {
    id: 'power-shortage',
    headline: 'Peak power demand sets a record and strains the grid',
    sectorShocks: { energy: 0.04, steel: -0.018, cement: -0.015, it: -0.01 },
    decayMinutes: 210,
  },
  {
    id: 'export-incentive',
    headline: 'Manufacturing incentive scheme widened to more sectors',
    sectorShocks: { steel: 0.035, it: 0.02, logistics: 0.018, banking: 0.01 },
    decayMinutes: 220,
  },
  {
    id: 'pharma-pricing',
    headline: 'Price caps extended to another list of essential medicines',
    sectorShocks: { pharma: -0.05, consumer: 0.01 },
    decayMinutes: 230,
  },
]
