import type { Clock, GameNotification, MarketEvent, MarketState } from '@/sim/types'
import { makeRng } from '@/sim/rng'
import { MARKET_OPEN } from '@/lib/format'
import { EVENTS, type EventDef } from '@/data/events'

/**
 * Step 13. At most one event a day, a pure function of the seed and the day.
 * `rollDayEvent` decides which and when; `maybeFireEvent` drops it into the
 * market and the feed once the clock reaches it. The sector map rides inside
 * `MarketEvent.sectorShocks` and is never shown — `sim/market` reads it,
 * nothing in the UI does.
 */

const EVENT_CHANCE = 0.65
/** mid-morning window: 9:45 to 11:30 */
const FIRE_FROM = MARKET_OPEN + 30
const FIRE_TO = MARKET_OPEN + 135
const NOTIFICATION_CAP = 30

export function rollDayEvent(
  seed: string,
  day: number,
): { event: EventDef; fireMinute: number } | null {
  if (day <= 1) return null // a gentle first day
  const rng = makeRng(`${seed}|event|${day}`)
  if (!rng.chance(EVENT_CHANCE)) return null
  return { event: rng.pick(EVENTS), fireMinute: rng.int(FIRE_FROM, FIRE_TO) }
}

/**
 * If the day's event is due and not already live, add it to the market and
 * push its headline to the feed. Pure — returns the pieces the driver merges.
 */
export function maybeFireEvent(
  market: MarketState,
  notifications: GameNotification[],
  seed: string,
  clock: Clock,
): { market: MarketState; notifications: GameNotification[] } {
  const rolled = rollDayEvent(seed, clock.day)
  if (!rolled || clock.minute < rolled.fireMinute) return { market, notifications }

  const already = market.activeEvents.some(
    (e) => e.id === rolled.event.id && e.firedAt.day === clock.day,
  )
  if (already) return { market, notifications }

  const fired: MarketEvent = {
    ...rolled.event,
    firedAt: { day: clock.day, minute: rolled.fireMinute },
  }
  const note: GameNotification = {
    id: `event-${clock.day}-${rolled.event.id}`,
    kind: 'market',
    text: rolled.event.headline,
    day: clock.day,
    minute: rolled.fireMinute,
  }
  return {
    market: { ...market, activeEvents: [...market.activeEvents, fired] },
    notifications: [...notifications, note].slice(-NOTIFICATION_CAP),
  }
}
