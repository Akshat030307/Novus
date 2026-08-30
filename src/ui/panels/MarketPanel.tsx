import { useState } from 'react'
import { useGameStore, useUiStore } from '@/state/store'
import { rupees, signed } from '@/lib/format'
import { applyTrade } from '@/sim/portfolio'
import { checkQuests } from '@/sim/quests'
import { PriceChart } from '@/ui/panels/PriceChart'
import { PixelButton } from '@/ui/components/PixelButton'

export function MarketPanel() {
  const stocks = useGameStore((s) => s.state.market.stocks)
  const history = useGameStore((s) => s.state.market.history)
  const holdings = useGameStore((s) => s.state.portfolio.holdings)
  const cash = useGameStore((s) => s.state.player.cash)
  const load = useGameStore((s) => s.load)
  const pushLevelUps = useUiStore((s) => s.pushLevelUps)

  const [selected, setSelected] = useState<string>(() => stocks[0]?.id ?? '')
  const [qty, setQty] = useState('10')
  const [error, setError] = useState<string | null>(null)

  const active = stocks.find((s) => s.id === selected) ?? stocks[0]
  const heldQty = holdings.find((h) => h.stockId === active?.id)?.quantity ?? 0
  const shares = Math.floor(Number(qty))
  const orderValue = active && shares > 0 ? active.price * shares : 0

  const pick = (id: string) => {
    setSelected(id)
    setError(null)
  }

  const trade = (side: 'buy' | 'sell') => {
    if (!active) return
    const result = applyTrade(useGameStore.getState().state, {
      stockId: active.id,
      side,
      quantity: shares,
    })
    if (result.ok) {
      const quested = checkQuests(result.state)
      load(quested.state)
      pushLevelUps([...result.levelUps, ...quested.levelUps])
      setError(null)
    } else {
      setError(result.reason)
    }
  }

  return (
    <div>
      {active && (
        <div className="border-b-2 border-line">
          <PriceChart
            name={active.name}
            ticker={active.ticker}
            points={history[active.id] ?? []}
            previousClose={active.previousClose}
          />
          <div className="flex flex-wrap items-center gap-2 px-3 pb-2">
            <label className="font-display text-[9px] text-muted uppercase">Qty</label>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-20 border-2 border-line bg-night px-2 py-1 font-num text-sm text-ink focus:border-marigold focus:outline-none"
            />
            <PixelButton tone="good" onClick={() => trade('buy')}>
              Buy{orderValue > 0 ? ` ${rupees(orderValue, { short: true })}` : ''}
            </PixelButton>
            <PixelButton tone="bad" onClick={() => trade('sell')} disabled={heldQty === 0}>
              Sell
            </PixelButton>
            <span className="ml-auto font-num text-[11px] text-muted">
              hold {heldQty} · cash {rupees(cash, { short: true })}
            </span>
          </div>
          {error && <p className="px-3 pb-2 text-xs text-coral">{error}</p>}
        </div>
      )}

      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-panel">
          <tr className="border-b-2 border-line font-display text-[9px] text-muted uppercase">
            <th className="px-3 py-2 text-left">Company</th>
            <th className="px-3 py-2 text-left">Sector</th>
            <th className="px-3 py-2 text-right">Price</th>
            <th className="px-3 py-2 text-right">Day</th>
            <th className="px-3 py-2 text-right">P/E</th>
            <th className="px-3 py-2 text-right">D/E</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((s) => {
            const change = ((s.price - s.previousClose) / s.previousClose) * 100
            const isSel = active?.id === s.id
            return (
              <tr
                key={s.id}
                onClick={() => pick(s.id)}
                className={`cursor-pointer border-b border-line/50 ${
                  isSel ? 'bg-panel-2' : 'hover:bg-panel-2'
                }`}
              >
                <td className="px-3 py-2">
                  <span className="font-num text-[11px] text-muted">{s.ticker}</span>{' '}
                  <span className={isSel ? 'text-marigold' : 'text-ink'}>{s.name}</span>
                </td>
                <td className="px-3 py-2 text-muted capitalize">{s.sector}</td>
                <td className="px-3 py-2 text-right font-num">{rupees(s.price)}</td>
                <td className={`px-3 py-2 text-right font-num ${change >= 0 ? 'text-jade' : 'text-coral'}`}>
                  {signed(change)}
                </td>
                <td className="px-3 py-2 text-right font-num text-muted">
                  {s.fundamentals.peRatio ? s.fundamentals.peRatio.toFixed(1) : '—'}
                </td>
                <td className="px-3 py-2 text-right font-num text-muted">
                  {s.fundamentals.debtToEquity.toFixed(1)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
