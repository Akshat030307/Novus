import { dueState, workFor, type SetWork } from '@/sim/cohort'

/**
 * "Your class set this, and it is due on Friday" — wherever the work is
 * actually done, rather than only in the Class tab.
 *
 * A badge, never a lock. A class can ask for something by a date; it cannot
 * close a drill, and a player in no class sees none of this. That is the only
 * difference between playing in a class and playing alone.
 */
export function SetWorkBadge({
  work,
  refId,
  passed,
  now = new Date().toISOString(),
}: {
  work: SetWork[]
  refId: string
  passed: boolean
  now?: string
}) {
  const mine = workFor(work, refId)
  if (!mine) return null

  const state = dueState(mine, passed, now)
  const tone =
    state === 'done'
      ? 'border-jade text-jade'
      : state === 'overdue'
        ? 'border-coral text-coral'
        : 'border-marigold text-marigold'

  const due = mine.dueAt
    ? new Date(mine.dueAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : null

  return (
    <span
      title={`Set by ${mine.cohortName}`}
      className={`shrink-0 border px-1.5 py-0.5 font-display text-[11px] uppercase ${tone}`}
    >
      {state === 'done'
        ? 'Set · done'
        : state === 'overdue'
          ? `Set · was due ${due}`
          : due
            ? `Set · due ${due}`
            : 'Set by your class'}
    </span>
  )
}

/**
 * The line above a list of work. It exists to answer the question a student
 * actually has — "do I have to do these?" — in one sentence, and to say
 * plainly that nobody playing alone has to do anything.
 */
export function SetWorkNote({
  work,
  inAClass,
  kind,
}: {
  work: SetWork[]
  inAClass: boolean
  kind: 'drills' | 'modules'
}) {
  if (!inAClass) {
    return (
      <p className="border-l-2 border-line pl-3 text-[14px] text-muted">
        You are not in a class, so nothing here is set for you — every {kind.slice(0, -1)} is open,
        in any order, as often as you like.
      </p>
    )
  }
  if (work.length === 0) {
    return (
      <p className="border-l-2 border-line pl-3 text-[14px] text-muted">
        Your class has not set any {kind} yet. Everything here is still open to practise.
      </p>
    )
  }
  const names = [...new Set(work.map((w) => w.cohortName))]
  return (
    <p className="border-l-2 border-marigold pl-3 text-[14px] text-muted">
      <span className="font-num text-ink">{work.length}</span> of these{' '}
      {work.length === 1 ? 'is' : 'are'} set by {names.join(' and ')}. A deadline is a date, not a
      lock — you can do anything here whenever you like, and retake it.
    </p>
  )
}
