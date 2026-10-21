import { useEffect, useMemo, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cloudEnabled, sendMagicLink, signOut } from '@/lib/supabase'
import { useAuthStore } from '@/state/auth'
import {
  assignmentBreakdown,
  buildRows,
  classTotals,
  HABITS,
  resultOf,
  toCsv,
  whatToTeachNext,
  type Assignment,
  type Cell,
  type CohortMember,
  type NewAssignment,
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
import { useSampleClass } from '@/state/sampleClass'
import { StudentReport } from '@/ui/instructor/StudentReport'
import { SetWorkForm } from '@/ui/instructor/SetWorkForm'
import { ClassBoards } from '@/ui/panels/ClassBoards'
import type { BoardMember } from '@/sim/leaderboard'
import { DemoLogin, demoUnlocked } from '@/ui/instructor/DemoLogin'
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
  // the demo dashboard sits behind a gate so a stray visitor does not land in
  // it mid-presentation; it is a stage prop, not security — see DemoLogin
  const [unlocked, setUnlocked] = useState(demoUnlocked)

  return (
    <div className="teach-root flex h-full flex-col bg-night font-ui text-[15px] leading-relaxed text-ink">
      <header className="shrink-0 border-b border-line bg-panel-2 print:hidden">
        <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
          <a href="/teach" className="flex items-baseline gap-2">
            <span className="font-display text-sm text-marigold">NOVUS</span>
            <span className="text-sm text-muted">for teachers</span>
          </a>
          <nav className="flex items-center gap-5 text-sm">
            <a href="/play" className="text-muted hover:text-ink">
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
        {sampling && (unlocked ? <SampleClass /> : <DemoLogin onUnlock={() => setUnlocked(true)} />)}
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
          Create a class, set modules and drills, and see what your students are getting wrong, from
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
            <p className="text-ink">Check your email. The link signs you straight back in here.</p>
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

function CohortView({ cohort, onBack }: { cohort: Cohort; onBack: () => void }) {
  const [members, setMembers] = useState<CohortMember[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [attempts, setAttempts] = useState<(Attempt & { userId: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [seenAt, setSeenAt] = useState<number | null>(null)
  const [live, setLive] = useState(false)

  const refresh = async (quiet = false) => {
    if (!quiet) setLoading(true)
    const [m, a] = await Promise.all([listMembers(cohort.id), listAssignments(cohort.id)])
    setMembers(m)
    setAssignments(a)
    setAttempts(await cohortAttempts(m.map((x) => x.userId)))
    setSeenAt(Date.now())
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohort.id])

  /**
   * Watch the class while it works. Off by default — a dashboard that polls
   * all afternoon is somebody's bill — but with a room watching, a student
   * finishing a drill should appear without anyone reloading anything.
   * The refetch is quiet: no loading state, so nothing flickers mid-sentence.
   */
  useEffect(() => {
    if (!live) return
    const t = setInterval(() => void refresh(true), 10_000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, cohort.id])

  const assign = async (a: NewAssignment) => {
    await addAssignment(cohort.id, a)
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
      onAssign={(a) => void assign(a)}
      watch={{ live, setLive, seenAt, refresh: () => void refresh(true) }}
      setWork={
        <Card>
          <SectionTitle
            accent="text-marigold"
            note="Drills and module checks, aimed where you want them. Students see them in the game under Academy → Drills."
          >
            Set work
          </SectionTitle>
          <SetWorkForm
            members={members}
            assignments={assignments}
            onAdd={(a) => void assign(a)}
            field={field}
          />
          <AssignmentList
            assignments={assignments}
            members={members}
            onRemove={(id) => void removeAssignment(id).then(() => refresh())}
          />
        </Card>
      }
    />
  )
}

/**
 * The sample class, editable.
 *
 * Still invented, still nowhere near the database — but every control works,
 * and what a teacher does here survives a reload because state/sampleClass.ts
 * keeps it in this browser. It is the product with the data made up, rather
 * than a picture of the product.
 */
function SampleClass() {
  const c = useSampleClass()
  const [renaming, setRenaming] = useState(false)
  const [draftName, setDraftName] = useState(c.name)

  const actions: BoardActions = {
    renameClass: (n) => c.rename(n),
    removeStudent: (id) => c.removeStudent(id),
    addAssignment: (a) => c.addAssignment(a),
    updateAssignment: (id, patch) => c.updateAssignment(id, patch),
    removeAssignment: (id) => c.removeAssignment(id),
    moveAssignment: (id, by) => c.moveAssignment(id, by),
    reset: () => c.reset(),
  }

  return (
    <ClassBoard
      name={c.name}
      joinCode={null}
      badge={
        <span
          className="rounded-full border border-marigold/50 bg-marigold/10 px-2.5 py-0.5 text-[13px] font-medium text-marigold"
          title="An invented class shown through exactly the same page a real class gets. Everything works; nothing leaves this browser."
        >
          Sample data, not real students
        </span>
      }
      back={
        <a href="/teach" className="text-sm text-muted hover:text-ink">
          ← Your classes
        </a>
      }
      members={c.members}
      assignments={c.assignments}
      attempts={c.attempts}
      loading={false}
      actions={actions}
      renaming={{ on: renaming, draft: draftName, setDraft: setDraftName, setOn: setRenaming }}
    />
  )
}

function AssignmentList({
  assignments,
  members = [],
  onRemove,
}: {
  assignments: Assignment[]
  /** so work aimed at one person can say whose it is */
  members?: CohortMember[]
  onRemove?: (id: string) => void
}) {
  if (assignments.length === 0) return null
  const nameOf = (id: string) =>
    members.find((m) => m.userId === id)?.displayName ?? 'one student'
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
            {a.forUser && (
              <span className="ml-2 rounded-full border border-amethyst/50 px-2 py-0.5 text-xs text-amethyst">
                {nameOf(a.forUser)} only
              </span>
            )}
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

/**
 * "Is this live?" — the question a room asks when a dashboard is on a screen.
 *
 * Shows when the figures were last read, refetches on demand, and will watch
 * the class every ten seconds while somebody is actually playing. Polling is
 * opt-in: left on by accident it is a request every ten seconds for as long
 * as the tab is open, and nobody wants that bill for a page nobody is reading.
 */
function Watching({
  live,
  setLive,
  seenAt,
  refresh,
}: {
  live: boolean
  setLive: (v: boolean) => void
  seenAt: number | null
  refresh: () => void
}) {
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 5_000)
    return () => clearInterval(t)
  }, [])

  const ago = seenAt === null ? null : Math.round((Date.now() - seenAt) / 1000)
  const when =
    ago === null ? 'not yet' : ago < 10 ? 'just now' : ago < 90 ? `${ago}s ago` : `${Math.round(ago / 60)}m ago`

  return (
    <div className="flex items-center gap-3 print:hidden">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={live}
          onChange={(e) => setLive(e.target.checked)}
          className="accent-marigold"
        />
        Watch live
      </label>
      <button
        onClick={refresh}
        className="rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:text-ink"
        title="Read the class again now"
      >
        Refresh
      </button>
      <span className={`text-xs ${live ? 'text-jade' : 'text-muted'}`}>read {when}</span>
    </div>
  )
}

type Tab = 'class' | 'student' | 'students' | 'work'

/**
 * Everything below the page header — shared by a real class and the sample.
 *
 * On a landscape screen (xl and up) it is a dashboard that fits the window:
 * a short band of figures, then six cards in a 3 × 2 grid, each chart sized
 * to its card. The long student table and the work form live on their own
 * tabs so nothing has to be scrolled to. Narrower screens stack and scroll.
 */
/** what a board can change, when it is allowed to change anything */
export interface BoardActions {
  renameClass: (name: string) => void
  removeStudent: (userId: string) => void
  addAssignment: (a: NewAssignment) => void
  updateAssignment: (id: string, patch: Partial<Pick<Assignment, 'dueAt' | 'optional'>>) => void
  removeAssignment: (id: string) => void
  moveAssignment: (id: string, by: -1 | 1) => void
  reset: () => void
}

type SortKey = 'name' | 'day' | 'concepts' | 'passed'

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
  onAssign,
  watch,
  actions,
  renaming,
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
  /** the real class passes its own form; the sample builds one from `actions` */
  setWork?: ReactNode
  /** the real class's way of setting work, for the one-click recommendation */
  onAssign?: (a: NewAssignment) => void
  /** live watching, for a real class only — the sample has nothing to wait for */
  watch?: {
    live: boolean
    setLive: (v: boolean) => void
    seenAt: number | null
    refresh: () => void
  }
  /** present when this board may be edited */
  actions?: BoardActions
  renaming?: { on: boolean; draft: string; setDraft: (v: string) => void; setOn: (v: boolean) => void }
}) {
  const rows = useMemo(
    () => buildRows(members, assignments, attempts),
    [members, assignments, attempts],
  )
  const lessons = useMemo(() => whatToTeachNext(rows, assignments), [rows, assignments])
  const totals = useMemo(() => classTotals(rows, assignments), [rows, assignments])
  const breakdowns = useMemo(() => assignmentBreakdown(rows, assignments), [rows, assignments])
  // the same two boards the class sees, built from the summaries already
  // fetched — a teacher should never be shown a ranking their students cannot
  const boardMembers = useMemo<BoardMember[]>(
    () =>
      rows
        .filter((r) => r.member.summary)
        .map((r) => ({
          userId: r.member.userId,
          displayName: r.member.displayName,
          workPassed: r.member.summary!.workPassed ?? r.passed,
          accuracy: r.member.summary!.accuracy ?? null,
          improvement: r.member.summary!.improvement ?? null,
          returnPct: r.member.summary!.returnPct ?? null,
          day: r.member.summary!.day,
        })),
    [rows],
  )
  const [now] = useState(() => Date.now())
  const [tab, setTab] = useState<Tab>('class')

  // one student picked anywhere is highlighted everywhere
  const [focus, setFocus] = useState<string | null>(null)
  // the student whose full history is open, which is not the same as the one
  // the charts are following
  const [detail, setDetail] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('name')
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
  const tableRows = useMemo(() => {
    let out = filter && filterIndex >= 0
      ? rows.filter((r) => resultOf(r.cells[filterIndex]) === filter.kind)
      : rows
    const q = query.trim().toLowerCase()
    if (q) out = out.filter((r) => r.member.displayName.toLowerCase().includes(q))
    const by: Record<SortKey, (r: (typeof rows)[number]) => number | string> = {
      name: (r) => r.member.displayName,
      day: (r) => -(r.member.summary?.day ?? -1),
      concepts: (r) => -(r.member.summary?.conceptsLearned ?? -1),
      passed: (r) => -r.passed,
    }
    return [...out].sort((a, b) => {
      const x = by[sort](a)
      const y = by[sort](b)
      return typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number)
    })
  }, [rows, filter, filterIndex, query, sort])

  // the student whose report is open; the Students table hands over to it
  const openStudent = (userId: string) => {
    setDetail(userId)
    setTab('student')
  }

  const download = () => {
    const csv = toCsv(rows, assignments)
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${name.replace(/[^\w]+/g, '-').toLowerCase()}-results.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  const RESULT_WORD = { passed: 'passed', notYet: 'not yet passed', notStarted: 'not started' } as const
  const hasClass = !loading && members.length > 0

  const title = (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
        {back}
        {renaming?.on ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              actions?.renameClass(renaming.draft)
              renaming.setOn(false)
            }}
          >
            <input
              autoFocus
              value={renaming.draft}
              onChange={(e) => renaming.setDraft(e.target.value)}
              maxLength={60}
              className={`w-[26rem] max-w-full ${field}`}
            />
            <Button variant="primary" type="submit">
              Save
            </Button>
            <button
              type="button"
              onClick={() => renaming.setOn(false)}
              className="text-sm text-muted hover:text-ink"
            >
              Cancel
            </button>
          </form>
        ) : (
          <h1 className="text-xl font-semibold text-ink">{name}</h1>
        )}
        {actions && !renaming?.on && (
          <button
            onClick={() => {
              renaming?.setDraft(name)
              renaming?.setOn(true)
            }}
            className="text-sm text-muted hover:text-ink"
            title="Rename this class"
          >
            Rename
          </button>
        )}
        {badge}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {hasClass && (
          <nav className="flex rounded-lg border border-line bg-panel-2 p-0.5 text-sm" aria-label="Class views">
            {(
              [
                ['class', 'Class report'],
                ['student', 'Student report'],
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
        {watch && <Watching {...watch} />}
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
      {tab === 'student' ? null : focused ? (
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
            value={totals.slots ? `${totals.attempted} of ${totals.slots}` : '-'}
            share={totals.slots ? totals.attempted / totals.slots : undefined}
          />
          <Figure
            tone="text-jade"
            bar="bg-jade"
            label="Work passed"
            value={totals.slots ? `${totals.passed} of ${totals.slots}` : '-'}
            share={totals.slots ? totals.passed / totals.slots : undefined}
            note={totals.late ? `${totals.late} handed in late` : undefined}
          />
        </div>
      )}

      {tab === 'class' && (
        <div className="grid gap-4 lg:grid-cols-2 xl:min-h-0 xl:flex-1 xl:grid-cols-3 xl:overflow-y-auto">
          <ChartCard
            title="Class leaderboard"
            accent="text-marigold"
            note="What your students see of each other. Work on the left, the market on the right."
            bodyHeight="h-96"
            className="xl:col-span-2"
          >
            <div className="absolute inset-0 overflow-y-auto pr-1">
              <ClassBoards members={boardMembers} meId="" hidden={false} heading={false} />
            </div>
          </ChartCard>

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
              <p className="text-sm text-muted">No work set yet. Use the Work set tab.</p>
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

      {tab === 'work' && (
        <div className="xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
          {actions ? (
            <WorkEditor assignments={assignments} members={members} actions={actions} />
          ) : (
            setWork
          )}
        </div>
      )}

      {tab === 'student' && (
        <StudentReport
          rows={rows}
          selected={detail}
          onSelect={setDetail}
          assignments={assignments}
          attempts={attempts}
          onAssign={actions ? (a) => actions.addAssignment(a) : onAssign}
        />
      )}

      {tab === 'students' && (
        <section className="flex flex-col gap-3 xl:min-h-0 xl:flex-1">
          <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a student"
                aria-label="Find a student"
                className={`w-56 ${field}`}
              />
              <label className="flex items-center gap-2 text-sm text-muted">
                Sort
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className={field}
                  aria-label="Sort students"
                >
                  <option value="name">by name</option>
                  <option value="day">by day reached</option>
                  <option value="concepts">by concepts learned</option>
                  <option value="passed">by work passed</option>
                </select>
              </label>
              {query && (
                <button onClick={() => setQuery('')} className="text-sm text-muted hover:text-ink">
                  Clear
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={download} title="Download these results as a spreadsheet">
                Export CSV
              </Button>
              <Button onClick={() => window.print()} title="Print, or save as PDF">
                Print report
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              Click a name to open their full history. The arrow follows them through the charts on
              the Overview.
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
                      className={`group border-b border-line last:border-b-0 ${on ? 'bg-marigold/10' : 'hover:bg-panel-2'}`}
                    >
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2">
                          <button
                            onClick={() => openStudent(row.member.userId)}
                            className={`text-left font-medium hover:underline ${on ? 'text-marigold' : 'text-ink'}`}
                            title="Open this student's report"
                          >
                            {row.member.displayName}
                          </button>
                          <button
                            onClick={() => setFocus(on ? null : row.member.userId)}
                            className={`print:hidden ${on ? 'text-marigold' : 'text-muted hover:text-ink'}`}
                            title={on ? 'Stop following them in the charts' : 'Follow them through the charts'}
                            aria-label="Follow in charts"
                          >
                            →
                          </button>
                          {actions && (
                            <button
                              onClick={() => {
                                if (confirm(`Remove ${row.member.displayName} from this class?`)) {
                                  if (focus === row.member.userId) setFocus(null)
                                  actions.removeStudent(row.member.userId)
                                }
                              }}
                              className="text-muted opacity-0 group-hover:opacity-100 hover:text-coral focus:opacity-100 print:hidden"
                              title="Remove from the class"
                              aria-label={`Remove ${row.member.displayName}`}
                            >
                              ×
                            </button>
                          )}
                        </span>
                        {!s && <span className="block text-xs text-muted">no progress shared yet</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-num text-muted">{s?.day ?? '-'}</td>
                      <td className="px-4 py-2.5 text-right font-num text-muted">
                        {s ? `${s.modulesPassed}/${s.modulesTotal}` : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-num text-muted">
                        {s ? `${s.conceptsLearned}/${s.conceptsTotal}` : '-'}
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
            portfolio, career and any transcript they issue stay private: that is enforced by the
            database, not by this page.
          </p>
        </section>
      )}
    </div>
  )
}

/**
 * Setting work, for a board that may be edited. The real class has its own
 * form (it has to talk to the database); this one edits in place: due dates
 * change where they are shown, and optional work is marked rather than
 * deleted, because "practice, not homework" is a real distinction to a class.
 */
function WorkEditor({
  assignments,
  members,
  actions,
}: {
  assignments: Assignment[]
  members: CohortMember[]
  actions: BoardActions
}) {
  /** <input type="date"> wants YYYY-MM-DD in local time, not an ISO instant */
  const asDateValue = (iso: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle
          accent="text-marigold"
          note="Drills and module checks, aimed where you want them. Students see them in the game under Academy → Drills."
        >
          Set work
        </SectionTitle>
        <SetWorkForm
          members={members}
          assignments={assignments}
          onAdd={(a) => actions.addAssignment(a)}
          field={field}
        />

        {assignments.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Nothing set yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line border-t border-line">
            {assignments.map((a, i) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="min-w-56 flex-1">
                  <span className="text-ink">{a.title}</span>
                  <span className="ml-2 text-sm text-muted">
                    {a.kind === 'drill' ? 'Drill' : 'Module'}
                  </span>
                  {a.optional && (
                    <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-xs text-muted">
                      optional · not counted
                    </span>
                  )}
                  {a.forUser && (
                    <span className="ml-2 rounded-full border border-amethyst/50 px-2 py-0.5 text-xs text-amethyst">
                      {members.find((m) => m.userId === a.forUser)?.displayName ?? 'one student'} only
                    </span>
                  )}
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 text-sm text-muted">
                    Due
                    <input
                      type="date"
                      value={asDateValue(a.dueAt)}
                      onChange={(e) =>
                        actions.updateAssignment(a.id, {
                          dueAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                        })
                      }
                      className={field}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={Boolean(a.optional)}
                      onChange={(e) => actions.updateAssignment(a.id, { optional: e.target.checked })}
                    />
                    Optional
                  </label>
                  <span className="flex items-center">
                    <button
                      onClick={() => actions.moveAssignment(a.id, -1)}
                      disabled={i === 0}
                      className="rounded-md px-2 py-1 text-muted hover:text-ink disabled:opacity-30"
                      aria-label={`Move ${a.title} up`}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => actions.moveAssignment(a.id, 1)}
                      disabled={i === assignments.length - 1}
                      className="rounded-md px-2 py-1 text-muted hover:text-ink disabled:opacity-30"
                      aria-label={`Move ${a.title} down`}
                    >
                      ↓
                    </button>
                  </span>
                  <button
                    onClick={() => actions.removeAssignment(a.id)}
                    className="text-sm text-muted hover:text-coral"
                  >
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <SectionTitle note="Everything on this page is invented and lives only in this browser.">
          The sample class
        </SectionTitle>
        <Button
          onClick={() => {
            if (confirm('Put the sample class back the way it started?')) actions.reset()
          }}
        >
          Reset the sample
        </Button>
      </Card>
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
                {a.title}:{' '}
                {k === 'passed'
                  ? 'passed'
                  : k === 'notYet'
                    ? 'not yet'
                    : k === 'notTheirs'
                      ? 'not set for them'
                      : 'not started'}
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
  // work aimed at somebody else: a dash, not "not started". Holding a student
  // to an assignment that was never theirs is the kind of quiet unfairness a
  // table makes easy.
  if (cell.na) return <span className="text-sm text-muted/50" title="Not set for them">-</span>
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
