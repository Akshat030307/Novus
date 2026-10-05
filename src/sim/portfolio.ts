import type { GameState, Holding, LevelUpReport, Paise, Trade } from '@/sim/types'
import { rupees } from '@/lib/format'
import { awardProgress, tradeSkillGains, XP_PER_TRADE } from '@/sim/progression'
import { spendEnergy, tradeEnergyCost } from '@/sim/energy'

export interface TradeOrder {
  stockId: string
  side: 'buy' | 'sell'
  quantity: number
}

export type TradeResult =
  | { ok: true; state: GameState; levelUps: LevelUpReport[] }
  | { ok: false; reason: string }

/**
 * Step 9. Apply one buy or sell. Pure and deterministic — the price is the
 * current tick, the trade id is derived, nothing here touches the rng, so a
 * mid-session save reloads with cash and holdings exact.
 *
 * No brokerage: a buy costs exactly price x quantity, a sell yields the same.
 * A rejected trade returns a reason the UI shows verbatim.
 */
export function applyTrade(state: GameState, order: TradeOrder): TradeResult {
  const { stockId, side, quantity } = order

  if (!Number.isInteger(quantity) || quantity < 1) {
    return { ok: false, reason: 'Enter a whole number of shares.' }
  }
  if (state.clock.phase !== 'open') {
    return { ok: false, reason: 'The market is closed — it opens at 9:15 am.' }
  }

  const stock = state.market.stocks.find((s) => s.id === stockId)
  if (!stock) return { ok: false, reason: 'No such stock.' }

  const { holdings, realisedPnL, trades } = state.portfolio
  const held = holdings.find((h) => h.stockId === stockId)
  const gross = stock.price * quantity

  let nextHoldings: Holding[]
  let nextCash: number
  let nextRealised = realisedPnL

  if (side === 'buy') {
    if (gross > state.player.cash) {
      return {
        ok: false,
        reason: `This costs ${rupees(gross)} — you have ${rupees(state.player.cash)}.`,
      }
    }
    nextCash = state.player.cash - gross
    nextHoldings = held
      ? holdings.map((h) =>
          h.stockId === stockId
            ? {
                ...h,
                quantity: h.quantity + quantity,
                averageCost: Math.round(
                  (h.averageCost * h.quantity + gross) / (h.quantity + quantity),
                ),
              }
            : h,
        )
      : [...holdings, { stockId, quantity, averageCost: stock.price }]
  } else {
    if (!held || quantity > held.quantity) {
      const have = held?.quantity ?? 0
      return {
        ok: false,
        reason:
          have === 0
            ? `You don't hold any ${stock.name}.`
            : `You hold ${have} ${stock.name} ${have === 1 ? 'share' : 'shares'} — can't sell ${quantity}.`,
      }
    }
    nextCash = state.player.cash + gross
    nextRealised = realisedPnL + (stock.price - held.averageCost) * quantity
    const left = held.quantity - quantity
    nextHoldings =
      left === 0
        ? holdings.filter((h) => h.stockId !== stockId)
        : holdings.map((h) => (h.stockId === stockId ? { ...h, quantity: left } : h))
  }

  const trade: Trade = {
    id: `${state.clock.day}-${state.clock.minute}-${stockId}-${side}-${trades.length}`,
    stockId,
    side,
    quantity,
    price: stock.price,
    day: state.clock.day,
    minute: state.clock.minute,
  }

  // energy cost is read before the new trade lands, so a busy hour is the
  // trades already made inside the window (A2)
  const { player, levelUps } = awardProgress(
    spendEnergy({ ...state.player, cash: nextCash }, tradeEnergyCost(state)),
    { xp: XP_PER_TRADE, skills: tradeSkillGains() },
  )

  return {
    ok: true,
    levelUps,
    state: {
      ...state,
      player,
      portfolio: {
        holdings: nextHoldings,
        realisedPnL: nextRealised,
        trades: [...trades, trade],
      },
    },
  }
}

/* ---------- what the sidebar shows ---------- */

export interface BookSummary {
  cash: Paise
  /** mark-to-market value of everything held right now */
  holdingsValue: Paise
  /** what those holdings cost */
  invested: Paise
  /** value minus cost — profit that only exists on paper */
  unrealised: Paise
  /** cash + holdings, against the same figure when the day opened */
  net: Paise
  dayChange: Paise
  positions: number
  /** the single biggest position, for the concentration warning */
  biggest: { name: string; value: Paise; share: number } | null
}

/**
 * The book in one object, so the HUD can show money without doing money
 * maths itself. Shares are a fraction of net worth, not of holdings: a book
 * that is 90% cash is not concentrated.
 */
export function bookSummary(state: GameState): BookSummary {
  const priceOf = (id: string) => state.market.stocks.find((s) => s.id === id)?.price ?? 0
  const nameOf = (id: string) => state.market.stocks.find((s) => s.id === id)?.name ?? id

  const invested = state.portfolio.holdings.reduce((t, h) => t + h.averageCost * h.quantity, 0)
  const holdingsValue = state.portfolio.holdings.reduce((t, h) => t + priceOf(h.stockId) * h.quantity, 0)
  const net = state.player.cash + holdingsValue
  const openNet = state.dayOpen.cash + state.dayOpen.holdingsValue

  let biggest: BookSummary['biggest'] = null
  for (const h of state.portfolio.holdings) {
    const value = priceOf(h.stockId) * h.quantity
    if (!biggest || value > biggest.value) {
      biggest = { name: nameOf(h.stockId), value, share: net > 0 ? value / net : 0 }
    }
  }

  return {
    cash: state.player.cash,
    holdingsValue,
    invested,
    unrealised: holdingsValue - invested,
    net,
    dayChange: net - openNet,
    positions: state.portfolio.holdings.length,
    biggest,
  }
}
