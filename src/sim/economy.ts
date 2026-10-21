/**
 * Step 9 to 11. See docs/architecture.md.
 *
 * For now this holds the one economic constant other rules have to agree on:
 * what everybody starts with. It lives here rather than in `state/newGame.ts`
 * because the leaderboard measures trading against it, and a number two
 * modules both depend on belongs to the simulation, not to the thing that
 * happens to write the first save.
 */

/** ₹5,00,000, in paise. Every career opens with exactly this. */
export const STARTING_CAPITAL = 5_00_000_00
