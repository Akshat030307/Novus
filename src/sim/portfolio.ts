import type { GameState, Holding, LevelUpReport, Trade } from '@/sim/types'
import { rupees } from '@/lib/format'
import { awardProgress, tradeSkillGains, XP_PER_TRADE } from '@/sim/progression'

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

  const { player, levelUps } = awardProgress(
    { ...state.player, cash: nextCash },
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
