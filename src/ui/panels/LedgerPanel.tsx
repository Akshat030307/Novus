import { useGameStore } from '@/state/store'
import { CONCEPTS } from '@/data/concepts'

/**
 * Step C-a. The Academy's reference shelf. Cards unlock as their concept
 * comes up in play (sim/concepts.ts) — nothing here decides that, it only
 * reads `learned` off the save.
 */
export function LedgerPanel() {
  const learned = useGameStore((s) => s.state.learned)
  const known = new Set(learned)

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Cards unlock as they come up in play — a case, a trade, a headline.{' '}
        <span className="font-num text-ink">
          {learned.length}/{CONCEPTS.length}
        </span>{' '}
        so far.
      </p>

      <ul className="space-y-2">
        {CONCEPTS.map((c) => {
          const unlocked = known.has(c.id)
          return (
            <li
              key={c.id}
              className={`border-2 p-3 ${unlocked ? 'border-line bg-panel-3' : 'border-line/40'}`}
            >
              {unlocked ? (
                <>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <h3 className="font-display text-[11px] text-marigold uppercase">{c.label}</h3>
                    {c.formula && (
                      <span className="font-num text-[9px] text-muted">{c.formula}</span>
                    )}
                  </div>
                  <p className="text-sm text-ink">{c.short}</p>
                  <p className="mt-1 text-xs text-muted">{c.goodBad}</p>
                  {c.furtherReading && (
                    <a
                      href={c.furtherReading.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-[10px] text-amethyst underline hover:text-marigold"
                    >
                      {c.furtherReading.label} ↗
                    </a>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span>▫</span> Locked — comes up in play.
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
