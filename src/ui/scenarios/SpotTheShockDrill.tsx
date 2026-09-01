import { useMemo, useState } from 'react'
import { STOCKS } from '@/data/stocks'
import { EVENTS } from '@/data/events'
import { signed } from '@/lib/format'
import { PixelButton } from '@/ui/components/PixelButton'

/** Read a headline, pick who it lifts. Scored against the event's sector map. */
export function SpotTheShockDrill() {
  const [seed, setSeed] = useState(0)
  const event = useMemo(() => EVENTS[seed % EVENTS.length], [seed])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [revealed, setRevealed] = useState(false)

  const shockFor = (sector: string) => event.sectorShocks[sector as keyof typeof event.sectorShocks] ?? 0

  const toggle = (id: string) => {
    if (revealed) return
    setPicked((p) => {
      const n = new Set(p)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const score = useMemo(() => {
    let s = 0
    for (const stock of STOCKS) {
      const shock = shockFor(stock.sector)
      const chose = picked.has(stock.id)
      if (chose && shock > 0.005) s += 1
      else if (chose && shock < -0.005) s -= 1
      else if (!chose && shock > 0.005) s -= 0.5 // missed a beneficiary
    }
    return s
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, event])

  const next = () => {
    setSeed((n) => n + 1)
    setPicked(new Set())
    setRevealed(false)
  }

  return (
    <div className="space-y-3">
      <div className="border-l-2 border-marigold pl-3">
        <div className="font-display text-[9px] text-marigold uppercase">Headline</div>
        <p className="text-sm text-ink">{event.headline}</p>
      </div>

      <ul className="divide-y divide-line/50">
        {STOCKS.map((s) => {
          const shock = shockFor(s.sector)
          const chose = picked.has(s.id)
          return (
            <li key={s.id} className="flex items-center gap-2 py-1.5 text-sm">
              <button
                onClick={() => toggle(s.id)}
                className={`grid size-3 shrink-0 place-items-center border ${
                  chose ? 'border-marigold bg-marigold/20 text-marigold' : 'border-line text-transparent'
                }`}
              >
                x
              </button>
              <span className="flex-1 text-ink">{s.name}</span>
              <span className="text-xs text-muted capitalize">{s.sector}</span>
              {revealed && (
                <span
                  className={`w-14 text-right font-num text-xs ${
                    shock > 0 ? 'text-jade' : shock < 0 ? 'text-coral' : 'text-muted'
                  }`}
                >
                  {shock === 0 ? '—' : signed(shock * 100)}
                </span>
              )}
            </li>
          )
        })}
      </ul>

      {!revealed ? (
        <PixelButton tone="primary" onClick={() => setRevealed(true)}>
          Reveal
        </PixelButton>
      ) : (
        <div className="space-y-2">
          <div className="border-l-2 border-jade pl-3">
            <div className="font-display text-[10px] uppercase text-ink">Score {score.toFixed(1)}</div>
            <p className="mt-1 text-xs text-muted">
              A right pick is +1, a wrong one −1, a missed beneficiary −0.5. The map decays over a
              few game hours — and the weak links move less than a day of noise.
            </p>
          </div>
          <PixelButton onClick={next}>Another headline</PixelButton>
        </div>
      )}
    </div>
  )
}
