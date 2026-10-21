import { useMemo, useState } from 'react'
import { LOAN_ORDER, getCase } from '@/data/cases'
import { encodeSpec, focusById, plainSpec, type ScenarioSpec } from '@/sim/aim'
import { judgeChoice, gradePrediction } from '@/sim/cases'
import { rupees } from '@/lib/format'
import { logAttempt } from '@/state/attempts'
import { PixelButton } from '@/ui/components/PixelButton'

type Band = 'low' | 'mid' | 'high'
interface Turn {
  sound: boolean
  readRight: boolean
}

/**
 * Loan files, back to back. Pure — no store, no rng, no outcome roll. The
 * finished run is logged as one attempt (issue B2); the files themselves still
 * touch nothing in the save.
 *
 * `spec` is how a teacher aims it (issue B11): which files it draws on, how
 * many, and whether the risk read has to be right as well as the call. With no
 * spec it is the five files it always was.
 */
export function CreditDeskDrill({ spec = plainSpec('credit-desk') }: { spec?: ScenarioSpec }) {
  const [i, setI] = useState(0)
  const [band, setBand] = useState<Band | null>(null)
  const [choice, setChoice] = useState<string | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])

  // the files this run draws on. A focus narrows the pool; a count trims it.
  // Both are clamped to what exists, so a teacher asking for eight files out
  // of five gets five rather than an error.
  const files = useMemo(() => {
    const focus = focusById(spec.focus)
    const pool = focus?.cases?.filter((id) => LOAN_ORDER.includes(id)) ?? LOAN_ORDER
    const wanted = spec.count === null ? pool.length : Math.min(spec.count, pool.length)
    return pool.slice(0, Math.max(1, wanted))
  }, [spec.focus, spec.count])

  const done = turns.length === files.length

  if (done) {
    const sound = turns.filter((t) => t.sound).length
    const reads = turns.filter((t) => t.readRight).length
    const cleared = passedRun(turns, spec)
    return (
      <div className="space-y-3">
        <div className={`border-l-2 pl-3 ${cleared ? 'border-jade' : 'border-marigold'}`}>
          <div className="text-[13px] font-semibold uppercase tracking-wide text-ink">
            {sound}/{files.length} sound · {reads}/{files.length} reads right
          </div>
          <p className="mt-1 text-[14px] text-muted">
            {cleared
              ? 'Clean sweep. The reasoning held on every file.'
              : spec.hard && sound === files.length
                ? 'Every call was sound, but this run was set strict — the risk read has to be right too.'
                : 'Look back at the ones that slipped — the figures were all on the file.'}
          </p>
        </div>
        <PixelButton
          onClick={() => {
            setI(0)
            setBand(null)
            setChoice(null)
            setTurns([])
          }}
        >
          Run it again
        </PixelButton>
      </div>
    )
  }

  const fc = getCase(files[i])
  // LOAN_ORDER only holds loan files, but the narrowing has to be written out —
  // the library stopped being all loans at issue B4
  if (!fc || fc.kind !== 'loan') return null
  const f = fc.figures
  const rows: [string, string][] = [
    ['Annual revenue', rupees(f.revenue)],
    ['Annual expenses', rupees(f.expenses)],
    ['Existing debt', rupees(f.existingDebt)],
    ['Interest paid (yr)', rupees(f.interestPaid)],
    ['Operating cash flow', rupees(f.cashFlow)],
    ['Credit score', String(f.creditScore)],
    ['Collateral value', rupees(f.collateralValue)],
  ]

  const submit = () => {
    if (!choice) return
    const sound = judgeChoice(fc, choice) === 'sound'
    const readRight = band ? gradePrediction({ risk: band }, fc.truth.defaultRisk) : false
    const next = [...turns, { sound, readRight }]
    setTurns(next)
    // one attempt per completed run, logged from `next` rather than from state:
    // reading `turns` here would be one file behind
    if (next.length === files.length) {
      logAttempt({
        kind: 'drill',
        // the aimed refId, so this run is tracked as the thing that was set
        refId: encodeSpec(spec),
        score: next.filter((t) => t.sound).length,
        outOf: files.length,
        passed: passedRun(next, spec),
        detail: { readsRight: next.filter((t) => t.readRight).length },
      })
    }
    setI((n) => n + 1)
    setBand(null)
    setChoice(null)
  }

  return (
    <div className="space-y-3">
      <div className="text-[12px] text-muted font-semibold uppercase tracking-wide">
        File {i + 1} of {files.length} · {fc.title}
      </div>
      <p className="text-[15px] text-ink">{fc.brief}</p>

      <dl className="grid grid-cols-2 gap-x-6 text-[15px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-line/50 py-1">
            <dt className="text-muted">{k}</dt>
            <dd className="font-num text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      <div>
        <div className="mb-1 text-[12px] text-muted font-semibold uppercase tracking-wide">Your read</div>
        <div className="flex gap-2">
          {(['low', 'mid', 'high'] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBand((x) => (x === b ? null : b))}
              className={`border-2 px-2 py-1 font-display text-[12px] uppercase ${
                band === b ? 'border-amethyst text-amethyst' : 'border-line text-muted hover:text-ink'
              }`}
            >
              {b === 'low' ? '<20%' : b === 'mid' ? '20–40%' : '>40%'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 text-[12px] text-muted font-semibold uppercase tracking-wide">Your call</div>
        <div className="flex flex-wrap gap-2">
          {fc.choices.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setChoice(ch.id)}
              className={`border-2 px-2 py-1 font-display text-[12px] uppercase ${
                choice === ch.id
                  ? 'border-marigold text-marigold'
                  : 'border-line text-muted hover:text-ink'
              }`}
            >
              {ch.label}
            </button>
          ))}
        </div>
      </div>

      <PixelButton tone="primary" onClick={submit} disabled={!choice}>
        Next file
      </PixelButton>
    </div>
  )
}

/**
 * Did the run clear? Normally every call has to be sound. Set strict, the risk
 * read has to be right as well — approving a file for the wrong reason is a
 * guess that happened to land, and this is the one place that can say so.
 */
function passedRun(turns: Turn[], spec: ScenarioSpec): boolean {
  const sound = turns.every((t) => t.sound)
  return spec.hard ? sound && turns.every((t) => t.readRight) : sound
}
