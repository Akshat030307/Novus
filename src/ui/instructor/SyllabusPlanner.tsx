import { useEffect, useMemo, useRef, useState } from 'react'
import SAMPLE from '@/data/sample-syllabus.json'
import { planCourse, planToAssignments, type SyllabusRead } from '@/sim/syllabus'
import type { Assignment, NewAssignment } from '@/sim/cohort'
import { latestRead, pollRead, startRead } from '@/state/syllabus'

/**
 * Syllabus to term plan (issue B13).
 *
 * Paste the link to a college syllabus; the TinyFish Agent opens it in a
 * browser and reads every course and unit; Novus turns one course into a
 * week-by-week plan of modules and drills, each with the syllabus words that
 * matched it. Nothing is set until the teacher presses the button.
 *
 * In the sample class the read is one that was done ahead of time and
 * shipped, so the demo costs nothing; a real class reads live.
 */

const field =
  'rounded-md border border-line bg-panel px-3 py-2 text-[15px] text-ink placeholder:text-muted/60 focus:border-marigold focus:outline-none'

/** the Monday on or after today, as YYYY-MM-DD for a date input */
function nextMonday(now = new Date()) {
  const d = new Date(now)
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7))
  return d.toISOString().slice(0, 10)
}
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function SyllabusPlanner({
  mode,
  assignments,
  onAdd,
}: {
  mode: 'live' | 'sample'
  assignments: Assignment[]
  onAdd: (a: NewAssignment) => void
}) {
  const [read, setRead] = useState<SyllabusRead | null>(mode === 'sample' ? (SAMPLE as SyllabusRead) : null)
  const [url, setUrl] = useState('')
  const [runId, setRunId] = useState<string | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [left, setLeft] = useState<number | null>(null)

  // a reload picks up the last read, finished or still running, at no cost
  useEffect(() => {
    if (mode !== 'live') return
    void latestRead().then((r) => {
      if (!r) return
      setUrl(r.url)
      if (r.status === 'done' && r.result) setRead(r.result)
      if (r.status === 'running') setRunId(r.id)
    })
  }, [mode])

  // watch a running read: ask every six seconds, show the clock in between
  const timer = useRef<number | null>(null)
  useEffect(() => {
    if (!runId) return
    let alive = true
    const tick = async () => {
      const s = await pollRead(runId)
      if (!alive) return
      if (s.status === 'running') {
        setSeconds(s.seconds)
        timer.current = window.setTimeout(tick, 6000)
      } else if (s.status === 'done') {
        setRead(s.result)
        setRunId(null)
      } else {
        setError(s.error)
        setRunId(null)
      }
    }
    void tick()
    const clock = window.setInterval(() => setSeconds((n) => n + 1), 1000)
    return () => {
      alive = false
      if (timer.current) window.clearTimeout(timer.current)
      window.clearInterval(clock)
    }
  }, [runId])

  const start = async () => {
    setError(null)
    const r = await startRead(url)
    if (!r.ok) return setError(r.error)
    setRead(null)
    setSeconds(0)
    setLeft(r.remainingToday)
    setRunId(r.id)
  }

  return (
    <section className="rounded-lg border border-line bg-panel-2 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold text-iris">Plan from a syllabus</h3>
        <span className="text-xs text-muted">Read by the TinyFish Agent · matched to Novus by rule</span>
      </div>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Paste the link to your course's syllabus. TinyFish opens it in a browser and reads every course and
        unit; Novus turns one course into a week-by-week plan of modules and drills, showing the syllabus
        words behind every match. Nothing is set until you press the button.
      </p>

      {mode === 'live' ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-college.ac.in/syllabus/bcom-sem-3.pdf"
            className={`min-w-0 flex-1 ${field}`}
            disabled={Boolean(runId)}
          />
          <button
            onClick={() => void start()}
            disabled={!url.trim() || Boolean(runId)}
            className="rounded-md border border-marigold bg-marigold px-4 py-2 text-sm font-semibold text-night hover:bg-marigold/90 disabled:cursor-not-allowed disabled:border-line disabled:bg-transparent disabled:text-muted"
          >
            Read with TinyFish
          </button>
        </div>
      ) : (
        <p className="mt-3 rounded-md border border-line bg-panel px-3 py-2 text-sm text-muted">
          This is a real syllabus, read once by the TinyFish Agent and kept for the demo:{' '}
          <a href={(SAMPLE as SyllabusRead).url} target="_blank" rel="noreferrer" className="text-iris underline">
            {(SAMPLE as SyllabusRead).institution}
          </a>
          . In a real class at /teach, the same button reads any link you paste, live.
        </p>
      )}

      {runId && (
        <div className="mt-4 rounded-md border border-iris/40 bg-iris/10 px-4 py-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 animate-pulse rounded-full bg-iris" />
            <span className="text-ink">
              TinyFish is reading the syllabus in a browser · <span className="font-num">{mmss(seconds)}</span>
            </span>
          </div>
          <p className="mt-1 text-muted">
            It opens the document and goes through every page. This usually takes three to ten minutes; you
            can keep working and it will appear here.{left !== null && ` ${left} reads left today.`}
          </p>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-coral">{error}</p>}

      {read && <Plan read={read} assignments={assignments} onAdd={onAdd} />}
    </section>
  )
}

function Plan({ read, assignments, onAdd }: { read: SyllabusRead; assignments: Assignment[]; onAdd: (a: NewAssignment) => void }) {
  // start on the course Novus can do the most with
  const best = useMemo(
    () => {
      const n = (i: number) => planCourse(read.courses[i], { already: assignments }).items.length
      return read.courses.reduce((b, _c, i) => (n(i) > n(b) ? i : b), 0)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [read],
  )
  const [pick, setPick] = useState(best)
  const [hours, setHours] = useState(4)
  const [start, setStart] = useState(nextMonday())
  const [dropped, setDropped] = useState<Set<string>>(new Set())
  const [setCount, setSetCount] = useState<number | null>(null)
  useEffect(() => setPick(best), [best])

  const course = read.courses[pick] ?? read.courses[0]
  const plan = useMemo(() => planCourse(course, { hoursPerWeek: hours, already: assignments }), [course, hours, assignments])
  const keyOf = (i: number) => `${pick}:${i}`
  const chosen = plan.items.filter((_, i) => !dropped.has(keyOf(i)))

  const setAll = () => {
    const due = planToAssignments({ ...plan, items: chosen }, new Date(`${start}T00:00:00`))
    due.forEach(onAdd)
    setSetCount(due.length)
    setDropped(new Set())
  }

  return (
    <div className="mt-5 border-t border-line pt-4">
      <div className="text-sm text-muted">
        <span className="text-ink">{read.institution || 'Syllabus'}</span>
        {read.programme && ` · ${read.programme}`} · {read.courses.length} courses read
        {read.readAt && ` on ${new Date(read.readAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
        <label className="flex items-center gap-2">
          Course
          <select value={pick} onChange={(e) => { setPick(Number(e.target.value)); setDropped(new Set()); setSetCount(null) }} className={field}>
            {read.courses.map((c, i) => (
              <option key={i} value={i}>
                {c.title}{c.semester ? ` (${c.semester})` : ''} · {planCourse(c, { already: assignments }).items.length} to set
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          Starts
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={field} />
        </label>
        <label className="flex items-center gap-2">
          Teaching hours a week
          <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className={field}>
            {[2, 3, 4, 5, 6].map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </label>
      </div>

      {plan.items.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          Nothing in Novus covers this course. Novus teaches lending, cash and leverage, markets and portfolios; this
          course is about something else, and the plan says so rather than inventing a match.
        </p>
      ) : (
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="w-10 py-2"></th><th className="w-16">Week</th><th>Unit</th><th>Novus sets</th><th>Matched on</th>
            </tr>
          </thead>
          <tbody>
            {plan.items.map((it, i) => {
              const off = dropped.has(keyOf(i))
              return (
                <tr key={i} className={`border-b border-line/60 align-top ${off ? 'opacity-40' : ''}`}>
                  <td className="py-2.5">
                    <input
                      type="checkbox"
                      checked={!off}
                      onChange={() => setDropped((d) => { const n = new Set(d); n.has(keyOf(i)) ? n.delete(keyOf(i)) : n.add(keyOf(i)); return n })}
                      className="accent-marigold"
                      aria-label={`Include ${it.target.title}`}
                    />
                  </td>
                  <td className="py-2.5 font-num text-ink">{it.week}</td>
                  <td className="py-2.5 pr-4 text-muted">{it.unit}</td>
                  <td className="py-2.5 pr-4">
                    <span className="text-ink">{it.target.title}</span>
                    <span className="ml-2 text-xs text-muted">{it.target.kind === 'drill' ? 'Drill' : 'Module'}</span>
                    <span className="block text-xs text-muted">{it.target.why}</span>
                  </td>
                  <td className="py-2.5">
                    <span className="flex flex-wrap gap-1">
                      {it.matchedOn.map((w) => (
                        <span key={w} className="rounded-full border border-iris/40 px-2 py-0.5 text-xs text-iris">{w}</span>
                      ))}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {plan.alreadySet.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          Already covered by work this class has set: {plan.alreadySet.join('; ')}.
        </p>
      )}
      {plan.unmatched.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          Not covered by Novus, left to your own teaching: {plan.unmatched.join('; ')}.
        </p>
      )}

      {plan.items.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={setAll}
            disabled={chosen.length === 0}
            className="rounded-md border border-marigold bg-marigold px-4 py-2 text-sm font-semibold text-night hover:bg-marigold/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Set {chosen.length} for the class
          </button>
          <span className="text-sm text-muted">
            Over {plan.weeks} weeks, each due the Friday of its week.
          </span>
          {setCount !== null && <span className="text-sm text-jade">Set {setCount}. They are in the list above.</span>}
        </div>
      )}
    </div>
  )
}
