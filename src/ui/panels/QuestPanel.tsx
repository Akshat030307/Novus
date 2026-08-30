import { useGameStore } from '@/state/store'
import { Panel } from '@/ui/components/Panel'

export function QuestPanel() {
  const quests = useGameStore((s) => s.state.quests.active)

  return (
    <Panel title="Tasks" className="flex-1">
      {quests.length === 0 ? (
        <p className="p-3 text-sm text-muted">
          Nothing on your desk. Walk into a building and ask for work.
        </p>
      ) : (
        <ul className="divide-y-2 divide-line">
          {quests.map((q) => {
            const done = q.steps.filter((s) => s.done).length
            return (
              <li key={q.id} className="p-3">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-[11px] text-ink">{q.title}</h3>
                  <span className="font-num text-[10px] text-muted">{done}/{q.steps.length}</span>
                </div>
                <ul className="space-y-1">
                  {q.steps.map((s) => (
                    <li
                      key={s.id}
                      className={`flex gap-2 text-xs ${s.done ? 'text-muted line-through' : 'text-ink'}`}
                    >
                      <span className={s.done ? 'text-jade' : 'text-marigold'}>{s.done ? '▪' : '▫'}</span>
                      {s.text}
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
