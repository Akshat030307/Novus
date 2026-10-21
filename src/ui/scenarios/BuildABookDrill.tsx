import { useMemo, useState } from 'react'
import { STOCKS } from '@/data/stocks'
import { rupees } from '@/lib/format'
import { AllocationBar, type Slice } from '@/ui/components/AllocationBar'
import { logAttempt } from '@/state/attempts'
import { encodeSpec, plainSpec, type ScenarioSpec } from '@/sim/aim'
import { PixelButton } from '@/ui/components/PixelButton'

const START_CASH = 5_00_000_00
const LOT = 50_000_00 // ₹50,000 a click
const SLICE_CLS = ['bg-marigold', 'bg-amethyst', 'bg-coral', 'bg-marigold/50', 'bg-amethyst/50', 'bg-coral/50', 'bg-ink/40']

/**
 * An allocation exercise. Prices are a frozen snapshot — shape, not timing.
 *
 * Set strict by a teacher (issue B11), the cap on a single name drops from
 * 40% to 30% and a fifth holding is asked for. The exercise is the same; what
 * counts as spread is tighter.
 */
export function BuildABookDrill({ spec = plainSpec('build-a-book') }: { spec?: ScenarioSpec }) {
  const names = spec.hard ? 5 : 4
  const cap = spec.hard ? 0.3 : 0.4
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
  const pass = held.length >= names && topShare <= cap && bookValue > 0

  // two things are being asked for — enough names, and none of them dominating
  // — so the attempt is scored out of two rather than as a bare pass/fail
  const score = () => {
    setScored(true)
    logAttempt({
      kind: 'drill',
      refId: encodeSpec(spec),
      score: (held.length >= names ? 1 : 0) + (topShare <= cap ? 1 : 0),
      outOf: 2,
      passed: pass,
      detail: { holdings: held.length, biggestSharePct: Math.round(topShare * 100) },
    })
  }

  const buy = (id: string, price: number) => {
    if (cash < price) return
    const step = Math.max(1, Math.floor(LOT / price))
    setQty((q) => ({ ...q, [id]: (q[id] ?? 0) + step }))
  }
  const sell = (id: string) => setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] ?? 0) - 1) }))

  return (
    <div className="space-y-3">
      <div className="border-2 border-line bg-panel-3 p-3">
        <div className="mb-2 flex justify-between text-[12px] text-muted font-semibold uppercase tracking-wide">
          <span>Allocation</span>
          <span className="font-num">cash {rupees(cash, { short: true })}</span>
        </div>
        <AllocationBar slices={slices} />
      </div>

      <ul className="divide-y divide-line/50">
        {snapshot.map((s) => (
          <li key={s.id} className="flex items-center gap-2 py-1.5 text-[15px]">
            <span className="flex-1 text-ink">{s.name}</span>
            <span className="font-num text-[14px] text-muted">{rupees(s.price)}</span>
            <span className="w-10 text-right font-num text-[14px]">{qty[s.id] ?? 0}</span>
            <button
              onClick={() => sell(s.id)}
              className="border border-line px-1.5 font-num text-[14px] text-muted hover:text-ink"
            >
              −
            </button>
            <button
              onClick={() => buy(s.id, s.price)}
              disabled={cash < s.price}
              className="border border-line px-1.5 font-num text-[14px] text-jade hover:border-jade disabled:opacity-30"
            >
              +
            </button>
          </li>
        ))}
      </ul>

      {!scored ? (
        <PixelButton tone="primary" onClick={score} disabled={bookValue === 0}>
          Score the book
        </PixelButton>
      ) : (
        <div className={`border-l-2 pl-3 ${pass ? 'border-jade' : 'border-coral'}`}>
          <div className={`text-[13px] font-semibold uppercase tracking-wide ${pass ? 'text-jade' : 'text-coral'}`}>
            {pass ? 'Well spread' : 'Not there yet'}
          </div>
          <p className="mt-1 text-[14px] text-muted">
            {held.length} holding{held.length === 1 ? '' : 's'}, biggest is{' '}
            {Math.round(topShare * 100)}% of the book.{' '}
            {pass
              ? 'Four or more names, none dominating: one bad headline can’t take the whole book.'
              : 'Aim for four or more, with no single name over 40%.'}
          </p>
          <button
            onClick={() => setScored(false)}
            className="mt-1 text-[13px] text-amethyst underline hover:text-marigold"
          >
            Keep adjusting
          </button>
        </div>
      )}
    </div>
  )
}
