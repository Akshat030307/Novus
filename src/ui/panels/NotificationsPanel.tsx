import { useGameStore } from '@/state/store'
import { clockTime } from '@/lib/format'

const KIND: Record<string, { tag: string; cls: string }> = {
  market: { tag: 'MKT', cls: 'border-marigold text-marigold' },
  quest: { tag: 'TASK', cls: 'border-amethyst text-amethyst' },
  money: { tag: '₹', cls: 'border-jade text-jade' },
  city: { tag: 'CITY', cls: 'border-line text-muted' },
}

export function NotificationsPanel() {
  const items = useGameStore((s) => s.state.notifications)

  if (items.length === 0) {
    return <p className="p-3 text-sm text-muted">Quiet so far today.</p>
  }

  return (
    <ul className="divide-y divide-line/60">
      {items.map((n) => {
        const k = KIND[n.kind] ?? KIND.city
        return (
          <li key={n.id} className="anim-feed flex items-baseline gap-2 px-3 py-2 text-sm">
            <span className="font-num text-[10px] text-muted">{clockTime(n.minute)}</span>
            <span
              className={`shrink-0 border px-1 font-display text-[8px] uppercase leading-relaxed ${k.cls}`}
            >
              {k.tag}
            </span>
            <span className="text-ink">{n.text}</span>
          </li>
        )
      })}
    </ul>
  )
}
