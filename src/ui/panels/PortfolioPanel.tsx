import { useGameStore } from '@/state/store'
import { rupees, signed } from '@/lib/format'
import { AllocationBar, type Slice } from '@/ui/components/AllocationBar'

/** colours for the holding slices, after cash takes jade */
const SLICE_CLS = [
  'bg-marigold',
  'bg-amethyst',
  'bg-coral',
  'bg-marigold/50',
  'bg-amethyst/50',
  'bg-coral/50',
]

export function PortfolioPanel() {
  const { portfolio, market, player } = useGameStore((s) => s.state)
  const priceOf = (id: string) => market.stocks.find((s) => s.id === id)?.price ?? 0
  const nameOf = (id: string) => market.stocks.find((s) => s.id === id)?.name ?? id

  const invested = portfolio.holdings.reduce((t, h) => t + h.averageCost * h.quantity, 0)
  const value = portfolio.holdings.reduce((t, h) => t + priceOf(h.stockId) * h.quantity, 0)
  const unrealised = value - invested

  const allocation: Slice[] = [
    { label: 'Cash', value: player.cash, cls: 'bg-jade' },
    ...portfolio.holdings.map((h, i) => ({
      label: nameOf(h.stockId),
      value: priceOf(h.stockId) * h.quantity,
      cls: SLICE_CLS[i % SLICE_CLS.length],
    })),
  ]

  return (
    <div className="space-y-4 p-3">
      <div className="grid grid-cols-4 gap-3">
        <Stat label="Cash" value={rupees(player.cash, { short: true })} />
        <Stat label="Holdings" value={rupees(value, { short: true })} />
        <Stat
          label="Open profit"
          value={rupees(unrealised, { short: true })}
          tone={unrealised >= 0 ? 'text-jade' : 'text-coral'}
        />
        <Stat label="Booked" value={rupees(portfolio.realisedPnL, { short: true })} tone="text-muted" />
      </div>

      <div className="border-2 border-line bg-panel-3 p-3">
        <div className="mb-2 font-display text-[9px] text-muted uppercase">Where the money is</div>
        <AllocationBar slices={allocation} />
      </div>

      {portfolio.holdings.length === 0 ? (
        <p className="text-sm text-muted">
          Nothing held yet. Walk to the Exchange and buy something.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-line font-display text-[9px] text-muted uppercase">
              <th className="py-2 text-left">Holding</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Avg cost</th>
              <th className="py-2 text-right">Now</th>
              <th className="py-2 text-right">Return</th>
            </tr>
          </thead>
          <tbody>
            {portfolio.holdings.map((h) => {
              const now = priceOf(h.stockId)
              const ret = ((now - h.averageCost) / h.averageCost) * 100
              return (
                <tr key={h.stockId} className="border-b border-line/50">
                  <td className="py-2 text-ink">{nameOf(h.stockId)}</td>
                  <td className="py-2 text-right font-num">{h.quantity}</td>
                  <td className="py-2 text-right font-num text-muted">{rupees(h.averageCost)}</td>
                  <td className="py-2 text-right font-num">{rupees(now)}</td>
                  <td className={`py-2 text-right font-num ${ret >= 0 ? 'text-jade' : 'text-coral'}`}>
                    {signed(ret)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

function Stat({ label, value, tone = 'text-ink' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="border-2 border-line bg-panel-3 px-3 py-2">
      <div className="font-display text-[9px] text-muted uppercase">{label}</div>
      <div className={`font-num text-base ${tone}`}>{value}</div>
    </div>
  )
}
