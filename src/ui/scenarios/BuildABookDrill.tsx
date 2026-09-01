import { useMemo, useState } from 'react'
import { STOCKS } from '@/data/stocks'
import { rupees } from '@/lib/format'
import { AllocationBar, type Slice } from '@/ui/components/AllocationBar'
import { PixelButton } from '@/ui/components/PixelButton'

const START_CASH = 5_00_000_00
const LOT = 50_000_00 // ₹50,000 a click
const SLICE_CLS = ['bg-marigold', 'bg-amethyst', 'bg-coral', 'bg-marigold/50', 'bg-amethyst/50', 'bg-coral/50', 'bg-ink/40']

/** An allocation exercise. Prices are a frozen snapshot — shape, not timing. */
export function BuildABookDrill() {
  const snapshot = useMemo(() => STOCKS.map((s) => ({ id: s.id, name: s.name, price: s.price })), [])
  const [qty, setQty] = useState<Record<string, number>>({})
  const [scored, setScored] = useState(false)

  const held = snapshot.filter((s) => (qty[s.id] ?? 0) > 0)
  const invested = held.reduce((t, s) => t + s.price * (qty[s.id] ?? 0), 0)
  const cash = START_CASH - invested

  const slices: Slice[] = [
    { label: 'Cash', value: cash, cls: 'bg-jade' },
    ...held.map((s, i) => ({
      label: s.name,
      value: s.price * (qty[s.id] ?? 0),
      cls: SLICE_CLS[i % SLICE_CLS.length],
    })),
  ]

  const bookValue = invested
  const topShare = bookValue > 0 ? Math.max(...held.map((s) => (s.price * (qty[s.id] ?? 0)) / bookValue)) : 0
  const pass = held.length >= 4 && topShare <= 0.4 && bookValue > 0

  const buy = (id: string, price: number) => {
    if (cash < price) return
    const step = Math.max(1, Math.floor(LOT / price))
    setQty((q) => ({ ...q, [id]: (q[id] ?? 0) + step }))
  }
  const sell = (id: string) => setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] ?? 0) - 1) }))

  return (
    <div className="space-y-3">
      <div className="border-2 border-line bg-panel-3 p-3">
        <div className="mb-2 flex justify-between font-display text-[9px] text-muted uppercase">
          <span>Allocation</span>
          <span className="font-num">cash {rupees(cash, { short: true })}</span>
        </div>
        <AllocationBar slices={slices} />
      </div>

      <ul className="divide-y divide-line/50">
        {snapshot.map((s) => (
          <li key={s.id} className="flex items-center gap-2 py-1.5 text-sm">
            <span className="flex-1 text-ink">{s.name}</span>
            <span className="font-num text-xs text-muted">{rupees(s.price)}</span>
            <span className="w-10 text-right font-num text-xs">{qty[s.id] ?? 0}</span>
            <button
              onClick={() => sell(s.id)}
              className="border border-line px-1.5 font-num text-xs text-muted hover:text-ink"
            >
              −
            </button>
            <button
              onClick={() => buy(s.id, s.price)}
              disabled={cash < s.price}
              className="border border-line px-1.5 font-num text-xs text-jade hover:border-jade disabled:opacity-30"
            >
              +
            </button>
          </li>
        ))}
      </ul>

      {!scored ? (
        <PixelButton tone="primary" onClick={() => setScored(true)} disabled={bookValue === 0}>
          Score the book
        </PixelButton>
      ) : (
        <div className={`border-l-2 pl-3 ${pass ? 'border-jade' : 'border-coral'}`}>
          <div className={`font-display text-[10px] uppercase ${pass ? 'text-jade' : 'text-coral'}`}>
            {pass ? 'Well spread' : 'Not there yet'}
          </div>
          <p className="mt-1 text-xs text-muted">
            {held.length} holding{held.length === 1 ? '' : 's'}, biggest is{' '}
            {Math.round(topShare * 100)}% of the book.{' '}
            {pass
              ? 'Four or more names, none dominating — one bad headline can’t take the whole book.'
              : 'Aim for four or more, with no single name over 40%.'}
          </p>
          <button
            onClick={() => setScored(false)}
            className="mt-1 text-[10px] text-amethyst underline hover:text-marigold"
          >
            Keep adjusting
          </button>
        </div>
      )}
    </div>
  )
}
