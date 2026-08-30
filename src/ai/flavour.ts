/**
 * Step 15. The only file allowed to call a model.
 *
 * It takes numbers the simulation has already decided and asks for wording:
 * the story around a loan, what an NPC says about something that just
 * happened, how a headline is phrased.
 *
 * Three hard rules:
 *   1. never use a number the model returns — if it invents a revenue figure,
 *      throw it away
 *   2. every call has written fallback text in fallback.ts, so the whole game
 *      plays with AI switched off
 *   3. cache by content hash — the same case should not cost a fresh call
 *
 * Call it when a panel opens, never on the clock tick. Nothing on the tick
 * path may wait for the network.
 */
export {}
