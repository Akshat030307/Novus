import { useGameStore, useUiStore } from '@/state/store'
import { rupees } from '@/lib/format'
import { StatBar } from '@/ui/components/StatBar'
import { DayArc } from '@/ui/components/DayArc'

export function Hud() {
  const { player, clock } = useGameStore((s) => s.state)
  const setScreen = useUiStore((s) => s.setScreen)
  const setOverlay = useUiStore((s) => s.setOverlay)

  return (
    <header className="flex shrink-0 items-center gap-6 border-b-2 border-line bg-panel px-4 py-3">
      {/* who you are */}
      <div className="min-w-44">
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

      {/* experience */}
      <div className="w-40">
        <div className="mb-1 flex justify-between font-display text-[9px] text-muted uppercase">
          <span>XP</span>
          <span className="font-num">{player.xp}/{player.xpToNext}</span>
        </div>
        <StatBar value={player.xp} max={player.xpToNext} colorClass="bg-marigold" />
      </div>

      {/* standing */}
      <div className="w-40">
        <div className="mb-1 flex justify-between font-display text-[9px] text-muted uppercase">
          <span>Reputation</span>
          <span className="font-num">{player.reputation}</span>
        </div>
        <StatBar value={player.reputation} max={100} colorClass="bg-amethyst" />
      </div>

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
