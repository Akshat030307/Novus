import { Panel } from '@/ui/components/Panel'
import { useGameStore } from '@/state/store'

/**
 * Placeholder until step 5. Once Phaser owns the city, this reads the real
 * tile map and the real player position instead of these fixed dots.
 */
const PLACES = [
  { id: 'bank', label: 'Bank', x: 22, y: 30 },
  { id: 'exchange', label: 'Exchange', x: 62, y: 22 },
  { id: 'fintech', label: 'FinTech', x: 74, y: 62 },
  { id: 'academy', label: 'Academy', x: 34, y: 70 },
  { id: 'apartment', label: 'Home', x: 50, y: 46 },
]

export function MiniMap() {
  const pos = useGameStore((s) => s.state.player.position)

  return (
    <Panel title="Novus">
      <div className="relative m-3 aspect-square border-2 border-line bg-night">
        {PLACES.map((p) => (
          <div
            key={p.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <div className="mx-auto size-2 bg-line" />
            <div className="mt-1 font-display text-[8px] text-muted uppercase">{p.label}</div>
          </div>
        ))}
        <div
          className="absolute size-2 -translate-x-1/2 -translate-y-1/2 bg-marigold"
          style={{ left: `${pos.x * 2}%`, top: `${pos.y * 2}%` }}
          title="You"
        />
      </div>
    </Panel>
  )
}
