import type { ReactNode } from 'react'
import { useGameStore, useUiStore } from '@/state/store'
import { useCloudStore } from '@/state/cloud'
import { ENERGY_MAX, isTired } from '@/sim/energy'
import { rupees } from '@/lib/format'
import { StatBar } from '@/ui/components/StatBar'
import { DayArc } from '@/ui/components/DayArc'

/**
 * The top strip: who you are, the three gauges you spend the day moving, the
 * cash line, and the clock. Energy is focus — a rushed decision or a churned
 * hour burns it, the Cafeteria and a night's sleep buy it back. The rules live
 * in sim/energy.ts (issue A2).
 */

export function Hud() {
  const { player, clock } = useGameStore((s) => s.state)
  const setScreen = useUiStore((s) => s.setScreen)
  const setOverlay = useUiStore((s) => s.setOverlay)

  const tired = isTired(player)

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
      <Gauge label="Energy" note={tired ? `${player.energy} · tired` : `${player.energy}/${ENERGY_MAX}`}>
        <StatBar
          value={player.energy}
          max={ENERGY_MAX}
          colorClass={tired ? 'bg-coral' : 'bg-jade'}
        />
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

      <CloudChip />

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

/**
 * Whether the cloud copy is keeping up. Hidden entirely when Supabase isn't
 * configured. Hover for the reason — a failed sync used to be invisible.
 */
function CloudChip() {
  const status = useCloudStore((s) => s.status)
  const error = useCloudStore((s) => s.error)
  const savedAt = useCloudStore((s) => s.savedAt)
  if (status === 'off') return null

  const chip = {
    idle: { text: 'Local only', cls: 'text-muted', title: 'Not signed in — this save stays in the browser.' },
    syncing: { text: 'Syncing…', cls: 'text-muted', title: 'Writing to the cloud.' },
    saved: {
      text: 'Cloud ✓',
      cls: 'text-jade',
      title: savedAt ? `Last synced ${new Date(savedAt).toLocaleTimeString()}` : 'Synced.',
    },
    error: { text: 'Cloud ✕', cls: 'text-coral', title: error ?? 'Cloud save failed.' },
  }[status]

  return (
    <span className={`font-display text-[9px] uppercase ${chip.cls}`} title={chip.title}>
      {chip.text}
    </span>
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
