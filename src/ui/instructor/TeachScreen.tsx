import { useEffect, useMemo, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cloudEnabled, sendMagicLink, signOut } from '@/lib/supabase'
import { useAuthStore } from '@/state/auth'
import { SCENARIOS } from '@/data/scenarios'
import { MODULES } from '@/data/modules'
import {
  assignmentBreakdown,
  buildRows,
  classTotals,
  HABITS,
  resultOf,
  whatToTeachNext,
  type Assignment,
  type Cell,
  type CohortMember,
} from '@/sim/cohort'
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
import { SAMPLE_CLASS_NAME, sampleClass } from '@/data/sample-class'
import {
  ActivityChart,
  AssignmentResults,
  CallsChart,
  ChartCard,
  HabitHeatmap,
  HabitLegend,
  Key,
  ProgressScatter,
  ResultLegend,
  type ResultFilter,
} from '@/ui/instructor/charts'

/** `/teach/sample` — an invented class, open to anyone, signed in or not */
const sampling = /^\/teach\/sample\/?$/.test(window.location.pathname)

/**
 * Issue B3. The instructor's side, at /teach.
 *
 * A separate surface on purpose: a teacher is not a player and should never
 * have to walk a city to find out whether their class did the homework. It is
 * also deliberately plainer than the game — body type, real sizes, no pixel
 * face — because it is read like a register, not played.
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
  // a class is open: the page becomes a full-window dashboard
  const board = sampling || Boolean(ready && user && openId)

  return (
    <div className="flex h-full flex-col bg-night font-ui text-[15px] leading-relaxed text-ink">
      <header className="shrink-0 border-b border-line bg-panel-2">
        <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
          <a href="/teach" className="flex items-baseline gap-2">
            <span className="font-display text-sm text-marigold">NOVUS</span>
            <span className="text-sm text-muted">for teachers</span>
          </a>
          <nav className="flex items-center gap-5 text-sm">
            <a href="/" className="text-muted hover:text-ink">
              Open the game
            </a>
            {user && (
              <button onClick={() => void signOut()} className="text-muted hover:text-ink">
                Sign out
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div
          className={`mx-auto w-full px-4 sm:px-6 ${board ? 'max-w-[1800px] py-4 xl:h-full' : 'max-w-6xl py-8'}`}
        >
        {sampling && <SampleClass />}
        {!sampling && !ready && <p className="text-muted">Loading…</p>}
        {!sampling && ready && !user && <SignIn />}
        {!sampling && ready && user && !openId && (
          <CohortList
            cohorts={cohorts}
            onOpen={setOpenId}
            onCreated={(c) => setCohorts((p) => [c, ...p])}
          />
        )}
        {!sampling && ready && user && openId && (
          <CohortView cohort={cohorts.find((c) => c.id === openId)!} onBack={() => setOpenId(null)} />
        )}
        </div>
      </main>
    </div>
  )
}

/* ---------- small pieces, local to this surface ---------- */

function Button({
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }) {
  const look =
    variant === 'primary'
      ? 'border-marigold bg-marigold text-night hover:bg-marigold/90'
      : 'border-line bg-panel-2 text-ink hover:border-muted'
  return (
    <button
      {...props}
      className={`rounded-md border px-4 py-2 text-[15px] font-semibold transition-colors
        disabled:cursor-not-allowed disabled:opacity-40 ${look} ${className}`}
    />
  )
}

