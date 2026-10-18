import { useEffect, useMemo } from 'react'
import { HABITS, resultOf, type Assignment, type Row } from '@/sim/cohort'
import { percent, type Attempt } from '@/sim/attempts'

/**
 * One student, everything the class is allowed to see about them.
 *
 * A drawer rather than a page: a teacher scanning a table wants to look at
 * somebody and then carry on scanning, not navigate away and come back.
 *
 * What is here is what the student chose to share plus their own attempts.
 * Their save, their cash and any transcript they issued are not in this data
 * at all — the database never sends them, so there is nothing to filter out.
 */
export function StudentDetail({
  row,
  assignments,
  attempts,
  onClose,
}: {
  row: Row
  assignments: Assignment[]
  /** every attempt in the class; this picks out the ones that are theirs */
  attempts: (Attempt & { userId: string })[]
  onClose: () => void
}) {
  const s = row.member.summary
  const mine = useMemo(
    () =>
      attempts
        .filter((a) => a.userId === row.member.userId)
        .sort((a, b) => (a.at < b.at ? 1 : -1)),
    [attempts, row.member.userId],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const habits = s ? HABITS.filter((h) => (s.mistakes[h.kind] ?? 0) > 0) : []
  const when = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-night/70" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-[640px] flex-col border-l border-line bg-panel shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`${row.member.displayName}, full history`}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line bg-panel-2 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-ink">{row.member.displayName}</h2>
            <p className="mt-0.5 text-sm text-muted">
              {s ? `Day ${s.day} · Level ${s.level}` : 'Has not shared any progress yet'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:text-ink"
          >
            Close
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {s && (
            <section className="grid grid-cols-2 gap-3">
              <Figure label="Modules passed" value={`${s.modulesPassed}/${s.modulesTotal}`} />
              <Figure label="Concepts learned" value={`${s.conceptsLearned}/${s.conceptsTotal}`} />
              <Figure label="Sound calls" value={String(s.soundCalls)} tone="text-jade" />
              <Figure label="Unsound calls" value={String(s.unsoundCalls)} tone="text-coral" />
            </section>
          )}

          <section>
            <h3 className="mb-2 text-[13px] font-semibold tracking-wide text-muted uppercase">Set work</h3>
            {assignments.length === 0 ? (
              <p className="text-sm text-muted">No work set yet.</p>
            ) : (
              <ul className="divide-y divide-line rounded-lg border border-line">
                {assignments.map((a, i) => {
                  const cell = row.cells[i]
                  const kind = resultOf(cell)
                  const tone =
                    kind === 'passed' ? 'text-jade' : kind === 'notYet' ? 'text-coral' : 'text-muted'
                  return (
                    <li key={a.id} className="flex items-baseline justify-between gap-3 px-4 py-3">
                      <span className="text-ink">
                        {a.title}
                        {a.optional && <span className="ml-2 text-xs text-muted">optional</span>}
                      </span>
                      <span className={`shrink-0 text-right text-sm ${tone}`}>
                        {kind === 'passed' ? 'Passed' : kind === 'notYet' ? 'Not yet' : 'Not started'}
                        {cell.best && (
                          <span className="font-num">
                            {' '}
                            {cell.best.score}/{cell.best.outOf}
                          </span>
                        )}
                        {cell.late && <span className="block text-xs text-marigold">late</span>}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-[13px] font-semibold tracking-wide text-muted uppercase">
              Habits the game logged
            </h3>
            {habits.length === 0 ? (
              <p className="text-sm text-muted">Nothing logged against them.</p>
            ) : (
              <ul className="space-y-2">
                {habits.map((h) => (
                  <li key={h.kind} className="flex items-baseline justify-between gap-3 text-[15px]">
                    <span className="text-ink">{h.label}</span>
                    <span className="font-num text-amethyst">×{s!.mistakes[h.kind]}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-[13px] font-semibold tracking-wide text-muted uppercase">
              Every attempt{mine.length > 0 && <span className="ml-2 font-num text-muted">{mine.length}</span>}
            </h3>
            {mine.length === 0 ? (
              <p className="text-sm text-muted">Nothing attempted yet.</p>
            ) : (
              <ul className="divide-y divide-line rounded-lg border border-line">
                {mine.map((a) => {
                  const title = assignments.find((x) => x.refId === a.refId)?.title ?? a.refId
                  return (
                    <li key={a.id} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                      <span>
                        <span className="text-ink">{title}</span>
                        <span className="ml-2 text-xs text-muted">{when(a.at)}</span>
                      </span>
                      <span className={`shrink-0 font-num text-sm ${a.passed ? 'text-jade' : 'text-coral'}`}>
                        {a.score}/{a.outOf} · {percent(a)}%
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="mt-3 text-[13px] text-muted">
              Every try is kept, including the ones that went badly — a best score alone cannot show
              whether somebody improved.
            </p>
          </section>
        </div>
      </aside>
    </div>
  )
}

function Figure({ label, value, tone = 'text-ink' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel-2 px-4 py-3">
      <div className="text-sm text-muted">{label}</div>
      <div className={`mt-0.5 font-num text-xl font-semibold ${tone}`}>{value}</div>
    </div>
  )
}
