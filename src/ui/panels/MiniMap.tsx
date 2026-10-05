import { Panel } from '@/ui/components/Panel'

/**
 * A sketch of the city — the eight doors you can walk into, laid out to match
 * `world/map/city.ts`. The player marker is parked on the central plaza (the
 * spawn); wiring it to the live position comes when the world reports movement
 * back through the bridge.
 */
const PLACES = [
  { id: 'bank', label: 'Bank', x: 28, y: 26 },
  { id: 'exchange', label: 'Exchange', x: 58, y: 26 },
  { id: 'fintech', label: 'FinTech', x: 88, y: 26 },
  { id: 'cafeteria', label: 'Café', x: 28, y: 55 },
  { id: 'risk', label: 'Risk', x: 88, y: 55 },
  { id: 'payments', label: 'Payments', x: 34, y: 84 },
  { id: 'academy', label: 'Academy', x: 58, y: 84 },
  { id: 'apartment', label: 'Home', x: 8, y: 84 },
]

const YOU = { x: 48, y: 57 }

export function MiniMap() {
  return (
    <Panel title="Novus" icon="◈" accent="jade">
      <div className="relative m-3 aspect-square rounded-lg border border-line bg-panel-3">
        {PLACES.map((p) => (
          <div
            key={p.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <div className="mx-auto size-1.5 rounded-full bg-muted" />
            <div className="mt-0.5 text-[11px] leading-none font-medium whitespace-nowrap text-muted">
              {p.label}
            </div>
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
