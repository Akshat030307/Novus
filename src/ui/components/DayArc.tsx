import { MARKET_OPEN, MARKET_CLOSE, clockTime } from '@/lib/format'

/**
 * The signature piece of the interface.
 *
 * A clock that says 11:04 tells the player nothing they feel. This shows the
 * trading day as an arc with a pixel sun crossing it, so "half the day is
 * gone" is something you see without reading. It is the one place in the HUD
 * allowed to be decorative, because the thing it encodes — time running out —
 * is the pressure the whole game runs on.
 */
export function DayArc({ minute, day }: { minute: number; day: number }) {
  const span = MARKET_CLOSE - MARKET_OPEN
  const t = Math.max(0, Math.min(1, (minute - MARKET_OPEN) / span))

  // arc geometry, in the 120x44 viewbox below
  const cx = 60
  const cy = 40
  const r = 34
  const angle = Math.PI * (1 - t) // left to right
  const x = cx + r * Math.cos(angle)
  const y = cy - r * Math.sin(angle)

  const beforeOpen = minute < MARKET_OPEN
  const afterClose = minute > MARKET_CLOSE
  const sunColor = afterClose ? 'var(--color-coral)' : 'var(--color-marigold)'

  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 120 44" className="h-11 w-30" aria-hidden="true">
        {/* the arc, drawn as dashes so it reads as steps not a smooth curve */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth="2"
          strokeDasharray="3 4"
        />
        {/* ground line */}
        <line x1="14" y1={cy} x2="106" y2={cy} stroke="var(--color-line)" strokeWidth="2" />
        {/* the sun: a square, never a circle */}
        {!beforeOpen && (
          <rect
            x={x - 4}
            y={y - 4}
            width="8"
            height="8"
            fill={sunColor}
            className="transition-all duration-700 ease-linear"
          />
        )}
      </svg>
      <div className="leading-tight">
        <div className="font-num text-sm text-ink">{clockTime(minute)}</div>
        <div className="font-display text-[9px] text-muted uppercase">
          Day {day}
          {beforeOpen && ' · pre-open'}
          {afterClose && ' · closed'}
        </div>
      </div>
    </div>
  )
}
