import { useState } from 'react'
import { SCENARIOS, type Scenario } from '@/data/scenarios'
import { CreditDeskDrill } from '@/ui/scenarios/CreditDeskDrill'
import { BuildABookDrill } from '@/ui/scenarios/BuildABookDrill'
import { SpotTheShockDrill } from '@/ui/scenarios/SpotTheShockDrill'

/**
 * Step C-h. Set-piece drills, off to one side of the career game. No save —
 * repeat them as often as you like. Each `kind` picks its runner.
 */
export function ScenariosPanel() {
  const [open, setOpen] = useState<Scenario | null>(null)

  if (open) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setOpen(null)}
          className="border border-line px-2 py-1 font-display text-[9px] text-muted uppercase hover:text-ink"
        >
          ← All drills
        </button>
        <div>
          <h3 className="font-display text-[11px] text-marigold uppercase">{open.title}</h3>
          <p className="mt-1 text-xs text-muted">{open.brief}</p>
          <p className="mt-1 text-xs text-amethyst">Goal: {open.goal}</p>
        </div>
        {open.kind === 'credit-desk' && <CreditDeskDrill />}
        {open.kind === 'build-a-book' && <BuildABookDrill />}
        {open.kind === 'spot-the-shock' && <SpotTheShockDrill />}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Practice runs, separate from your career. Nothing here is saved.
      </p>
      <ul className="space-y-2">
        {SCENARIOS.map((s) => (
          <li key={s.id}>
            <button
              onClick={() => setOpen(s)}
              className="w-full border-2 border-line bg-panel-3 p-3 text-left hover:border-marigold"
            >
              <h3 className="font-display text-[11px] text-ink">{s.title}</h3>
              <p className="mt-1 text-xs text-muted">{s.brief}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
