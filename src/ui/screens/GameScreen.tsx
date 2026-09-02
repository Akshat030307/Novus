import { useUiStore, useGameStore, type BottomTab } from '@/state/store'
import { useGameClock } from '@/state/useGameClock'
import { useSoundCues } from '@/ui/hooks/useSoundCues'
import { useGameKeys } from '@/ui/hooks/useGameKeys'
import { buildDayEndReport, startNextDay } from '@/sim/clock'
import { saveGame } from '@/state/save'
import { playSound } from '@/lib/sound'
import { MARKET_CLOSE } from '@/lib/format'
import { Hud } from '@/ui/hud/Hud'
import { Panel } from '@/ui/components/Panel'
import { PixelButton } from '@/ui/components/PixelButton'
import { QuestPanel } from '@/ui/panels/QuestPanel'
import { MiniMap } from '@/ui/panels/MiniMap'
import { MarketPanel } from '@/ui/panels/MarketPanel'
import { PortfolioPanel } from '@/ui/panels/PortfolioPanel'
import { NotificationsPanel } from '@/ui/panels/NotificationsPanel'
import { CasePanel } from '@/ui/case/CasePanel'
import { DialogueBox } from '@/ui/dialogue/DialogueBox'
import { WorldCanvas } from '@/world/WorldCanvas'
import { DayEndScreen } from '@/ui/screens/DayEndScreen'
import { LevelUpPopup } from '@/ui/overlays/LevelUpPopup'
import { SettingsPanel } from '@/ui/overlays/SettingsPanel'
import { BuildingOverlay } from '@/ui/overlays/BuildingOverlay'

const TABS: { id: BottomTab; label: string; icon: string; accent: 'marigold' | 'amethyst' | 'jade' | 'muted' }[] = [
  { id: 'case', label: 'Case', icon: '⚖', accent: 'amethyst' },
  { id: 'market', label: 'Market', icon: '↕', accent: 'marigold' },
  { id: 'portfolio', label: 'Portfolio', icon: '◐', accent: 'jade' },
  { id: 'notifications', label: 'Feed', icon: '✦', accent: 'muted' },
]

export default function GameScreen() {
  const tab = useUiStore((s) => s.bottomTab)
  const setTab = useUiStore((s) => s.setBottomTab)
  const overlay = useUiStore((s) => s.overlay)
  const setOverlay = useUiStore((s) => s.setOverlay)
  const levelUp = useUiStore((s) => s.levelUpQueue[0])
  const dismissLevelUp = useUiStore((s) => s.dismissLevelUp)
  const state = useGameStore((s) => s.state)
  const apply = useGameStore((s) => s.apply)

  useGameClock()
  useSoundCues()

  const active = TABS.find((t) => t.id === tab)

  const endDayNow = () => {
    apply((s) => ({ ...s, clock: { ...s.clock, minute: MARKET_CLOSE, phase: 'closed' } }))
    setOverlay('day-end')
    void saveGame(useGameStore.getState().state)
  }

  const startTomorrow = () => {
    apply(startNextDay)
    void saveGame(useGameStore.getState().state)
    setOverlay(null)
  }

  useGameKeys({ onAdvanceDay: startTomorrow })

  return (
    <div className="flex h-full flex-col">
      <Hud />

      <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr_240px] gap-2 p-2">
        {/* left: what you owe people */}
        <div className="flex min-h-0 flex-col gap-2">
          <QuestPanel />
        </div>

        {/* centre: the city, and the panels that hang off it */}
        <div className="grid min-h-0 grid-rows-[1fr_300px] gap-2">
          <div className="relative min-h-0 border-2 border-line bg-night">
            <WorldCanvas />
            <DialogueBox />
          </div>

          <Panel
            title={active?.label}
            icon={active?.icon}
            accent={active?.accent}
            right={
              <div className="flex gap-1">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTab(t.id)
                      playSound('tab')
                    }}
                    className={`border px-2 py-1 font-display text-[9px] uppercase transition-colors ${
                      tab === t.id
                        ? 'border-marigold text-marigold'
                        : 'border-line text-muted hover:text-ink'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            }
          >
            <div key={tab} className="anim-rise">
              {tab === 'case' && <CasePanel />}
              {tab === 'market' && <MarketPanel />}
              {tab === 'portfolio' && <PortfolioPanel />}
              {tab === 'notifications' && <NotificationsPanel />}
            </div>
          </Panel>
        </div>

        {/* right: where you are, what you can do from here */}
        <div className="flex min-h-0 flex-col gap-2">
          <MiniMap />
          <Panel title="Actions" icon="◆" accent="coral" bodyClassName="p-2">
            <PixelButton
              tone="bad"
              className="w-full"
              onClick={endDayNow}
              title="Skip ahead to the market close"
            >
              End day
            </PixelButton>
            <p className="mt-2 px-1 text-[10px] text-muted">
              The day also ends on its own when the market closes at 3:30.
            </p>
          </Panel>
        </div>
      </div>

      {overlay === 'day-end' && (
        <DayEndScreen report={buildDayEndReport(state)} onClose={startTomorrow} />
      )}
      {overlay === 'settings' && <SettingsPanel onClose={() => setOverlay(null)} />}
      <BuildingOverlay />
      {levelUp && <LevelUpPopup report={levelUp} onClose={dismissLevelUp} />}
    </div>
  )
}
