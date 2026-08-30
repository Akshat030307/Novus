import type { PricePoint } from '@/sim/types'
import { rupees, signed } from '@/lib/format'

/**
 * One stock, its recent path from `market.history`. Plots only what the store
 * hands it — no money maths here.
 */
export function PriceChart({
  name,
  ticker,
  points,
  previousClose,
}: {
  name: string
  ticker: string
  points: PricePoint[]
  previousClose: number
}) {
  if (points.length < 2) {
    return (
      <div className="p-3 text-sm text-muted">
        No price history yet — prices start moving when the market opens at 9:15.
      </div>
    )
  }

  const prices = points.map((p) => p.price)
  const lo = Math.min(...prices, previousClose)
  const hi = Math.max(...prices, previousClose)
  const span = hi - lo || 1

  const W = 100
  const H = 32
  const x = (i: number) => (i / (points.length - 1)) * W
  const y = (price: number) => H - ((price - lo) / span) * H

  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(2)} ${y(p.price).toFixed(2)}`)
    .join(' ')

  const last = prices[prices.length - 1]
  const change = ((last - previousClose) / previousClose) * 100
  const up = last >= previousClose
  const stroke = up ? 'var(--color-jade)' : 'var(--color-coral)'
  const baseY = y(previousClose).toFixed(2)

  return (
    <div className="p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <div>
          <span className="font-num text-[11px] text-muted">{ticker}</span>{' '}
          <span className="text-sm text-ink">{name}</span>
        </div>
        <div className="text-right font-num">
          <span className="text-sm text-ink">{rupees(last)}</span>{' '}
          <span className={`text-xs ${up ? 'text-jade' : 'text-coral'}`}>{signed(change)}</span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-24 w-full border border-line bg-night"
        aria-hidden="true"
      >
        <line
          x1="0"
          x2={W}
          y1={baseY}
          y2={baseY}
          stroke="var(--color-line)"
          strokeWidth="1"
          strokeDasharray="2 3"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={line}
          fill="none"
          stroke={stroke}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="mt-1 flex justify-between font-num text-[10px] text-muted">
        <span>Low {rupees(lo)}</span>
        <span>Prev close {rupees(previousClose)}</span>
        <span>High {rupees(hi)}</span>
      </div>
    </div>
  )
}
