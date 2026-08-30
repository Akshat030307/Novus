import { useEffect, type ReactNode } from 'react'
import type { BuildingId } from '@/sim/types'
import { useUiStore } from '@/state/store'
import { playSound } from '@/lib/sound'
import { PixelButton } from '@/ui/components/PixelButton'
import { MarketPanel } from '@/ui/panels/MarketPanel'
import { PortfolioPanel } from '@/ui/panels/PortfolioPanel'
import { CasePanel } from '@/ui/case/CasePanel'
import { SkillsPanel } from '@/ui/panels/SkillsPanel'

/**
 * What you see after walking through a door. The world sets `openBuilding`
 * through the bridge; this shows the matching panel. Bank and Exchange reuse
 * the real panels; the rest are honest placeholders until their step lands.
 */
const INSIDE: Record<BuildingId, { title: string; body: ReactNode }> = {
  bank: {
    title: 'Meridian Bank',
    body: <CasePanel />,
  },
  exchange: {
    title: 'Novus Exchange',
    body: (
      <div className="flex flex-col gap-4">
        <MarketPanel />
        <PortfolioPanel />
      </div>
    ),
  },
  fintech: {
    title: 'The FinTech Floor',
    body: <Note>The payments desk opens up later — nothing to do here yet.</Note>,
  },
  academy: {
    title: 'The Academy',
    body: <SkillsPanel />,
  },
  apartment: {
    title: 'Your Apartment',
    body: <Note>Sleeping here to end the day arrives with the clock (step 7).</Note>,
  },
}

export function BuildingOverlay() {
  const openBuilding = useUiStore((s) => s.openBuilding)
  const close = useUiStore((s) => s.setOpenBuilding)

  useEffect(() => {
    if (openBuilding) playSound('enterBuilding')
  }, [openBuilding])

  if (!openBuilding) return null

  const inside = INSIDE[openBuilding as BuildingId] ?? {
    title: openBuilding,
    body: <Note>Nothing here yet.</Note>,
  }

  return (
    <div className="anim-backdrop fixed inset-0 z-50 flex items-center justify-center bg-night/85 p-6">
      <div className="anim-pop flex max-h-[80vh] w-full max-w-2xl flex-col border-2 border-line bg-panel">
        <header className="flex shrink-0 items-center justify-between border-b-2 border-line px-5 py-3">
          <div>
            <h2 className="font-display text-sm text-ink">{inside.title}</h2>
            <p className="font-display text-[9px] text-muted uppercase">You stepped inside</p>
          </div>
          <PixelButton onClick={() => close(null)}>Leave</PixelButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{inside.body}</div>
      </div>
    </div>
  )
}

function Note({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-40 items-center justify-center p-6 text-center">
      <p className="max-w-sm text-sm text-muted">{children}</p>
    </div>
  )
}
