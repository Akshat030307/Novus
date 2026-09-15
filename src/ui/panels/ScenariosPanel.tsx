import { useState } from 'react'
import { SCENARIOS, type Scenario } from '@/data/scenarios'
import { useAttemptsStore } from '@/state/attempts'
import { attemptsFor, bestAttempt, progressOn, type Attempt } from '@/sim/attempts'
import { CreditDeskDrill } from '@/ui/scenarios/CreditDeskDrill'
import { BuildABookDrill } from '@/ui/scenarios/BuildABookDrill'
import { SpotTheShockDrill } from '@/ui/scenarios/SpotTheShockDrill'
import { ReplayDrill } from '@/ui/scenarios/ReplayDrill'

/**
 * Step C-h, extended by issue B2. Set-piece drills, off to one side of the
 * career game. They still touch nothing in the world save — but every run is
 * now logged, because being able to show that the second go was better than
 * the first is the entire point of a drill.
 */
export function ScenariosPanel() {
  const [open, setOpen] = useState<Scenario | null>(null)
  const attempts = useAttemptsStore((s) => s.attempts)
  const syncError = useAttemptsStore((s) => s.error)

  if (open) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setOpen(null)}
          className="border border-line px-2 py-1 font-display text-[9px] text-muted uppercase hover:text-ink"
        >
          ← All drills
        </button>
        <div>
          <h3 className="font-display text-[11px] text-marigold uppercase">{open.title}</h3>
          <p className="mt-1 text-xs text-muted">{open.brief}</p>
          <p className="mt-1 text-xs text-amethyst">Goal: {open.goal}</p>
        </div>
        <History id={open.id} attempts={attempts} full />
        <SyncNote error={syncError} />
        {open.kind === 'credit-desk' && <CreditDeskDrill />}
        {open.kind === 'build-a-book' && <BuildABookDrill />}
        {open.kind === 'spot-the-shock' && <SpotTheShockDrill />}
        {open.kind === 'replay' && open.replayId && <ReplayDrill replayId={open.replayId} />}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Practice runs, separate from your career. Your world save is untouched — but every attempt
        is kept, so the improvement is visible and goes on your transcript.
      </p>
      <SyncNote error={syncError} />
      <ul className="space-y-2">
        {SCENARIOS.map((s) => (
          <li key={s.id}>
            <button
              onClick={() => setOpen(s)}
              className="w-full border-2 border-line bg-panel-3 p-3 text-left hover:border-marigold"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-[11px] text-ink">{s.title}</h3>
                <Best id={s.id} attempts={attempts} />
              </div>
              <p className="mt-1 text-xs text-muted">{s.brief}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * The log is kept in the browser first, so a failed upload costs nothing
 * immediately — but saying nothing would be the old bug back again. It is
 * shown here rather than on the save indicator, which means the world save.
 */
function SyncNote({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <p className="border-l-2 border-marigold pl-3 text-[10px] text-muted">
      Your attempts are saved in this browser, but are not reaching the cloud:{' '}
      <span className="text-marigold">{error}</span> They will go up on their own once it works.
    </p>
  )
}

/** the best score so far, or nothing at all before the first go */
function Best({ id, attempts }: { id: string; attempts: Attempt[] }) {
  const best = bestAttempt(attempts, id)
  if (!best) return null
  const tries = attemptsFor(attempts, id).length
  return (
    <span
      className={`shrink-0 font-display text-[9px] uppercase ${
        best.passed ? 'text-jade' : 'text-marigold'
      }`}
    >
      {best.passed ? '✓ ' : ''}
      {best.score}/{best.outOf}
      <span className="text-muted"> · {tries} {tries === 1 ? 'go' : 'goes'}</span>
    </span>
  )
}

/**
 * Every attempt, oldest at the left. Deliberately not an average: the shape of
 * the run is the information, and a mean of 3/5 and 5/5 tells a teacher
 * nothing about whether the second one was understood.
 */
function History({ id, attempts, full }: { id: string; attempts: Attempt[]; full?: boolean }) {
  const mine = attemptsFor(attempts, id)
  if (mine.length === 0) return null
  const progress = progressOn(attempts, id)
  const order = [...mine].reverse()

  return (
    <div className="border-2 border-line bg-panel-3 p-3">
      <div className="mb-2 font-display text-[9px] text-muted uppercase">
        Your attempts — {mine.length}
      </div>
      <ol className="flex flex-wrap gap-1">
        {order.map((a, i) => (
          <li
            key={a.id}
            title={`${new Date(a.at).toLocaleString('en-IN')} — ${a.score}/${a.outOf}`}
            className={`border px-1.5 py-0.5 font-num text-[10px] ${
              a.passed ? 'border-jade text-jade' : 'border-line text-muted'
            }`}
          >
            <span className="text-muted">{i + 1}.</span> {a.score}/{a.outOf}
          </li>
        ))}
      </ol>
      {full && progress && (
        <p className="mt-2 text-[10px] text-muted">
          First go {progress.first.score}/{progress.first.outOf}, latest{' '}
          {progress.latest.score}/{progress.latest.outOf} —{' '}
          {progress.gained > 0
            ? `up ${progress.gained} points.`
            : progress.gained < 0
              ? `down ${Math.abs(progress.gained)} points.`
              : 'no change yet.'}
        </p>
      )}
    </div>
  )
}
