import { useState, type ReactNode } from 'react'
import { useGameStore } from '@/state/store'
import { CASEBOOK, getCasebookEntry, type CasebookEntry } from '@/data/casebook'
import { getConcept } from '@/data/concepts'

/**
 * Step C-a2. Real, concluded events as study cards. Read-state is a `flags`
 * key per entry. The draft banner and the footer are not decoration — the
 * cards need a source check before this is shown to anyone outside dev.
 */
export function CasebookPanel() {
  const [openId, setOpenId] = useState<string | null>(null)
  const flags = useGameStore((s) => s.state.flags)
  const apply = useGameStore((s) => s.apply)

  const open = (id: string) => {
    setOpenId(id)
    if (!flags[`casebook:${id}`]) {
      apply((d) => {
        d.flags[`casebook:${id}`] = true
        return d
      })
    }
  }

  if (openId) {
    const entry = getCasebookEntry(openId)
    if (entry) return <Detail entry={entry} onBack={() => setOpenId(null)} />
  }

  return (
    <div className="space-y-3">
      <div className="border-l-2 border-coral bg-panel-3 py-2 pl-3 pr-2 text-xs text-muted">
        Draft. These are written from public accounts; figures and dates still need a check against
        the cited sources.
      </div>
      <p className="text-xs text-muted">
        Things that actually happened. Each one rhymes with a case you can work in the game.
      </p>
      <ul className="space-y-2">
        {CASEBOOK.map((e) => (
          <li key={e.id}>
            <button
              onClick={() => open(e.id)}
              className="w-full border-2 border-line bg-panel-3 p-3 text-left hover:border-marigold"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-[11px] text-ink">
                  {e.title} <span className="text-muted">· {e.year}</span>
                </h3>
                {flags[`casebook:${e.id}`] && (
                  <span className="font-display text-[9px] text-jade uppercase">Read</span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted">{e.oneLine}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Detail({ entry, onBack }: { entry: CasebookEntry; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="border border-line px-2 py-1 font-display text-[9px] text-muted uppercase hover:text-ink"
      >
        ← All cases
      </button>

      <div>
        <h3 className="font-display text-[11px] text-marigold uppercase">
          {entry.title} · {entry.year}
        </h3>
        <p className="mt-1 text-sm text-ink">{entry.oneLine}</p>
      </div>

      <Block title="What happened">
        <ul className="space-y-1 text-xs text-muted">
          {entry.timeline.map((t, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-marigold">▪</span>
              {t}
            </li>
          ))}
        </ul>
      </Block>

      <Block title="The numbers">
        <ul className="space-y-1 text-xs text-muted">
          {entry.numbers.map((n, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-muted">·</span>
              {n}
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Visible beforehand">
        <ul className="space-y-1 text-xs text-ink">
          {entry.redFlags.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-coral">▪</span>
              {r}
            </li>
          ))}
        </ul>
      </Block>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-display text-[9px] text-muted uppercase">Reinforces</span>
        {entry.teaches.map((c) => (
          <span key={c} className="border border-line px-1.5 py-0.5 text-[10px] text-muted">
            {getConcept(c)?.label ?? c}
          </span>
        ))}
      </div>

      <div className="border-l-2 border-amethyst pl-3">
        <div className="font-display text-[9px] text-amethyst uppercase">Rhymes with</div>
        <p className="text-xs text-muted">{entry.pairsWith}</p>
      </div>

      <Block title="Check yourself">
        {entry.questions.map((qa, i) => (
          <QA key={i} qa={qa} />
        ))}
      </Block>

      <div>
        <div className="mb-1 font-display text-[9px] text-muted uppercase">Sources</div>
        <ul className="flex flex-col gap-1">
          {entry.sources.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-amethyst underline hover:text-marigold"
              >
                {s.label} ↗
              </a>
            </li>
          ))}
        </ul>
      </div>

      <p className="border-t border-line pt-2 text-[10px] text-muted/70">
        Study material, not investment advice. The companies named are the historical record of
        concluded events.
      </p>
    </div>
  )
}

function QA({ qa }: { qa: { q: string; a: string } }) {
  const [show, setShow] = useState(false)
  return (
    <div className="mb-2">
      <button
        onClick={() => setShow((s) => !s)}
        className="text-left text-xs text-ink hover:text-marigold"
      >
        {qa.q}
      </button>
      {show && <p className="mt-1 border-l-2 border-line pl-2 text-xs text-muted">{qa.a}</p>}
    </div>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 font-display text-[9px] text-muted uppercase">{title}</div>
      {children}
    </div>
  )
}
