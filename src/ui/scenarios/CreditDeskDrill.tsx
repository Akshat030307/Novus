import { useState } from 'react'
import { LOAN_ORDER, getCase } from '@/data/cases'
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
 * Five loan files, back to back. Pure — no store, no rng, no outcome roll.
 * The finished run is logged as one attempt (issue B2); the files themselves
 * still touch nothing in the save.
 */
export function CreditDeskDrill() {
  const [i, setI] = useState(0)
  const [band, setBand] = useState<Band | null>(null)
  const [choice, setChoice] = useState<string | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])

  const done = turns.length === LOAN_ORDER.length

  if (done) {
    const sound = turns.filter((t) => t.sound).length
    const reads = turns.filter((t) => t.readRight).length
    return (
      <div className="space-y-3">
        <div
          className={`border-l-2 pl-3 ${sound === LOAN_ORDER.length ? 'border-jade' : 'border-marigold'}`}
        >
          <div className="font-display text-[10px] uppercase text-ink">
            {sound}/{LOAN_ORDER.length} sound · {reads}/{LOAN_ORDER.length} reads right
          </div>
          <p className="mt-1 text-xs text-muted">
            {sound === LOAN_ORDER.length
              ? 'Clean sweep. The reasoning held on every file.'
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

  const fc = getCase(LOAN_ORDER[i])
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
    if (next.length === LOAN_ORDER.length) {
      logAttempt({
        kind: 'drill',
        refId: 'credit-desk',
        score: next.filter((t) => t.sound).length,
        outOf: LOAN_ORDER.length,
        passed: next.every((t) => t.sound),
        detail: { readsRight: next.filter((t) => t.readRight).length },
      })
    }
    setI((n) => n + 1)
    setBand(null)
    setChoice(null)
  }

  return (
    <div className="space-y-3">
      <div className="font-display text-[9px] text-muted uppercase">
        File {i + 1} of {LOAN_ORDER.length} · {fc.title}
      </div>
      <p className="text-sm text-ink">{fc.brief}</p>

      <dl className="grid grid-cols-2 gap-x-6 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-line/50 py-1">
            <dt className="text-muted">{k}</dt>
            <dd className="font-num text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      <div>
        <div className="mb-1 font-display text-[9px] text-muted uppercase">Your read</div>
        <div className="flex gap-2">
          {(['low', 'mid', 'high'] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBand((x) => (x === b ? null : b))}
              className={`border-2 px-2 py-1 font-display text-[9px] uppercase ${
                band === b ? 'border-amethyst text-amethyst' : 'border-line text-muted hover:text-ink'
              }`}
            >
              {b === 'low' ? '<20%' : b === 'mid' ? '20–40%' : '>40%'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 font-display text-[9px] text-muted uppercase">Your call</div>
        <div className="flex flex-wrap gap-2">
          {fc.choices.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setChoice(ch.id)}
              className={`border-2 px-2 py-1 font-display text-[9px] uppercase ${
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
