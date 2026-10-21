import { useMemo, useState } from 'react'
import { SCENARIOS } from '@/data/scenarios'
import { MODULES } from '@/data/modules'
import { LOAN_ORDER } from '@/data/cases'
import {
  CAN_BE_COUNTED,
  CAN_BE_STRICT,
  encodeSpec,
  focusById,
  focusesFor,
  specPreview,
  specTitle,
  type ScenarioSpec,
} from '@/sim/aim'
import type { Assignment, CohortMember, NewAssignment } from '@/sim/cohort'

/**
 * Setting work: pick a drill, point it at something, choose who gets it.
 *
 * The shape of this form is the argument of issue B11. A teacher cannot write
 * new loan files here — a case written badly in a form at eleven at night
 * teaches the wrong thing very efficiently — but they can take a drill that
 * exists, aim it at the thing one student keeps getting wrong, set how long
 * and how strict it is, and give it to that student and nobody else.
 *
 * The preview line is not decoration. Somebody about to set homework for
 * nineteen people should be able to read what it is without running it.
 */
export function SetWorkForm({
  members,
  assignments,
  onAdd,
  field,
}: {
  members: CohortMember[]
  assignments: Assignment[]
  onAdd: (a: NewAssignment) => void
  /** the host screen's input class, so this looks native to both boards */
  field: string
}) {
  const [refId, setRefId] = useState(ASSIGNABLE[0].refId)
  const [focus, setFocus] = useState<string>('')
  const [count, setCount] = useState<string>('')
  const [hard, setHard] = useState(false)
  const [due, setDue] = useState('')
  const [who, setWho] = useState<'class' | 'some'>('class')
  const [chosen, setChosen] = useState<string[]>([])

  const base = ASSIGNABLE.find((a) => a.refId === refId) ?? ASSIGNABLE[0]
  const isDrill = base.kind === 'drill'
  const focuses = isDrill ? focusesFor(base.refId) : []
  const canCount = CAN_BE_COUNTED.includes(base.refId)
  const canBeStrict = CAN_BE_STRICT.includes(base.refId)

  const spec: ScenarioSpec = {
    drill: base.refId,
    focus: isDrill && focus ? focus : null,
    count: canCount && count ? Number(count) : null,
    hard: canBeStrict && hard,
  }
  const aimedRef = isDrill ? encodeSpec(spec) : base.refId
  const title = isDrill ? specTitle(spec) : base.title

  // how many files a credit-desk run would actually have, so the preview can
  // say "3 files" rather than promising more than the library holds
  const files = useMemo(() => {
    if (!canCount) return 0
    const pool = focusById(spec.focus)?.cases?.filter((id) => LOAN_ORDER.includes(id)) ?? LOAN_ORDER
    return spec.count === null ? pool.length : Math.min(spec.count, pool.length)
  }, [canCount, spec.focus, spec.count])

  const targets = who === 'class' ? [null] : chosen
  // the same thing set twice at the same person doubles the class figures,
  // which is almost always a slip rather than an intention
  const clash = targets.filter((t) =>
    assignments.some((a) => a.refId === aimedRef && (a.forUser ?? null) === t),
  )
  const nobody = who === 'some' && chosen.length === 0
  const blocked = nobody || clash.length === targets.length

  const add = () => {
    if (blocked) return
    for (const t of targets) {
      if (clash.includes(t)) continue
      onAdd({
        kind: base.kind,
        refId: aimedRef,
        title,
        dueAt: due ? new Date(due).toISOString() : null,
        forUser: t,
      })
    }
    setDue('')
    setChosen([])
    setWho('class')
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={refId}
          onChange={(e) => {
            setRefId(e.target.value)
            setFocus('')
            setCount('')
            setHard(false)
          }}
          className={field}
        >
          {ASSIGNABLE.map((a) => (
            <option key={a.refId} value={a.refId}>
              {a.kind === 'drill' ? 'Drill' : 'Module'}: {a.title}
            </option>
          ))}
        </select>

        {focuses.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-muted">
            Aimed at
            <select value={focus} onChange={(e) => setFocus(e.target.value)} className={field}>
              <option value="">Everything it covers</option>
              {focuses.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {canCount && (
          <label className="flex items-center gap-2 text-sm text-muted">
            Files
            <select value={count} onChange={(e) => setCount(e.target.value)} className={field}>
              <option value="">All</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}

        {canBeStrict && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={hard}
              onChange={(e) => setHard(e.target.checked)}
              className="accent-marigold"
            />
            Strict
          </label>
        )}

        <label className="flex items-center gap-2 text-sm text-muted">
          Due
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={field} />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-muted">
          For
          <select
            value={who}
            onChange={(e) => setWho(e.target.value as 'class' | 'some')}
            className={field}
          >
            <option value="class">The whole class</option>
            <option value="some">Chosen students</option>
          </select>
        </label>

        {who === 'some' && (
          <div className="flex flex-wrap gap-1.5">
            {members.map((m) => {
              const on = chosen.includes(m.userId)
              return (
                <button
                  key={m.userId}
                  onClick={() =>
                    setChosen((c) => (on ? c.filter((x) => x !== m.userId) : [...c, m.userId]))
                  }
                  aria-pressed={on}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    on
                      ? 'border-marigold bg-marigold/15 text-marigold'
                      : 'border-line text-muted hover:text-ink'
                  }`}
                >
                  {m.displayName}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={add}
          disabled={blocked}
          className="rounded-md border border-marigold bg-marigold px-4 py-2 text-sm font-semibold text-night transition-colors hover:bg-marigold/90 disabled:cursor-not-allowed disabled:border-line disabled:bg-transparent disabled:text-muted"
        >
          Set it
        </button>
        {nobody && <span className="text-sm text-muted">Choose who it is for.</span>}
        {!nobody && clash.length === targets.length && (
          <span className="text-sm text-muted">
            {who === 'class' ? 'Already set for this class.' : 'Already set for everyone chosen.'}
          </span>
        )}
      </div>

      {/* what they are about to set, before they set it */}
      <p className="border-l-2 border-amethyst pl-3 text-[13px] leading-relaxed text-muted">
        <span className="text-ink">{title}</span>
        {who === 'some' && chosen.length > 0 && (
          <span className="text-ink">
            {' '}
            · for {chosen.length} {chosen.length === 1 ? 'student' : 'students'}
          </span>
        )}
        {isDrill ? `: ${specPreview(spec, files)}` : `: ${MODULE_BLURB[base.refId] ?? 'A module check.'}`}
      </p>
    </div>
  )
}

const ASSIGNABLE = [
  ...SCENARIOS.map((s) => ({ kind: 'drill' as const, refId: s.id, title: s.title })),
  ...MODULES.map((m) => ({ kind: 'module' as const, refId: m.id, title: m.title })),
]

const MODULE_BLURB: Record<string, string> = Object.fromEntries(
  MODULES.map((m) => [m.id, m.blurb]),
)
