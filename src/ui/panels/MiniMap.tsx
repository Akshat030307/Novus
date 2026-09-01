import { Panel } from '@/ui/components/Panel'

/**
 * A sketch of the city — the eight doors you can walk into, laid out to match
 * `world/map/city.ts`. The player marker is parked on the central plaza (the
 * spawn); wiring it to the live position comes when the world reports movement
 * back through the bridge.
 */
const PLACES = [
  { id: 'bank', label: 'Bank', x: 34, y: 34 },
  { id: 'exchange', label: 'Exchange', x: 64, y: 34 },
  { id: 'fintech', label: 'FinTech', x: 90, y: 34 },
  { id: 'cafeteria', label: 'Café', x: 34, y: 61 },
  { id: 'risk', label: 'Risk', x: 90, y: 61 },
  { id: 'payments', label: 'Payments', x: 34, y: 88 },
  { id: 'academy', label: 'Academy', x: 64, y: 88 },
  { id: 'apartment', label: 'Home', x: 11, y: 88 },
]

const YOU = { x: 48, y: 57 }

export function MiniMap() {
  return (
    <Panel title="Novus" icon="◈" accent="jade">
      <div className="relative m-3 aspect-square border-2 border-line bg-panel-3">
        {PLACES.map((p) => (
          <div
            key={p.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <div className="mx-auto size-1.5 bg-muted" />
            <div className="mt-0.5 font-display text-[8px] text-muted uppercase">{p.label}</div>
          </div>
        ))}
        <div
          className="absolute size-2 -translate-x-1/2 -translate-y-1/2 border border-night bg-marigold"
          style={{ left: `${YOU.x}%`, top: `${YOU.y}%` }}
          title="You start here"
        />
      </div>
    </Panel>
  )
}
