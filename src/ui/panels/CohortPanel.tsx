import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '@/state/store'
import { useAuthStore } from '@/state/auth'
import { useAttemptsStore } from '@/state/attempts'
import { buildSummary, type Assignment } from '@/sim/cohort'
import { bestAttempt, progressOn } from '@/sim/attempts'
import { joinCohort, leaveCohort, publishSummary } from '@/state/cohorts'
import { useClasswork } from '@/state/useClasswork'
import { useSettingsStore } from '@/state/settings'
import { ClassBoards } from '@/ui/panels/ClassBoards'
import { PixelButton } from '@/ui/components/PixelButton'

/**
 * Issue B3, the student's half. Join a class, see what was set, see where you
 * stand on it.
 *
 * The consent line is not boilerplate and is shown before anyone joins, not
 * after. Joining is the only thing in Novus that lets another person see any
 * of your work, and exactly what they can see is worth stating in the words
 * the database actually enforces.
 */
export function CohortPanel() {
  const state = useGameStore((s) => s.state)
  const attempts = useAttemptsStore((s) => s.attempts)
  const user = useAuthStore((s) => s.user)
  const hideFromBoard = useSettingsStore((s) => s.hideFromBoard)
  const setSetting = useSettingsStore((s) => s.set)

  // one store for everything a class has set, shared with Drills and Modules
  const { classes: memberships, assignments, boards, refresh } = useClasswork()
  const [code, setCode] = useState('')
  const [name, setName] = useState(state.player.name)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // The summary is published when the panel opens and when membership changes
  // — deliberately not on every state change. `state` ticks once a game minute,
  // and watching it here would mean a write to the cloud every few seconds for
  // as long as the panel is on screen. A ref keeps the latest state reachable
  // without making it a dependency.
  const latest = useRef(state)
  useEffect(() => {
    latest.current = state
  }, [state])

  /**
   * What gets published. The attempts go in because the leaderboard's learning
   * figures are computed from them, and the hide flag goes in because the
   * database is what has to know — a setting kept only in this browser would
   * leave the row on everyone else's board.
   */
  const mySummary = () => ({ ...buildSummary(latest.current, attempts), hidden: hideFromBoard })

  useEffect(() => {
    if (!user || memberships.length === 0) return
    void publishSummary(mySummary())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, memberships.length, hideFromBoard])

  const join = async () => {
    setBusy(true)
    setError(null)
    const result = await joinCohort(code, name)
    setBusy(false)
    if (!result.ok) return setError(result.error)
    setCode('')
    await refresh()
    void publishSummary(mySummary())
  }

  const leave = async (cohortId: string) => {
    await leaveCohort(cohortId)
    await refresh()
  }

  if (!user) {
    return (
      <p className="border-l-2 border-line pl-3 text-[14px] text-muted">
        Sign in to join a class. Your career, your cash and your transcripts stay yours either way —
        see below for exactly what joining shares.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {memberships.map((m) => (
        <div key={m.cohortId} className="border-2 border-line bg-panel-3 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-display text-[14px] text-ink">{m.cohortName}</h3>
            <button
              onClick={() => void leave(m.cohortId)}
              className="text-[12px] text-muted font-semibold uppercase tracking-wide underline hover:text-coral"
            >
              Leave
            </button>
          </div>
          <Work assignments={assignments[m.cohortId] ?? []} attempts={attempts} />

          <ClassBoards
            members={boards[m.cohortId] ?? []}
            meId={user.id}
            hidden={hideFromBoard}
          />

          <label className="mt-2 flex cursor-pointer items-center gap-2 text-[13px] text-muted">
            <input
              type="checkbox"
              checked={hideFromBoard}
              onChange={async (e) => {
                setSetting('hideFromBoard', e.target.checked)
                await publishSummary({ ...buildSummary(latest.current, attempts), hidden: e.target.checked })
                await refresh()
              }}
              className="accent-marigold"
            />
            Keep me off the class leaderboard
          </label>

          <button
            onClick={async () => {
              await publishSummary(mySummary())
              await refresh()
            }}
            className="mt-2 text-[12px] text-amethyst font-semibold uppercase tracking-wide underline hover:text-marigold"
          >
            Update what your teacher sees
          </button>
        </div>
      ))}

      <div className="border-2 border-line bg-panel-3 p-3">
        <div className="text-[12px] text-muted font-semibold uppercase tracking-wide">Join a class</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="CODE"
            className="w-24 border-2 border-line bg-night px-2 py-1.5 font-num text-[15px] tracking-widest text-ink placeholder:text-muted/50 focus:border-marigold focus:outline-none"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="the name your teacher will see"
            className="min-w-0 flex-1 border-2 border-line bg-night px-2 py-1.5 text-[14px] text-ink placeholder:text-muted/50 focus:border-marigold focus:outline-none"
          />
          <PixelButton tone="primary" onClick={() => void join()} disabled={code.length < 6 || busy}>
            {busy ? 'Joining…' : 'Join'}
          </PixelButton>
        </div>
        {error && <p className="mt-2 text-[14px] text-coral">{error}</p>}

        <div className="mt-3 border-l-2 border-amethyst pl-3">
          <div className="text-[12px] text-amethyst font-semibold uppercase tracking-wide">What joining shares</div>
          <p className="mt-1 text-[14px] leading-relaxed text-muted">
            Whoever runs the class can see the name you type above, your drill and module attempts —
            every one, including the ones that went badly — and a summary: day, level, modules
            passed, concepts unlocked, sound and unsound calls, and which habits the game has logged
            against you.
          </p>
          <p className="mt-1 text-[14px] leading-relaxed text-muted">
            Your classmates see less: your name and your place on the two class boards — work
            passed, accuracy, improvement, and how your trading has gone as a percentage. Not your
            habits, and not what you hold. You can take yourself off the boards at any time, and
            everyone else's stay visible to you.
          </p>
          <p className="mt-1 text-[14px] leading-relaxed text-muted">
            Nobody can see your save, your cash, your portfolio, your career, or any transcript or
            certificate you have issued. That is enforced by the database, not by this screen. You
            can leave at any time, which stops the sharing.
          </p>
        </div>
      </div>
    </div>
  )
}

function Work({
  assignments,
  attempts,
}: {
  assignments: Assignment[]
  attempts: import('@/sim/attempts').Attempt[]
}) {
  if (assignments.length === 0) {
    return <p className="mt-1 text-[14px] text-muted">Nothing set yet.</p>
  }
  const now = new Date().toISOString()
  return (
    <ul className="mt-2 space-y-1">
      {assignments.map((a) => {
        const best = bestAttempt(attempts, a.refId)
        const prog = progressOn(attempts, a.refId)
        const overdue = a.dueAt && a.dueAt < now && !best
        return (
          <li key={a.id} className="flex items-baseline justify-between gap-3 text-[14px]">
            <span className={best?.passed ? 'text-ink' : 'text-muted'}>
              <span className={`mr-1.5 font-num ${best?.passed ? 'text-jade' : 'text-muted'}`}>
                {best?.passed ? '✓' : best ? '·' : '○'}
              </span>
              {a.title}
              {a.dueAt && (
                <span className={overdue ? 'text-coral' : 'text-muted/70'}>
                  {' '}
                  · due {new Date(a.dueAt).toLocaleDateString('en-IN')}
                </span>
              )}
            </span>
            <span className="shrink-0 font-num text-muted">
              {best ? `${best.score}/${best.outOf}` : 'not started'}
              {prog && prog.gained > 0 && <span className="text-jade"> +{prog.gained}</span>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
