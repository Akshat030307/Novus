import { useGameStore } from '@/state/store'
import { clockTime } from '@/lib/format'

const kindColor: Record<string, string> = {
  market: 'text-marigold',
  quest: 'text-amethyst',
  money: 'text-jade',
  city: 'text-muted',
}

export function NotificationsPanel() {
  const items = useGameStore((s) => s.state.notifications)

  if (items.length === 0) {
    return <p className="p-3 text-sm text-muted">Quiet so far today.</p>
  }

  return (
    <ul className="divide-y divide-line/60">
      {items.map((n) => (
        <li key={n.id} className="flex gap-3 px-3 py-2 text-sm">
          <span className="font-num text-[11px] text-muted">{clockTime(n.minute)}</span>
          <span className={kindColor[n.kind]}>{n.text}</span>
        </li>
      ))}
    </ul>
  )
}
