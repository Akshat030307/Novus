import { useEffect, useMemo, useState } from 'react'
import { cloudEnabled, sendMagicLink, signOut } from '@/lib/supabase'
import { useAuthStore } from '@/state/auth'
import { SCENARIOS } from '@/data/scenarios'
import { MODULES } from '@/data/modules'
import { buildRows, whatToTeachNext, type Assignment, type CohortMember } from '@/sim/cohort'
import type { Attempt } from '@/sim/attempts'
import {
  addAssignment,
  cohortAttempts,
  createCohort,
  listAssignments,
  listMembers,
  myCohorts,
  removeAssignment,
  type Cohort,
} from '@/state/cohorts'
import { PixelButton } from '@/ui/components/PixelButton'

/**
 * Issue B3. The instructor's side, at /teach.
 *
 * A separate surface on purpose: a teacher is not a player and should never
 * have to walk a city to find out whether their class did the homework.
 *
 * The completion table is the obvious half. The half that matters is
 * "what to teach next" — the game already logs typed mistakes per player, so
 * the same records that tell one student they keep trading the noise tell a
 * teacher that eleven of nineteen do, and that Thursday should open with it.
 */
export default function TeachScreen() {
  const user = useAuthStore((s) => s.user)
  const ready = useAuthStore((s) => s.ready)
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return setCohorts([])
    void myCohorts().then(setCohorts)
  }, [user])

  return (
    <div className="h-full overflow-y-auto bg-night">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b-2 border-line pb-4">
          <div>
            <h1 className="font-display text-xl text-ink">NOVUS · TEACHING</h1>
            <p className="mt-1 font-display text-[9px] text-magenta uppercase">
              Cohorts, assignments, and where a class is actually stuck
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="font-display text-[9px] text-muted uppercase underline hover:text-marigold"
            >
              Back to the game
            </a>
            {user && (
              <button
                onClick={() => void signOut()}
                className="font-display text-[9px] text-muted uppercase underline hover:text-coral"
              >
                Sign out
              </button>
            )}
          </div>
        </header>

        {!ready && <p className="text-sm text-muted">…</p>}
        {ready && !user && <SignIn />}
        {ready && user && !openId && (
          <CohortList cohorts={cohorts} onOpen={setOpenId} onCreated={(c) => setCohorts((p) => [c, ...p])} />
        )}
        {ready && user && openId && (
          <CohortView
            cohort={cohorts.find((c) => c.id === openId)!}
            onBack={() => setOpenId(null)}
          />
        )}
      </div>
    </div>
  )
}

function SignIn() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    const { error } = await sendMagicLink(email.trim())
    if (error) return setError(error)
    setSent(true)
  }

  if (!cloudEnabled) {
    return (
      <p className="border-l-2 border-coral pl-3 text-sm text-muted">
        This copy of Novus has no cloud configured, so there is nothing to teach against.
      </p>
    )
  }

  return (
    <div className="max-w-md space-y-3">
      <p className="text-sm text-muted">
        Sign in to create a cohort. Students join it with a six-character code from inside the game.
      </p>
      {sent ? (
        <p className="border-l-2 border-jade pl-3 text-sm text-ink">
          Check your email — the link signs you straight back in here.
        </p>
      ) : (
        <div className="flex gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@college.edu"
            className="min-w-0 flex-1 border-2 border-line bg-panel px-3 py-2 text-sm text-ink placeholder:text-muted/50 focus:border-marigold focus:outline-none"
          />
          <PixelButton tone="primary" onClick={() => void send()} disabled={!email.includes('@')}>
            Send link
          </PixelButton>
        </div>
      )}
      {error && <p className="text-xs text-coral">{error}</p>}
    </div>
  )
}

