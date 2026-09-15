import { useMemo, useState } from 'react'
import { STOCKS } from '@/data/stocks'
import { EVENTS } from '@/data/events'
import { signed } from '@/lib/format'
import { logAttempt } from '@/state/attempts'
import { PixelButton } from '@/ui/components/PixelButton'

/** below this the shock is lost inside a normal day of noise, so it isn't marked */
const MOVED = 0.005

/**
 * Read a headline, pick who it lifts. Scored against the event's sector map.
 *
 * Marked out of the stocks the headline actually moves: picking one it lifts
 * and leaving one it hurts both count. Picks on stocks the headline doesn't
 * touch are counted separately as stray picks rather than folded into the
 * score — reading a headline too widely is a different error from reading it
 * backwards, and a single number would hide which one you made.
 */
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

  const marks = useMemo(() => {
    const movers = STOCKS.filter((s) => Math.abs(shockFor(s.sector)) > MOVED)
    const right = movers.filter((s) => (shockFor(s.sector) > 0) === picked.has(s.id)).length
    const stray = STOCKS.filter(
      (s) => picked.has(s.id) && Math.abs(shockFor(s.sector)) <= MOVED,
    ).length
    return { right, of: movers.length, stray }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, event])

  const reveal = () => {
    setRevealed(true)
    if (marks.of === 0) return // nothing to mark — don't log an empty attempt
    logAttempt({
      kind: 'drill',
      refId: 'spot-the-shock',
      score: marks.right,
      outOf: marks.of,
      passed: marks.right === marks.of && marks.stray === 0,
      detail: { strayPicks: marks.stray, headline: (seed % EVENTS.length) + 1 },
    })
  }

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
        <PixelButton tone="primary" onClick={reveal}>
          Reveal
        </PixelButton>
      ) : (
        <div className="space-y-2">
          <div
            className={`border-l-2 pl-3 ${
              marks.right === marks.of && marks.stray === 0 ? 'border-jade' : 'border-marigold'
            }`}
          >
            <div className="font-display text-[10px] uppercase text-ink">
              {marks.right}/{marks.of} read right
              {marks.stray > 0 && ` · ${marks.stray} stray pick${marks.stray === 1 ? '' : 's'}`}
            </div>
            <p className="mt-1 text-xs text-muted">
              Marked on the stocks this headline actually moves — picking the ones it lifts and
              leaving the ones it hurts. A stray pick is a stock the headline doesn't touch at all.
              The map decays over a few game hours, and the weak links move less than a day of
              noise.
            </p>
          </div>
          <PixelButton onClick={next}>Another headline</PixelButton>
        </div>
      )}
    </div>
  )
}
