// The game's own per-minute driver (src/state/useGameClock.ts), replayed
// without a timer so a save can be built minute-for-minute identical to one a
// player would have. Everything runs through the real src/sim code.
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const { createJiti } = await import(root + '/node_modules/jiti/lib/jiti.mjs')
export const jiti = createJiti(root + '/', { alias: { '@': root + '/src' } })
export const R = root
const { advanceClock, startNextDay } = await jiti.import(root + '/src/sim/clock.ts')
const { tickMarket } = await jiti.import(root + '/src/sim/market/index.ts')
const { maybeFireEvent } = await jiti.import(root + '/src/sim/events.ts')
const { newGame } = await jiti.import(root + '/src/state/newGame.ts')

export function fresh(name, seed) {
  return { ...newGame(name), seed }
}
/** tick minute by minute until the clock reads `minute`, exactly as the driver does */
export function runTo(state, minute) {
  let s = state
  while (s.clock.minute < minute && s.clock.phase !== 'closed') {
    const { clock } = advanceClock(s.clock)
    let market = s.market
    let notifications = s.notifications
    if (clock.phase === 'open') {
      const fired = maybeFireEvent(s.market, s.notifications, s.seed, clock)
      market = tickMarket(fired.market, s.seed, clock)
      notifications = fired.notifications
    }
    s = { ...s, clock, market, notifications }
  }
  return s
}
export function endDay(state) {
  return startNextDay(runTo(state, 24 * 60))
}
