import { useEffect, type ReactNode } from 'react'
import { useUiStore, useGameStore } from '@/state/store'
import {
  ENERGY_MAX,
  ENERGY_TIRED,
  RESTORE_CAFETERIA,
  isTired,
  restoreEnergy,
} from '@/sim/energy'
import { playSound } from '@/lib/sound'
import { PixelButton } from '@/ui/components/PixelButton'
import { MarketPanel } from '@/ui/panels/MarketPanel'
import { PortfolioPanel } from '@/ui/panels/PortfolioPanel'
import { CasePanel } from '@/ui/case/CasePanel'
import { AcademyPanel } from '@/ui/panels/AcademyPanel'

/**
 * What you see after walking through a door. The world sets `openBuilding`
 * through the bridge; this shows the matching panel. Bank and Exchange reuse
 * the real panels; the rest are honest placeholders until their step lands.
 * Keyed by string — the world layer owns building ids, and the three venues
 * added in step A (risk, payments, cafeteria) have no interior yet.
 */
const INSIDE: Record<string, { title: string; body: ReactNode }> = {
  bank: {
    title: 'Meridian Bank',
    body: <CasePanel building="bank" />,
  },
  exchange: {
    title: 'Novus Exchange',
    body: (
      <div className="flex flex-col gap-4">
        <MarketPanel />
        <PortfolioPanel />
        {/* issue B4: books come in for review here, not at the Bank */}
        <CasePanel building="exchange" />
      </div>
    ),
  },
  fintech: {
    title: 'The FinTech Floor',
    body: <Note>The payments desk opens up later — nothing to do here yet.</Note>,
  },
  academy: {
    title: 'The Academy',
    body: <AcademyPanel />,
  },
  apartment: {
    title: 'Your Apartment',
    body: <Note>Sleeping here to end the day arrives with the clock (step 7).</Note>,
  },
  risk: {
    title: 'Risk & Compliance',
    // issue B4 turned this from a nameplate into a desk — see C6
    body: <CasePanel building="risk" />,
  },
  payments: {
    title: 'Payment Centre',
    body: <Note>UPI rails and settlement come later — nothing to do here yet.</Note>,
  },
  cafeteria: {
    title: 'The Cafeteria',
    body: <Cafeteria />,
  },
}

/** Issue A2: the one place that buys focus back, once a day. */
function Cafeteria() {
  const player = useGameStore((s) => s.state.player)
  const day = useGameStore((s) => s.state.clock.day)
  const usedToday = useGameStore((s) => Boolean(s.state.flags[`cafeteria:${day}`]))
  const apply = useGameStore((s) => s.apply)

  const rested = player.energy >= ENERGY_MAX
  const takeBreak = () => {
    apply((d) => {
      d.player = restoreEnergy(d.player, RESTORE_CAFETERIA)
      d.flags[`cafeteria:${day}`] = true
      return d
    })
    playSound('dialogue')
  }

  return (
    <div className="space-y-4 p-6">
      <p className="text-[15px] text-muted">
        Filter coffee, a plate of something, and fifteen minutes where nobody asks you for a number.
      </p>

      <div className="border-2 border-line bg-panel-3 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] text-muted font-semibold uppercase tracking-wide">Focus</span>
          <span className={`font-num text-[15px] ${isTired(player) ? 'text-coral' : 'text-jade'}`}>
            {player.energy}/{ENERGY_MAX}
          </span>
        </div>
        <p className="mt-2 text-[14px] text-muted">
          {rested
            ? "You're sharp already. Save the break for when you need it."
            : usedToday
              ? "You've already taken your break today. The rest comes overnight."
              : `A break puts ${RESTORE_CAFETERIA} back. Below ${ENERGY_TIRED}, the shortcuts stop coming to you on a credit file.`}
        </p>
        <PixelButton
          tone="good"
          className="mt-3 w-full"
          disabled={usedToday || rested}
          onClick={takeBreak}
        >
          {usedToday ? 'Already taken today' : 'Take a break'}
        </PixelButton>
      </div>
    </div>
  )
}

export function BuildingOverlay() {
  const openBuilding = useUiStore((s) => s.openBuilding)
  const close = useUiStore((s) => s.setOpenBuilding)

  useEffect(() => {
    if (openBuilding) playSound('enterBuilding')
  }, [openBuilding])

  if (!openBuilding) return null

  const inside = INSIDE[openBuilding] ?? {
    title: openBuilding,
    body: <Note>Nothing here yet.</Note>,
  }

  return (
    <div className="anim-backdrop fixed inset-0 z-50 flex items-center justify-center bg-night/80 p-6 backdrop-blur-sm">
      <div className="anim-pop flex max-h-[90vh] w-full max-w-[1280px] flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl shadow-black/60">
        <header className="flex shrink-0 items-center justify-between border-b border-line bg-panel-2 px-6 py-4">
          <div>
            <h2 className="font-display text-[18px] text-ink">{inside.title}</h2>
            <p className="mt-0.5 text-[13px] text-muted">You stepped inside</p>
          </div>
          <PixelButton onClick={() => close(null)}>Leave</PixelButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">{inside.body}</div>
      </div>
    </div>
  )
}

function Note({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-40 items-center justify-center p-6 text-center">
      <p className="max-w-sm text-[15px] text-muted">{children}</p>
    </div>
  )
}
