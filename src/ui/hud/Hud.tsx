import type { ReactNode } from 'react'
import { useGameStore, useUiStore } from '@/state/store'
import { rupees } from '@/lib/format'
import { StatBar } from '@/ui/components/StatBar'
import { DayArc } from '@/ui/components/DayArc'

/**
 * The top strip: who you are, the three gauges you spend the day moving, the
 * cash line, and the clock. Energy is new — "focus" that a rushed decision
 * burns and the Cafeteria restores. It reads a placeholder here; the field and
 * the drain/restore rules are a sim step (see docs/build-steps.md, step B).
 */
const ENERGY_MAX = 100

export function Hud() {
  const { player, clock } = useGameStore((s) => s.state)
  const setScreen = useUiStore((s) => s.setScreen)
  const setOverlay = useUiStore((s) => s.setOverlay)

  // TODO(step B follow-up): swap for player.energy once the field lands
  const energy = ENERGY_MAX

  return (
    <header className="flex shrink-0 items-center gap-4 border-b-2 border-line border-t-hi bg-panel-2 px-4 py-3">
      {/* who you are */}
      <div className="min-w-40">
        <button
          onClick={() => setScreen('home')}
          className="font-display text-sm text-ink hover:text-marigold"
          title="Back to the title screen"
        >
          {player.name}
        </button>
        <div className="font-display text-[9px] text-amethyst uppercase">
          Finance Intern · Level {player.level}
        </div>
      </div>

      {/* the three gauges */}
      <Gauge label="XP" note={`${player.xp}/${player.xpToNext}`}>
        <StatBar value={player.xp} max={player.xpToNext} colorClass="bg-marigold" />
      </Gauge>
      <Gauge label="Energy" note={`${energy}/${ENERGY_MAX}`}>
        <StatBar value={energy} max={ENERGY_MAX} colorClass="bg-jade" />
      </Gauge>
      <Gauge label="Reputation" note={String(player.reputation)}>
        <StatBar value={player.reputation} max={100} colorClass="bg-amethyst" />
      </Gauge>

      {/* money */}
      <div className="ml-auto text-right">
        <div className="font-display text-[9px] text-muted uppercase">Cash</div>
        <div className="font-num text-lg text-jade">{rupees(player.cash)}</div>
      </div>

      <DayArc minute={clock.minute} day={clock.day} />

      <button
        onClick={() => setOverlay('settings')}
        title="Settings"
        aria-label="Settings"
        className="font-display text-[9px] text-muted uppercase hover:text-marigold"
      >
        Settings
      </button>
    </header>
  )
}

function Gauge({ label, note, children }: { label: string; note: string; children: ReactNode }) {
  return (
    <div className="w-32">
      <div className="mb-1 flex justify-between font-display text-[9px] text-muted uppercase">
        <span>{label}</span>
        <span className="font-num">{note}</span>
      </div>
      {children}
    </div>
  )
}
