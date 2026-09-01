import { useGameStore } from '@/state/store'
import type { MistakeRecord } from '@/sim/types'

/**
 * Step C-e. The errors the game has logged at each day's close, newest first,
 * with a pattern line on top once one kind starts repeating.
 */
const KIND_LABEL: Record<MistakeRecord['kind'], string> = {
  unsound_call: 'Unsound call',
  concentration: 'Concentration',
  noise_trade: 'Churn',
}

const PATTERN: Record<MistakeRecord['kind'], string> = {
  unsound_call: "That's a habit forming. Slow the decide screen down — the figures are all there.",
  concentration: "Same shape each time: too much in one name. Watch the allocation bar before you buy.",
  noise_trade: "You're trading the noise. Most days, the right number of trades is zero.",
}

export function MistakesPanel() {
  const mistakes = useGameStore((s) => s.state.mistakes)

  if (mistakes.length === 0) {
    return (
      <p className="text-sm text-muted">
        Nothing logged yet. Slips get recorded here at each day's close, so you can see a pattern
        before it costs you.
      </p>
    )
  }

  const counts = mistakes.reduce<Record<string, number>>((acc, m) => {
    acc[m.kind] = (acc[m.kind] ?? 0) + 1
    return acc
  }, {})
  const repeated = (Object.keys(counts) as MistakeRecord['kind'][]).filter((k) => counts[k] >= 3)

  return (
    <div className="space-y-3">
      {repeated.map((k) => (
        <div key={k} className="border-l-2 border-coral bg-panel-3 py-2 pl-3 pr-2">
          <div className="font-display text-[9px] text-coral uppercase">
            {KIND_LABEL[k]} · {counts[k]}×
          </div>
          <p className="mt-0.5 text-xs text-ink">{PATTERN[k]}</p>
        </div>
      ))}

      <ul className="space-y-2">
        {[...mistakes].reverse().map((m) => (
          <li key={m.id} className="border-2 border-line/60 p-3">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="font-display text-[9px] text-muted uppercase">{KIND_LABEL[m.kind]}</span>
              <span className="font-num text-[10px] text-muted">Day {m.day}</span>
            </div>
            <p className="text-xs text-ink">{m.note}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
