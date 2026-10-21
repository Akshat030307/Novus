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
      <p className="text-[14px] text-muted">
        Cards unlock as they come up in play: a case, a trade, a headline.{' '}
        <span className="font-num text-ink">
          {learned.length}/{CONCEPTS.length}
        </span>{' '}
        so far.
      </p>

      <ul className="grid gap-3 xl:grid-cols-2">
        {CONCEPTS.map((c) => {
          const unlocked = known.has(c.id)
          return (
            <li
              key={c.id}
              className={`rounded-lg border p-4 ${
                unlocked ? 'border-line bg-panel-3' : 'border-line/40 bg-panel-2/40'
              }`}
            >
              {unlocked ? (
                <>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <h3 className="text-[14px] text-marigold font-semibold uppercase tracking-wide">{c.label}</h3>
                    {c.formula && (
                      <span className="font-num text-[12px] text-muted">{c.formula}</span>
                    )}
                  </div>
                  <p className="text-[15px] text-ink">{c.short}</p>
                  <p className="mt-1 text-[14px] text-muted">{c.goodBad}</p>
                  {c.furtherReading && (
                    <a
                      href={c.furtherReading.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-[13px] text-amethyst underline hover:text-marigold"
                    >
                      {c.furtherReading.label} ↗
                    </a>
                  )}
                </>
              ) : (
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[15px] font-semibold text-muted/70">{c.label}</h3>
                  <span className="shrink-0 text-[13px] text-muted/60">
                    locked · comes up in play
                  </span>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