function CohortList({
  cohorts,
  onOpen,
  onCreated,
}: {
  cohorts: Cohort[]
  onOpen: (id: string) => void
  onCreated: (c: Cohort) => void
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const create = async () => {
    setBusy(true)
    setError(null)
    const result = await createCohort(name)
    setBusy(false)
    if (!result.ok) return setError(result.error)
    onCreated(result.value)
    setName('')
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-line bg-panel-3 p-3">
        <div className="font-display text-[9px] text-muted uppercase">New cohort</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="e.g. FY2 Finance, Tuesday group"
            className="min-w-0 flex-1 border-2 border-line bg-panel px-3 py-2 text-sm text-ink placeholder:text-muted/50 focus:border-marigold focus:outline-none"
          />
          <PixelButton tone="primary" onClick={() => void create()} disabled={!name.trim() || busy}>
            {busy ? 'Creating…' : 'Create'}
          </PixelButton>
        </div>
        {error && <p className="mt-2 text-xs text-coral">{error}</p>}
      </div>

      {cohorts.length === 0 ? (
        <p className="text-sm text-muted">No cohorts yet.</p>
      ) : (
        <ul className="space-y-2">
          {cohorts.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => onOpen(c.id)}
                className="flex w-full items-baseline justify-between gap-3 border-2 border-line bg-panel-3 p-3 text-left hover:border-marigold"
              >
                <span className="font-display text-[11px] text-ink">{c.name}</span>
                <span className="font-num text-sm tracking-widest text-marigold">{c.joinCode}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const ASSIGNABLE = [
  ...SCENARIOS.map((s) => ({ kind: 'drill' as const, refId: s.id, title: s.title })),
  ...MODULES.map((m) => ({ kind: 'module' as const, refId: m.id, title: m.title })),
]

function CohortView({ cohort, onBack }: { cohort: Cohort; onBack: () => void }) {
  const [members, setMembers] = useState<CohortMember[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [attempts, setAttempts] = useState<(Attempt & { userId: string })[]>([])
  const [pick, setPick] = useState(ASSIGNABLE[0].refId)
  const [due, setDue] = useState('')
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    const [m, a] = await Promise.all([listMembers(cohort.id), listAssignments(cohort.id)])
    setMembers(m)
    setAssignments(a)
    setAttempts(await cohortAttempts(m.map((x) => x.userId)))
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohort.id])

  const rows = useMemo(
    () => buildRows(members, assignments, attempts),
    [members, assignments, attempts],
  )
  const lessons = useMemo(() => whatToTeachNext(rows, assignments), [rows, assignments])

  const assign = async () => {
    const chosen = ASSIGNABLE.find((a) => a.refId === pick)
    if (!chosen) return
    await addAssignment(cohort.id, {
      kind: chosen.kind,
      refId: chosen.refId,
      title: chosen.title,
      dueAt: due ? new Date(due).toISOString() : null,
    })
    setDue('')
    await refresh()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <button
          onClick={onBack}
          className="border border-line px-2 py-1 font-display text-[9px] text-muted uppercase hover:text-ink"
        >
          ← All cohorts
        </button>
        <div className="text-right">
          <h2 className="font-display text-[13px] text-marigold uppercase">{cohort.name}</h2>
          <p className="font-display text-[9px] text-muted uppercase">
            Join code <span className="font-num text-sm tracking-widest text-ink">{cohort.joinCode}</span>
          </p>
        </div>
      </div>

      {lessons.length > 0 && (
        <section className="border-2 border-amethyst bg-panel-3 p-3">
          <h3 className="font-display text-[10px] text-amethyst uppercase">What to teach next</h3>
          <p className="mt-1 text-[11px] text-muted">
            Built from the habits the game logged while they played, not from their scores.
          </p>
          <ul className="mt-2 space-y-2">
            {lessons.map((l) => (
              <li key={l.headline}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-ink">{l.headline}</span>
                  <span className="shrink-0 font-num text-xs text-amethyst">
                    {l.affected}/{l.of}
                  </span>
                </div>
                <p className="text-[11px] text-muted">{l.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="border-2 border-line bg-panel-3 p-3">
        <h3 className="font-display text-[10px] text-muted uppercase">Set work</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            className="border-2 border-line bg-panel px-2 py-1.5 text-xs text-ink focus:border-marigold focus:outline-none"
          >
            {ASSIGNABLE.map((a) => (
              <option key={a.refId} value={a.refId}>
                {a.kind === 'drill' ? 'Drill' : 'Module'} — {a.title}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="border-2 border-line bg-panel px-2 py-1.5 font-num text-xs text-ink focus:border-marigold focus:outline-none"
          />
          <PixelButton onClick={() => void assign()}>Assign</PixelButton>
        </div>
        {assignments.length > 0 && (
          <ul className="mt-2 space-y-1">
            {assignments.map((a) => (
              <li key={a.id} className="flex items-baseline justify-between gap-3 text-xs">
                <span className="text-muted">
                  {a.title}
                  {a.dueAt && ` · due ${new Date(a.dueAt).toLocaleDateString('en-IN')}`}
                </span>
                <button
                  onClick={() => void removeAssignment(a.id).then(refresh)}
                  className="font-display text-[9px] text-muted uppercase underline hover:text-coral"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 font-display text-[10px] text-muted uppercase">
          {members.length} {members.length === 1 ? 'student' : 'students'}
        </h3>
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted">
            Nobody has joined yet. They enter <span className="font-num text-ink">{cohort.joinCode}</span>{' '}
            under Academy → Class.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-line font-display text-[9px] text-muted uppercase">
                  <th className="px-2 py-2 text-left">Student</th>
                  <th className="px-2 py-2 text-right">Day</th>
                  <th className="px-2 py-2 text-right">Modules</th>
                  <th className="px-2 py-2 text-right">Concepts</th>
                  {assignments.map((a) => (
                    <th key={a.id} className="px-2 py-2 text-right">
                      {a.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const s = row.member.summary
                  return (
                    <tr key={row.member.userId} className="border-b border-line/50">
                      <td className="px-2 py-2 text-ink">{row.member.displayName}</td>
                      <td className="px-2 py-2 text-right font-num text-muted">{s?.day ?? '—'}</td>
                      <td className="px-2 py-2 text-right font-num text-muted">
                        {s ? `${s.modulesPassed}/${s.modulesTotal}` : '—'}
                      </td>
                      <td className="px-2 py-2 text-right font-num text-muted">
                        {s ? `${s.conceptsLearned}/${s.conceptsTotal}` : '—'}
                      </td>
                      {row.cells.map((cell, i) => (
                        <td key={assignments[i].id} className="px-2 py-2 text-right font-num">
                          {!cell.best ? (
                            <span className="text-muted">○</span>
                          ) : (
                            <span className={cell.best.passed ? 'text-jade' : 'text-coral'}>
                              {cell.best.passed ? '✓ ' : '✕ '}
                              {cell.best.score}/{cell.best.outOf}
                              {cell.tries > 1 && (
                                <span className="text-muted"> ·{cell.tries}</span>
                              )}
                              {cell.late && <span className="text-marigold"> late</span>}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-[10px] text-muted">
          You can see attempts and the summary each student publishes. Their save, cash, portfolio,
          career and any transcript they issue stay private — that is enforced by the database, not
          by this page.
        </p>
      </section>
    </div>
  )
}
