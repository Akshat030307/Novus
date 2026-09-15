/**
 * Step C-h. Set-piece drills, run in a modal off the Academy — no city, no
 * clock, no save. Deliberate practice you can repeat. Each `kind` maps to a
 * runner component in ui/scenarios/.
 */
export interface Scenario {
  id: string
  title: string
  brief: string
  goal: string
  kind: 'credit-desk' | 'build-a-book' | 'spot-the-shock' | 'replay'
  /** replays only — the entry in data/replays (issue B7) */
  replayId?: string
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'credit-desk',
    title: 'The credit desk',
    brief: 'Five loan files, back to back. Commit a risk read on each, then make the call.',
    goal: 'A sound judgement on all five.',
    kind: 'credit-desk',
  },
  {
    id: 'build-a-book',
    title: 'Build a book',
    brief:
      '₹5,00,000 and a snapshot of the market. No ticking prices — this is about the shape of the book, not the timing.',
    goal: 'Hold at least four different stocks with no single one over 40% of the book.',
    kind: 'build-a-book',
  },
  {
    id: 'spot-the-shock',
    title: 'Spot the shock',
    brief: 'A headline lands. Pick the stocks you would expect it to lift.',
    goal: 'Choose the sectors the event actually helps, and avoid the ones it hurts.',
    kind: 'spot-the-shock',
  },
  // issue B7 — real, concluded, sourced periods, replayed a decision at a time
  {
    id: 'replay-satyam',
    title: 'Replay: Satyam, 2008',
    brief:
      'A documented event, walked forward one decision at a time. You see only what was public at each point. Marked on what was defensible then, not on knowing the ending.',
    goal: 'Make the call the evidence supported at the time, three times running.',
    kind: 'replay',
    replayId: 'replay-satyam',
  },
  {
    id: 'replay-ilfs',
    title: 'Replay: IL&FS, 2018',
    brief:
      'The same again, from the funding side. A top rating, a maturity mismatch, and a market that closed.',
    goal: 'Make the call the evidence supported at the time, three times running.',
    kind: 'replay',
    replayId: 'replay-ilfs',
  },
]