const field =
  'rounded-md border border-line bg-panel-2 px-3 py-2 text-[15px] text-ink placeholder:text-muted/60 focus:border-marigold focus:outline-none'

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-line bg-panel-2 p-5 ${className}`}>{children}</section>
}

function SectionTitle({
  children,
  note,
  accent = 'text-ink',
}: {
  children: ReactNode
  note?: ReactNode
  /** a text-* token class */
  accent?: string
}) {
  return (
    <div className="mb-3">
      <h3 className={`text-base font-semibold ${accent}`}>{children}</h3>
      {note && <p className="mt-0.5 text-sm text-muted">{note}</p>}
    </div>
  )
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

/* ---------- signed out ---------- */

function SignIn() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    const { error } = await sendMagicLink(email.trim())
    if (error) return setError(error)
    setSent(true)
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 pt-4">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Teach with Novus</h1>
        <p className="mt-2 text-muted">
          Create a class, set modules and drills, and see what your students are getting wrong — from
          the decisions they make in the game, not from a quiz score.
        </p>
      </div>

      {!cloudEnabled ? (
        <p className="rounded-md border border-coral/40 bg-coral/10 px-4 py-3 text-sm text-ink">
          This copy of Novus has no cloud configured, so classes can't be created here.
        </p>
      ) : (
        <Card>
          <SectionTitle note="We'll email you a sign-in link. No password.">Sign in</SectionTitle>
          {sent ? (
            <p className="text-ink">Check your email — the link signs you straight back in here.</p>
          ) : (
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                void send()
              }}
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
                className={`min-w-0 flex-1 ${field}`}
              />
              <Button variant="primary" type="submit" disabled={!email.includes('@')}>
                Send link
              </Button>
            </form>
          )}
          {error && <p className="mt-2 text-sm text-coral">{error}</p>}
        </Card>
      )}

      <SampleLink />
    </div>
  )
}

/** the way in for a teacher who wants to see the page working before making a class */
function SampleLink() {
  return (
    <a
      href="/teach/sample"
      className="block rounded-lg border border-dashed border-line p-5 transition-colors hover:border-muted"
    >
      <span className="font-semibold text-ink">See a sample class →</span>
      <span className="mt-1 block text-sm text-muted">
        Twelve invented students a week into the game: what this page looks like once a class has
        played.
      </span>
    </a>
  )
}

/* ---------- the list of classes ---------- */

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
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">Your classes</h1>

      <Card>
        <SectionTitle note="Students join from inside the game with the code it gives you.">
          New class
        </SectionTitle>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void create()
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="e.g. FY B.Com Finance, Tuesday group"
            className={`min-w-0 flex-1 ${field}`}
          />
          <Button variant="primary" type="submit" disabled={!name.trim() || busy}>
            {busy ? 'Creating…' : 'Create class'}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-coral">{error}</p>}
      </Card>

      {cohorts.length === 0 ? (
        <div className="space-y-4">
          <p className="text-muted">No classes yet.</p>
          <SampleLink />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line">
          {cohorts.map((c, i) => (
            <button
              key={c.id}
              onClick={() => onOpen(c.id)}
              className={`flex w-full items-center justify-between gap-4 bg-panel-2 px-5 py-4 text-left transition-colors hover:bg-panel-3 ${
                i > 0 ? 'border-t border-line' : ''
              }`}
            >
              <span>
                <span className="block font-semibold text-ink">{c.name}</span>
                <span className="text-sm text-muted">Created {shortDate(c.createdAt)}</span>
              </span>
              <span className="text-right">
                <span className="block text-xs text-muted">Join code</span>
                <span className="font-num tracking-wider text-ink">{c.joinCode}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- one class ---------- */

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
    <ClassBoard
      name={cohort.name}
      joinCode={cohort.joinCode}
      back={
        <button onClick={onBack} className="text-sm text-muted hover:text-ink">
          ← All classes
        </button>
      }
      members={members}
      assignments={assignments}
      attempts={attempts}
      loading={loading}
      setWork={
        <Card>
          <SectionTitle
            accent="text-marigold"
            note="Drills and module checks. Students see them in the game under Academy → Class."
          >
            Set work
          </SectionTitle>
          <div className="flex flex-wrap items-center gap-2">
            <select value={pick} onChange={(e) => setPick(e.target.value)} className={field}>
              {ASSIGNABLE.map((a) => (
                <option key={a.refId} value={a.refId}>
                  {a.kind === 'drill' ? 'Drill' : 'Module'}: {a.title}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-muted">
              Due
              <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={field} />
            </label>
            <Button variant="primary" onClick={() => void assign()}>
              Assign
            </Button>
          </div>
          <AssignmentList
            assignments={assignments}
            onRemove={(id) => void removeAssignment(id).then(refresh)}
          />
        </Card>
      }
    />
  )
}

/**
 * The sample class. Read-only on purpose: nothing here can be assigned,
 * removed or saved, because there is nobody on the other end.
 */
function SampleClass() {
  const data = useMemo(() => sampleClass(), [])
  return (
    <ClassBoard
      name={SAMPLE_CLASS_NAME}
      joinCode={null}
      badge={
        <span
          className="rounded-full border border-marigold/50 bg-marigold/10 px-2.5 py-0.5 text-[13px] font-medium text-marigold"
          title="An invented class, about a week in, shown through exactly the same page a real class gets. Nothing here is stored, and none of it can be changed."
        >
          Sample data — not real students
        </span>
      }
      back={
        <a href="/teach" className="text-sm text-muted hover:text-ink">
          ← Your classes
        </a>
      }
      {...data}
      loading={false}
      setWork={
        <Card>
          <SectionTitle accent="text-marigold">Work set this week</SectionTitle>
          <AssignmentList assignments={data.assignments} />
        </Card>
      }
    />
  )
}

function AssignmentList({
  assignments,
  onRemove,
}: {
  assignments: Assignment[]
  onRemove?: (id: string) => void
}) {
  if (assignments.length === 0) return null
  return (
    <ul className="mt-4 divide-y divide-line border-t border-line">
      {assignments.map((a) => (
        <li key={a.id} className="flex items-baseline justify-between gap-3 py-2.5">
          <span className="text-ink">
            {a.title}
            <span className="ml-2 text-sm text-muted">
              {a.kind === 'drill' ? 'Drill' : 'Module'}
              {a.dueAt && ` · due ${shortDate(a.dueAt)}`}
            </span>
          </span>
          {onRemove && (
            <button onClick={() => onRemove(a.id)} className="text-sm text-muted hover:text-coral">
              Remove
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

type Tab = 'overview' | 'students' | 'work'

/**
 * Everything below the page header — shared by a real class and the sample.
 *
 * On a landscape screen (xl and up) it is a dashboard that fits the window:
 * a short band of figures, then six cards in a 3 × 2 grid, each chart sized
 * to its card. The long student table and the work form live on their own
 * tabs so nothing has to be scrolled to. Narrower screens stack and scroll.
 */
function ClassBoard({
  name,
  joinCode,
  badge,
  back,
  members,
  assignments,
  attempts,
  loading,
  setWork,
}: {
  name: string
  /** null for the sample, which nobody can join */
  joinCode: string | null
  badge?: ReactNode
  back: ReactNode
  members: CohortMember[]
  assignments: Assignment[]
  attempts: (Attempt & { userId: string })[]
  loading: boolean
  setWork: ReactNode
}) {
  const rows = useMemo(
    () => buildRows(members, assignments, attempts),
    [members, assignments, attempts],
  )
  const lessons = useMemo(() => whatToTeachNext(rows, assignments), [rows, assignments])
  const totals = useMemo(() => classTotals(rows), [rows])
  const breakdowns = useMemo(() => assignmentBreakdown(rows, assignments), [rows, assignments])
  const [now] = useState(() => Date.now())
  const [tab, setTab] = useState<Tab>('overview')

  // one student picked anywhere is highlighted everywhere
  const [focus, setFocus] = useState<string | null>(null)
  // a bar segment clicked in "Results by assignment" narrows the student list to those students
  const [filter, setFilter] = useState<ResultFilter | null>(null)
  const focused = rows.find((r) => r.member.userId === focus) ?? null

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFocus(null)
        setFilter(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const filterIndex = filter ? assignments.findIndex((a) => a.id === filter.assignmentId) : -1
  const tableRows =
    filter && filterIndex >= 0 ? rows.filter((r) => resultOf(r.cells[filterIndex]) === filter.kind) : rows
  const RESULT_WORD = { passed: 'passed', notYet: 'not yet passed', notStarted: 'not started' } as const
  const hasClass = !loading && members.length > 0

  const title = (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
        {back}
        <h1 className="text-xl font-semibold text-ink">{name}</h1>
        {badge}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {hasClass && (
          <nav className="flex rounded-lg border border-line bg-panel-2 p-0.5 text-sm" aria-label="Class views">
            {(
              [
                ['overview', 'Overview'],
                ['students', `Students · ${members.length}`],
                ['work', `Work set · ${assignments.length}`],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-current={tab === id}
                className={`rounded-md px-3 py-1 font-medium transition-colors ${
                  tab === id ? 'bg-panel-3 text-marigold' : 'text-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        )}
        {joinCode ? (
          <div className="text-right leading-tight">
            <div className="text-xs text-muted">Join code</div>
            <div className="font-num tracking-wider text-ink">{joinCode}</div>
          </div>
        ) : (
          <div className="text-sm text-muted">Nobody can join a sample</div>
        )}
      </div>
    </div>
  )

  if (!hasClass) {
    return (
      <div className="space-y-6">
        {title}
        {setWork}
        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : (
          <p className="text-muted">
            Nobody has joined yet. Students enter <span className="font-num text-ink">{joinCode}</span>{' '}
            in the game under Academy → Class.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 xl:h-full xl:min-h-0">
      {title}

      {/* the figures, or the picked student in their place — same slot, so nothing moves down */}
      {focused ? (
        <FocusStrip row={focused} assignments={assignments} onClear={() => setFocus(null)} />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Figure tone="text-ink" bar="bg-ink" label="Students" value={String(totals.students)} />
          <Figure
            tone="text-amethyst"
            bar="bg-amethyst"
            label="Sharing progress"
            value={`${totals.reporting} of ${totals.students}`}
            share={totals.reporting / Math.max(1, totals.students)}
          />
          <Figure
            tone="text-marigold"
            bar="bg-marigold"
            label="Work attempted"
            value={totals.slots ? `${totals.attempted} of ${totals.slots}` : '—'}
            share={totals.slots ? totals.attempted / totals.slots : undefined}
          />
          <Figure
            tone="text-jade"
            bar="bg-jade"
            label="Work passed"
            value={totals.slots ? `${totals.passed} of ${totals.slots}` : '—'}
            share={totals.slots ? totals.passed / totals.slots : undefined}
            note={totals.late ? `${totals.late} handed in late` : undefined}
          />
        </div>
      )}

      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-2 xl:min-h-0 xl:flex-1 xl:grid-cols-3 xl:grid-rows-2">
          <ChartCard
            title="What to teach next"
            accent="text-amethyst"
            note="From the habits the game logged, not from scores."
            bodyHeight="h-96"
          >
            <div className="absolute inset-0 overflow-y-auto pr-1">
              {lessons.length === 0 ? (
                <p className="text-sm text-muted">
                  Nothing shared by a quarter of the class yet. One student's habit is a conversation
                  with that student, not a lesson plan.
                </p>
              ) : (
                <ol className="space-y-3">
                  {lessons.map((l) => (
                    <li key={l.headline} title={l.detail}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-semibold text-ink">{l.headline}</span>
                        <span className="shrink-0 text-[13px] text-muted">
                          <span className="font-num font-semibold text-amethyst">
                            {l.affected}/{l.of}
                          </span>{' '}
                          students
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-panel-3">
                        <div
                          className="h-full rounded-full bg-amethyst"
                          style={{ width: `${Math.round((l.affected / l.of) * 100)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[13px] leading-snug text-muted">{l.detail}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </ChartCard>

          <ChartCard
            title="Habits the game logged"
            accent="text-amethyst"
            note="Times each habit came up, per student."
            legend={<HabitLegend />}
            bodyHeight="h-[420px]"
          >
            <HabitHeatmap rows={rows} focus={focus} onFocus={setFocus} />
          </ChartCard>

          <ChartCard
            title="Decisions: sound or not"
            accent="text-coral"
            note="Judged on the reasoning, not the result."
            legend={
              <>
                <Key swatch="bg-coral">Unsound</Key>
                <Key swatch="bg-jade">Sound</Key>
              </>
            }
            bodyHeight="h-[340px]"
          >
            <CallsChart rows={rows} focus={focus} onFocus={setFocus} />
          </ChartCard>

          <ChartCard
            title="Results by assignment"
            accent="text-jade"
            note="Best attempt each. Click a bar to list those students."
            legend={<ResultLegend />}
            bodyHeight="h-60"
          >
            {assignments.length ? (
              <AssignmentResults
                rows={rows}
                breakdowns={breakdowns}
                focus={focus}
                filter={filter}
                onFilter={(f) => {
                  setFilter(f)
                  if (f) setTab('students')
                }}
              />
            ) : (
              <p className="text-sm text-muted">No work set yet — use the Work set tab.</p>
            )}
          </ChartCard>

          <ChartCard
            title="Time played against concepts learned"
            accent="text-marigold"
            note="Across: days played. Up: concepts learned. Far right and low isn't landing."
            bodyHeight="h-72"
          >
            <ProgressScatter rows={rows} focus={focus} onFocus={setFocus} />
          </ChartCard>

          <ChartCard
            title={focused ? `Attempts per day · ${focused.member.displayName}` : 'Attempts per day'}
            accent="text-ink"
            note="Drills and module checks, last two weeks."
            legend={<ResultLegend kinds={['passed', 'notYet']} />}
            bodyHeight="h-60"
          >
            <ActivityChart rows={rows} attempts={attempts} focus={focus} now={now} />
          </ChartCard>
        </div>
      )}

      {tab === 'work' && <div className="xl:min-h-0 xl:flex-1 xl:overflow-y-auto">{setWork}</div>}

      {tab === 'students' && (
        <section className="flex flex-col gap-3 xl:min-h-0 xl:flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              Click a name to follow that student through the charts on the Overview.
            </p>
            {filter && filterIndex >= 0 && (
              <button
                onClick={() => setFilter(null)}
                className="rounded-full border border-marigold/50 bg-marigold/10 px-3 py-1 text-sm text-marigold hover:bg-marigold/20"
              >
                {tableRows.length} {RESULT_WORD[filter.kind]} · {assignments[filterIndex].title}
                <span className="ml-2 text-ink">× show all</span>
              </button>
            )}
          </div>
          <div className="overflow-auto rounded-xl border border-line xl:min-h-0 xl:flex-1">
            <table className="w-full min-w-[720px] border-collapse">
              <thead className="sticky top-0 z-10 bg-panel-2 text-left text-sm text-muted">
                <tr className="border-b border-line">
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 text-right font-semibold">Day</th>
                  <th className="px-4 py-3 text-right font-semibold">Modules</th>
                  <th className="px-4 py-3 text-right font-semibold">Concepts</th>
                  {assignments.map((a) => (
                    <th key={a.id} className="px-4 py-3 text-right font-semibold">
                      <span className="block text-ink">{a.title}</span>
                      {a.dueAt && <span className="block text-xs font-normal">due {shortDate(a.dueAt)}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => {
                  const s = row.member.summary
                  const on = focus === row.member.userId
                  return (
                    <tr
                      key={row.member.userId}
                      className={`border-b border-line last:border-b-0 ${on ? 'bg-marigold/10' : 'hover:bg-panel-2'}`}
                    >
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => setFocus(on ? null : row.member.userId)}
                          className={`text-left font-medium hover:underline ${on ? 'text-marigold' : 'text-ink'}`}
                          title="Follow this student through the charts"
                        >
                          {row.member.displayName}
                        </button>
                        {!s && <span className="block text-xs text-muted">no progress shared yet</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-num text-muted">{s?.day ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right font-num text-muted">
                        {s ? `${s.modulesPassed}/${s.modulesTotal}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-num text-muted">
                        {s ? `${s.conceptsLearned}/${s.conceptsTotal}` : '—'}
                      </td>
                      {row.cells.map((cell, i) => (
                        <td key={assignments[i].id} className="px-4 py-2.5 text-right">
                          <Result cell={cell} />
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[13px] text-muted">
            You can see attempts and the summary each student chooses to share. Their save, cash,
            portfolio, career and any transcript they issue stay private — that is enforced by the
            database, not by this page.
          </p>
        </section>
      )}
    </div>
  )
}

function Figure({
  label,
  value,
  note,
  tone,
  bar,
  share,
}: {
  label: string
  value: string
  note?: string
  /** text-* and bg-* token classes for the figure and its bar */
  tone: string
  bar: string
  /** 0..1 — draws a thin bar beside the figure */
  share?: number
}) {
  return (
    <div className="rounded-xl border border-line bg-panel-2 px-4 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] text-muted">{label}</span>
        {note && <span className="text-xs text-marigold">{note}</span>}
      </div>
      <div className="flex items-center gap-3">
        <span className={`shrink-0 font-num text-2xl font-semibold ${tone}`}>{value}</span>
        {share !== undefined && (
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel-3">
            <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.round(share * 100)}%` }} />
          </div>
        )}
      </div>
    </div>
  )
}

/** the student picked in a chart, in the figures' place, with a way out */
function FocusStrip({
  row,
  assignments,
  onClear,
}: {
  row: ReturnType<typeof buildRows>[number]
  assignments: Assignment[]
  onClear: () => void
}) {
  const s = row.member.summary
  const habits = s
    ? HABITS.filter((h) => (s.mistakes[h.kind] ?? 0) > 0).map((h) => `${h.label} ×${s.mistakes[h.kind]}`)
    : []
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-marigold/50 bg-marigold/10 px-4 py-2.5">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm text-muted">
          <span className="text-lg font-semibold text-marigold">{row.member.displayName}</span>
          {s ? (
            <>
              <span>
                Day <b className="font-num text-ink">{s.day}</b>
              </span>
              <span>
                Level <b className="font-num text-amethyst">{s.level}</b>
              </span>
              <span>
                Modules <b className="font-num text-ink">{s.modulesPassed}/{s.modulesTotal}</b>
              </span>
              <span>
                Concepts <b className="font-num text-marigold">{s.conceptsLearned}/{s.conceptsTotal}</b>
              </span>
              <span>
                Calls <b className="font-num text-jade">{s.soundCalls} sound</b> ·{' '}
                <b className="font-num text-coral">{s.unsoundCalls} unsound</b>
              </span>
            </>
          ) : (
            <span>Hasn't shared any progress yet.</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {assignments.map((a, i) => {
            const k = resultOf(row.cells[i])
            const look =
              k === 'passed'
                ? 'border-jade/40 text-jade'
                : k === 'notYet'
                  ? 'border-coral/40 text-coral'
                  : 'border-line text-muted'
            return (
              <span key={a.id} className={`rounded-full border px-2.5 py-0.5 text-[13px] ${look}`}>
                {a.title}: {k === 'passed' ? 'passed' : k === 'notYet' ? 'not yet' : 'not started'}
              </span>
            )
          })}
          {habits.map((h) => (
            <span key={h} className="rounded-full border border-amethyst/40 px-2.5 py-0.5 text-[13px] text-amethyst">
              {h}
            </span>
          ))}
        </div>
      </div>
      <button onClick={onClear} className="shrink-0 text-sm text-muted hover:text-ink">
        Clear ×
      </button>
    </div>
  )
}

/** one student × one assignment. The word carries the result, so colour is never the only signal. */
function Result({ cell }: { cell: Cell }) {
  if (!cell.best) return <span className="text-sm text-muted">Not started</span>
  const extra = [cell.tries > 1 && `${cell.tries} attempts`, cell.late && 'late'].filter(Boolean)
  return (
    <span className="inline-block text-right">
      <span className={cell.best.passed ? 'text-jade' : 'text-coral'}>
        {cell.best.passed ? 'Passed' : 'Not yet'}{' '}
        <span className="font-num">
          {cell.best.score}/{cell.best.outOf}
        </span>
      </span>
      {extra.length > 0 && (
        <span className={`block text-xs ${cell.late ? 'text-marigold' : 'text-muted'}`}>
          {extra.join(' · ')}
        </span>
      )}
    </span>
  )
}
