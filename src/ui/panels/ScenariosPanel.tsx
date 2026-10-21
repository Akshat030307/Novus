import { useMemo, useState } from 'react'
import { SCENARIOS, type Scenario } from '@/data/scenarios'
import {
  decodeSpec,
  focusById,
  isAimed,
  plainSpec,
  specPreview,
  type ScenarioSpec,
} from '@/sim/aim'
import { useAttemptsStore } from '@/state/attempts'
import { attemptsFor, bestAttempt, progressOn, type Attempt } from '@/sim/attempts'
import { CreditDeskDrill } from '@/ui/scenarios/CreditDeskDrill'
import { BuildABookDrill } from '@/ui/scenarios/BuildABookDrill'
import { SpotTheShockDrill } from '@/ui/scenarios/SpotTheShockDrill'
import { ReplayDrill } from '@/ui/scenarios/ReplayDrill'
import { useClasswork } from '@/state/useClasswork'
import { SetWorkBadge, SetWorkNote } from '@/ui/components/SetWork'

/**
 * Step C-h, extended by issue B2. Set-piece drills, off to one side of the
 * career game. They still touch nothing in the world save — but every run is
 * now logged, because being able to show that the second go was better than
 * the first is the entire point of a drill.
 */
export function ScenariosPanel() {
  const [open, setOpen] = useState<string | null>(null)
  const attempts = useAttemptsStore((s) => s.attempts)
  const syncError = useAttemptsStore((s) => s.error)
  const { classes, work } = useClasswork()
  const drills = work.filter((w) => w.kind === 'drill')

  /**
   * Everything runnable: the drills that always exist, plus any aimed version
   * a teacher has set for this student (issue B11). An aimed run is its own
   * thing — its own refId, its own attempt history — because "the credit desk,
   * collateral files only, strict" is not the same exercise as the credit
   * desk, and a shared score would hide which one somebody actually passed.
   */
  const runnable = useMemo<Runnable[]>(() => {
    const aimed = drills
      .filter((w) => isAimed(w.refId))
      .map((w): Runnable | null => {
        const spec = decodeSpec(w.refId)
        const base = SCENARIOS.find((x) => x.id === spec.drill)
        return base
          ? { refId: w.refId, scenario: base, spec, title: w.title, setBy: w.cohortName }
          : null
      })
      .filter((r): r is Runnable => r !== null)
    const plain: Runnable[] = SCENARIOS.map((sc) => ({
      refId: sc.id,
      scenario: sc,
      spec: plainSpec(sc.id),
      title: sc.title,
    }))
    return [...aimed, ...plain]
  }, [drills])

  const current = runnable.find((r) => r.refId === open) ?? null
  const aimed = runnable.filter((r) => isAimed(r.refId))
  const plain = runnable.filter((r) => !isAimed(r.refId))

  if (current) {
    const { scenario, spec, refId } = current
    const focus = focusById(spec.focus)
    return (
      <div className="space-y-4">
        <button
          onClick={() => setOpen(null)}
          className="border border-line px-2 py-1 text-[12px] text-muted font-semibold uppercase tracking-wide hover:text-ink"
        >
          ← All drills
        </button>
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[14px] text-marigold font-semibold uppercase tracking-wide">
              {current.title}
            </h3>
            <SetWorkBadge
              work={drills}
              refId={refId}
              passed={Boolean(bestAttempt(attempts, refId)?.passed)}
            />
          </div>
          {/* the base brief would say "five loan files" on a run of two, so an
              aimed drill describes itself instead */}
          {focus || spec.count !== null || spec.hard ? (
            <p className="mt-1 text-[14px] text-muted">
              {focus && <span className="text-ink">Aimed at {focus.label.toLowerCase()}. </span>}
              {specPreview(spec, 0)}
            </p>
          ) : (
            <p className="mt-1 text-[14px] text-muted">{scenario.brief}</p>
          )}
          <p className="mt-1 text-[14px] text-amethyst">
            Goal: {spec.hard ? 'the call and the reasoning, on every file.' : scenario.goal}
          </p>
        </div>
        <History id={refId} attempts={attempts} full />
        <SyncNote error={syncError} />
        {scenario.kind === 'credit-desk' && <CreditDeskDrill spec={spec} />}
        {scenario.kind === 'build-a-book' && <BuildABookDrill spec={spec} />}
        {scenario.kind === 'spot-the-shock' && <SpotTheShockDrill spec={spec} />}
        {scenario.kind === 'replay' && scenario.replayId && <ReplayDrill replayId={scenario.replayId} />}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-[14px] text-muted">
        Practice runs, separate from your career. Your world save is untouched, but every attempt
        is kept, so the improvement is visible and goes on your transcript.
      </p>
      <SetWorkNote work={drills} inAClass={classes.length > 0} kind="drills" />
      <SyncNote error={syncError} />

      {aimed.length > 0 && (
        <section>
          <div className="mb-2 text-[12px] text-marigold font-semibold uppercase tracking-wide">
            Set for you
          </div>
          <ul className="space-y-2">
            {aimed.map((r) => (
              <Entry key={r.refId} run={r} attempts={attempts} drills={drills} onOpen={setOpen} />
            ))}
          </ul>
        </section>
      )}

      <section>
        {aimed.length > 0 && (
          <div className="mb-2 text-[12px] text-muted font-semibold uppercase tracking-wide">
            Every drill
          </div>
        )}
        <ul className="space-y-2">
          {plain.map((r) => (
            <Entry key={r.refId} run={r} attempts={attempts} drills={drills} onOpen={setOpen} />
          ))}
        </ul>
      </section>
    </div>
  )
}

/** a drill as it can be run: the base exercise, plus how it has been aimed */
interface Runnable {
  refId: string
  scenario: Scenario
  spec: ScenarioSpec
  title: string
  /** the class that set it, where one did */
  setBy?: string
}

function Entry({
  run,
  attempts,
  drills,
  onOpen,
}: {
  run: Runnable
  attempts: Attempt[]
  drills: import('@/sim/cohort').SetWork[]
  onOpen: (refId: string) => void
}) {
  const focus = focusById(run.spec.focus)
  return (
    <li>
      <button
        onClick={() => onOpen(run.refId)}
        className="w-full border-2 border-line bg-panel-3 p-3 text-left hover:border-marigold"
      >
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-[14px] text-ink">{run.title}</h3>
          <span className="flex shrink-0 items-baseline gap-2">
            <SetWorkBadge
              work={drills}
              refId={run.refId}
              passed={Boolean(bestAttempt(attempts, run.refId)?.passed)}
            />
            <Best id={run.refId} attempts={attempts} />
          </span>
        </div>
        <p className="mt-1 text-[14px] text-muted">
          {focus ? specPreview(run.spec, 0) : run.scenario.brief}
        </p>
        {run.setBy && (
          <p className="mt-1 text-[13px] text-muted/80">
            Set by {run.setBy}. It is kept apart from your own practice, so this score is the one
            your teacher sees against it.
          </p>
        )}
      </button>
    </li>
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
    <p className="border-l-2 border-marigold pl-3 text-[13px] text-muted">
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
      className={`shrink-0 font-display text-[12px] uppercase ${
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
      <div className="mb-2 text-[12px] text-muted font-semibold uppercase tracking-wide">
        Your attempts · {mine.length}
      </div>
      <ol className="flex flex-wrap gap-1">
        {order.map((a, i) => (
          <li
            key={a.id}
            title={`${new Date(a.at).toLocaleString('en-IN')} · ${a.score}/${a.outOf}`}
            className={`border px-1.5 py-0.5 font-num text-[13px] ${
              a.passed ? 'border-jade text-jade' : 'border-line text-muted'
            }`}
          >
            <span className="text-muted">{i + 1}.</span> {a.score}/{a.outOf}
          </li>
        ))}
      </ol>
      {full && progress && (
        <p className="mt-2 text-[13px] text-muted">
          First go {progress.first.score}/{progress.first.outOf}, latest{' '}
          {progress.latest.score}/{progress.latest.outOf},{' '}
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
