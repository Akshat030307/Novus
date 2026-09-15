import { useMemo, useState } from 'react'
import { useGameStore } from '@/state/store'
import { explainDay } from '@/sim/market'
import { signedRupees } from '@/lib/format'

/**
 * Issue B6. Today's price move, split into the three forces that caused it.
 *
 * The point is not the arithmetic — it is that on most days, for most stocks,
 * the noise term dwarfs both the drift and any sector shock. A player who
 * watches this a few times stops reading meaning into every wobble, which is
 * the single most useful habit this game can hand them.
 *
 * Nothing is stored: `explainDay` replays the day from the seed. If the replay
 * doesn't land on the live price it reports `exact: false` and this renders
 * nothing rather than showing a number it can't stand behind.
 */

/** source, not direction — jade and coral already mean up and down here */
const TERMS = [
  { key: 'drift', label: 'Drift', cls: 'bg-amethyst', text: 'text-amethyst',
    hint: 'the slow pull toward what the company is actually worth' },
  { key: 'noise', label: 'Noise', cls: 'bg-muted', text: 'text-muted',
    hint: 'random daily movement, signifying nothing' },
  { key: 'shock', label: 'News', cls: 'bg-marigold', text: 'text-marigold',
    hint: "the day's events, decaying over a few hours" },
] as const

const CELLS = 24

export function MoveBreakdown({ stockId }: { stockId: string }) {
  const market = useGameStore((s) => s.state.market)
  const seed = useGameStore((s) => s.state.seed)
  const day = useGameStore((s) => s.state.clock.day)
  const minute = useGameStore((s) => s.state.clock.minute)
  const phase = useGameStore((s) => s.state.clock.phase)
  const [open, setOpen] = useState(false)

  const attribution = useMemo(
    () => (open ? explainDay(market, seed, { day, minute, phase }, stockId) : null),
    [open, market, seed, day, minute, phase, stockId],
  )

  const move = attribution ? attribution.to - attribution.from : 0
  const weights = attribution
    ? TERMS.map((t) => Math.abs(attribution[t.key]))
    : []
  const weightTotal = weights.reduce((a, b) => a + b, 0)

  // hand out whole cells by share, largest remainder first, so the bar is full
  const cells = useMemo(() => {
    if (!weightTotal) return TERMS.map(() => 0)
    const exact = weights.map((w) => (w / weightTotal) * CELLS)
    const base = exact.map(Math.floor)
    let left = CELLS - base.reduce((a, b) => a + b, 0)
    const order = exact
      .map((e, i) => ({ i, frac: e - Math.floor(e) }))
      .sort((a, b) => b.frac - a.frac)
    for (const { i } of order) {
      if (left <= 0) break
      base[i] += 1
      left -= 1
    }
    return base
  }, [weights, weightTotal])

  return (
    <div className="border-t border-line/50 px-3 py-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 font-display text-[9px] text-muted uppercase transition-colors hover:text-marigold"
      >
        <span className="text-marigold">{open ? '▾' : '▸'}</span>
        Why did it move today?
      </button>

      {open && !attribution && (
        <p className="mt-2 text-xs text-muted">
          {minute < 555
            ? 'Nothing has traded yet — the market opens at 9:15.'
            : "Today can't be reconstructed from this save."}
        </p>
      )}

      {open && attribution && (
        <div className="mt-2 space-y-2">
          <div className="flex items-baseline justify-between font-num text-[11px]">
            <span className="text-ink">{signedRupees(move)} on the day</span>
            <span className="text-muted">over {attribution.minutes} min</span>
          </div>

          <div className="flex gap-px" aria-hidden>
            {TERMS.map((t, i) =>
              Array.from({ length: cells[i] }, (_, c) => (
                <span key={`${t.key}-${c}`} className={`h-2 flex-1 ${t.cls}`} />
              )),
            )}
          </div>

          <dl className="grid grid-cols-3 gap-2">
            {TERMS.map((t) => (
              <div key={t.key} title={t.hint}>
                <dt className={`font-display text-[9px] uppercase ${t.text}`}>{t.label}</dt>
                <dd className="font-num text-[11px] text-ink">
                  {signedRupees(attribution[t.key])}
                </dd>
              </div>
            ))}
          </dl>

          <p className="text-[10px] leading-relaxed text-muted">
            {Math.abs(attribution.noise) > Math.abs(attribution.drift) + Math.abs(attribution.shock)
              ? 'Most of today was noise — movement that means nothing and will not repeat.'
              : 'Today was driven by more than noise. That is the unusual case, not the normal one.'}
          </p>
        </div>
      )}
    </div>
  )
}
