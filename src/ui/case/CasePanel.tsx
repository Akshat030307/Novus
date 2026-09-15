import { useEffect, useState, type ReactNode } from 'react'
import type {
  AllocationCase,
  BuildingId,
  FinancialCase,
  LoanCase,
  PatternCase,
  ResolvedCase,
} from '@/sim/types'
import { useGameStore, useUiStore } from '@/state/store'
import { useSettingsStore } from '@/state/settings'
import { rupees } from '@/lib/format'
import { playSound } from '@/lib/sound'
import { CASE_ORDER, atBuilding, getCase } from '@/data/cases'
import { resolveCase, explainCase, riskRead, type CaseRatio } from '@/sim/cases'
import { checkQuests } from '@/sim/quests'
import { checkConcepts } from '@/sim/concepts'
import { skillLevel } from '@/sim/progression'
import { isTired } from '@/sim/energy'
import { useCaseIntro, useCaseExplanation } from '@/ui/hooks/useFlavour'
import { getCasebookEntry } from '@/data/casebook'
import { AllocationBar, type Slice } from '@/ui/components/AllocationBar'
import { PixelButton } from '@/ui/components/PixelButton'
import { Explain } from '@/ui/components/Explain'

const VERDICT_TONE: Record<CaseRatio['verdict'], string> = {
  strong: 'text-jade',
  ok: 'text-muted',
  weak: 'text-coral',
}

/** the ratio labels explainCase writes, mapped to their Ledger card */
const RATIO_CONCEPT: Record<string, string> = {
  'Debt-service cover': 'debt-service-cover',
  'Operating margin': 'margin',
  'Debt / annual profit': 'leverage',
  'Collateral / existing debt': 'collateral-cover',
  'Credit score': 'credit-score',
  'Biggest single name': 'diversification',
  'Biggest sector': 'diversification',
  'Sectors covered': 'diversification',
}

const KIND_LABEL: Record<FinancialCase['kind'], string> = {
  loan: 'Credit file',
  allocation: 'Portfolio review',
  pattern: 'Compliance referral',
}

const SLICE_CLS = [
  'bg-marigold',
  'bg-amethyst',
  'bg-jade',
  'bg-coral',
  'bg-marigold/50',
  'bg-amethyst/50',
  'bg-jade/50',
  'bg-coral/50',
]

/**
 * Step 10, widened by issue B4. Pick a file, read the evidence, make the call,
 * then see the outcome and an explanation that points back at what you read.
 * The score is on the reasoning, not the dice.
 *
 * Three kinds of file now, and each reads differently: a loan is a table of
 * figures, a book is an allocation, a compliance referral is a set of accounts
 * you have to tick the tells on before you decide. `building` filters the desk
 * to what is actually in front of you — the Bank has no books and the Exchange
 * has no borrowers.
 */
export function CasePanel({ building }: { building?: BuildingId } = {}) {
  const openCaseId = useGameStore((s) => s.state.cases.openCaseId)
  const resolved = useGameStore((s) => s.state.cases.resolved)
  const skills = useGameStore((s) => s.state.player.skills)
  const assist = useSettingsStore((s) => s.assist)
  const apply = useGameStore((s) => s.apply)
  const load = useGameStore((s) => s.load)
  const pushLevelUps = useUiStore((s) => s.pushLevelUps)
  const tired = useGameStore((s) => isTired(s.state.player))
  const [choice, setChoice] = useState<string | null>(null)
  const [predRisk, setPredRisk] = useState<'low' | 'mid' | 'high' | null>(null)
  const [predNote, setPredNote] = useState('')
  const [flags, setFlags] = useState<string[]>([])
  /** game minute the file was opened, for the rushed-read energy cost (A2) */
  const [openedAt, setOpenedAt] = useState<number | null>(null)

  const resetForm = () => {
    setChoice(null)
    setPredRisk(null)
    setPredNote('')
    setFlags([])
  }

  const openCase = openCaseId ? getCase(openCaseId) : undefined
  const openResolved = openCaseId ? resolved.find((r) => r.caseId === openCaseId) : undefined
  const intro = useCaseIntro(openCase) // written brief now, AI phrasing if it resolves

  const openFile = (id: string) => {
    resetForm()
    setOpenedAt(useGameStore.getState().state.clock.minute)
    apply((d) => {
      d.cases.openCaseId = id
      return d
    })
  }
  const closeFile = () => {
    resetForm()
    apply((d) => {
      d.cases.openCaseId = null
      return d
    })
  }
  const submit = () => {
    if (!openCase || !choice) return
    const now = useGameStore.getState().state.clock.minute
    const result = resolveCase(useGameStore.getState().state, openCase, {
      choice,
      prediction: predRisk ? { risk: predRisk, note: predNote.trim() || undefined } : undefined,
      flags,
      minutesSpent: openedAt === null ? undefined : Math.max(0, now - openedAt),
    })
    const quested = checkQuests(result.state)
    const concepts = checkConcepts(quested.state)
    load(concepts.state)
    pushLevelUps([...result.levelUps, ...quested.levelUps])
    resetForm()
    setOpenedAt(null)
  }

  /* ---------- list ---------- */
  if (!openCase) {
    const here = building ? atBuilding(building).map((c) => c.id) : CASE_ORDER
    const done = new Set(resolved.map((r) => r.caseId))
    const pending = here.filter((id) => !done.has(id))
    const closed = resolved.filter((r) => here.includes(r.caseId))
    return (
      <div className="space-y-4 p-4">
        <div>
          <div className="mb-2 font-display text-[9px] text-muted uppercase">
            {building === 'exchange'
              ? 'Books in for review'
              : building === 'risk'
                ? 'Referred to compliance'
                : "On the manager's desk"}
          </div>
          {pending.length === 0 ? (
            <p className="text-sm text-muted">Nothing waiting here right now.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {pending.map((id) => {
                const fc = getCase(id)!
                return (
                  <button
                    key={id}
                    onClick={() => openFile(id)}
                    className="border-2 border-line px-3 py-2 text-left text-sm text-ink hover:border-marigold"
                  >
                    <span className="block font-display text-[9px] text-muted uppercase">
                      {KIND_LABEL[fc.kind]}
                    </span>
                    {fc.title}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {closed.length > 0 && (
          <div>
            <div className="mb-2 font-display text-[9px] text-muted uppercase">Resolved</div>
            <div className="flex flex-col gap-1">
              {closed.map((r, i) => (
                <button
                  key={`${r.caseId}-${i}`}
                  onClick={() => openFile(r.caseId)}
                  className="flex items-center justify-between gap-2 border border-line/50 px-3 py-1.5 text-left text-xs hover:border-line"
                >
                  <span className="text-muted">{getCase(r.caseId)?.title ?? r.caseId}</span>
                  <span className={r.judgement === 'sound' ? 'text-jade' : 'text-coral'}>
                    {r.judgement === 'sound' ? '✓ sound call' : '✕ unsound call'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ---------- outcome + explanation ---------- */
  if (openResolved) {
    return <Outcome fc={openCase} r={openResolved} onDone={closeFile} />
  }

  /* ---------- decide ---------- */
  const toggleFlag = (id: string) =>
    setFlags((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="font-display text-[9px] text-amethyst uppercase">
            {KIND_LABEL[openCase.kind]}
          </span>
          <h3 className="font-display text-[11px] text-marigold uppercase">{openCase.title}</h3>
          <p className="font-display text-[9px] text-muted uppercase">At the {openCase.building}</p>
        </div>
        <button
          onClick={closeFile}
          className="shrink-0 border border-line px-2 py-1 font-display text-[9px] text-muted uppercase hover:text-ink"
        >
          Close
        </button>
      </div>

      <p className="text-sm text-ink">{intro}</p>

      {openCase.kind === 'loan' && <LoanEvidence fc={openCase} />}
      {openCase.kind === 'allocation' && <BookEvidence fc={openCase} />}
      {openCase.kind === 'pattern' && (
        <PatternEvidence fc={openCase} picked={flags} onToggle={toggleFlag} />
      )}

      {tired && (
        <div className="border-l-2 border-coral bg-panel-3 py-2 pl-3 pr-2">
          <div className="font-display text-[9px] text-coral uppercase">Running on fumes</div>
          <p className="mt-0.5 text-xs text-muted">
            Nothing is jumping out at you. The figures are all still there — you just have to work
            them yourself. A break at the Cafeteria would help.
          </p>
        </div>
      )}

      {!tired && openCase.kind === 'loan' && (
        <LoanAids fc={openCase} assist={assist} skills={skills} />
      )}
      {!tired && (assist || skillLevel(skills.risk) >= 2) && (
        <Aid tag={skillLevel(skills.risk) >= 2 ? 'Unlocked · Risk 2' : 'Assist'}>
          {riskRead(openCase)}
        </Aid>
      )}

      <div>
        <div className="mb-1 font-display text-[9px] text-muted uppercase">
          Your read <span className="text-muted/60">· optional, before you decide</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['low', 'mid', 'high'] as const).map((band) => (
            <button
              key={band}
              onClick={() => setPredRisk((b) => (b === band ? null : band))}
              className={`border-2 px-3 py-1.5 font-display text-[10px] uppercase transition-colors ${
                predRisk === band
                  ? 'border-amethyst text-amethyst'
                  : 'border-line text-muted hover:text-ink'
              }`}
            >
              {band === 'low' ? 'Low <20%' : band === 'mid' ? 'Mid 20–40%' : 'High >40%'}
            </button>
          ))}
          <input
            value={predNote}
            onChange={(e) => setPredNote(e.target.value)}
            maxLength={80}
            placeholder="why? (one line)"
            className="min-w-0 flex-1 border-2 border-line bg-night px-2 py-1.5 text-xs text-ink
              placeholder:text-muted/50 focus:border-amethyst focus:outline-none"
          />
        </div>
      </div>

      <div>
        <div className="mb-2 font-display text-[9px] text-muted uppercase">Your call</div>
        <div className="flex flex-wrap gap-2">
          {openCase.choices.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setChoice(ch.id)}
              title={ch.detail}
              className={`border-2 px-3 py-2 font-display text-[10px] uppercase transition-colors ${
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

      <div className="flex items-center gap-3">
        <PixelButton tone="primary" onClick={submit} disabled={!choice}>
          Submit decision
        </PixelButton>
        <span className="text-xs text-muted">
          {choice
            ? (openCase.choices.find((c) => c.id === choice)?.detail ?? '')
            : 'The outcome is a roll — the score is on your reasoning.'}
        </span>
      </div>
    </div>
  )
}

/* ---------- evidence, one body per kind ---------- */

function LoanEvidence({ fc }: { fc: LoanCase }) {
  const f = fc.figures
  const rows: [string, string][] = [
    ['Annual revenue', rupees(f.revenue)],
    ['Annual expenses', rupees(f.expenses)],
    ['Existing debt', rupees(f.existingDebt)],
    ['Interest paid (yr)', rupees(f.interestPaid)],
    ['Operating cash flow', rupees(f.cashFlow)],
    ['Credit score', String(f.creditScore)],
    ['Collateral value', rupees(f.collateralValue)],
    ['Sector', f.sector],
  ]
  return (
    <div>
      <div className="mb-1 font-display text-[9px] text-muted uppercase">On the file</div>
      <dl className="grid grid-cols-2 gap-x-6 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-line/50 py-1">
            <dt className="text-muted">{k}</dt>
            <dd className="font-num text-ink capitalize">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/**
 * A book is shown as an allocation, not a list, because the whole point is
 * that counting the rows tells you nothing. The bar is what the mandate is
 * really about.
 */
function BookEvidence({ fc }: { fc: AllocationCase }) {
  const total = fc.book.reduce((t, b) => t + b.value, 0)
  const slices: Slice[] = fc.book.map((b, i) => ({
    label: b.name,
    value: b.value,
    cls: SLICE_CLS[i % SLICE_CLS.length],
  }))

  return (
    <div className="space-y-3">
      <div className="border-2 border-line bg-panel-3 p-3">
        <div className="mb-2 flex justify-between font-display text-[9px] text-muted uppercase">
          <span>The book</span>
          <span className="font-num">{rupees(total, { short: true })}</span>
        </div>
        <AllocationBar slices={slices} />
      </div>

      <div>
        <div className="mb-1 font-display text-[9px] text-muted uppercase">Holdings</div>
        <ul className="divide-y divide-line/50 text-sm">
          {fc.book.map((b) => (
            <li key={b.name} className="flex items-baseline gap-2 py-1.5">
              <span className="flex-1 text-ink">
                {b.name}
                {b.note && <span className="block text-[10px] text-muted">{b.note}</span>}
              </span>
              <span className="text-xs text-muted capitalize">{b.sector}</span>
              <span className="w-24 text-right font-num text-xs text-ink">{rupees(b.value)}</span>
              <span className="w-10 text-right font-num text-xs text-muted">
                {Math.round((b.value / total) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-l-2 border-amethyst pl-3">
        <div className="font-display text-[9px] text-amethyst uppercase">The mandate</div>
        <ul className="mt-1 space-y-0.5 text-xs text-muted">
          {fc.mandate.map((m) => (
            <li key={m} className="flex gap-2">
              <span className="text-amethyst">▪</span>
              {m}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/**
 * The only kind that asks the player to commit to *which lines* are the tell
 * before they decide. That is the whole exercise — a reviewer who flags
 * everything has flagged nothing, so the decoys count against you.
 */
function PatternEvidence({
  fc,
  picked,
  onToggle,
}: {
  fc: PatternCase
  picked: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 font-display text-[9px] text-muted uppercase">The accounts</div>
        <dl className="text-sm">
          {fc.accounts.map((a) => (
            <div key={a.label} className="flex justify-between gap-4 border-b border-line/50 py-1">
              <dt className="text-muted">
                {a.label}
                {a.note && <span className="block text-[10px] text-muted/70">{a.note}</span>}
              </dt>
              <dd className="shrink-0 font-num text-ink">{a.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <div className="mb-1 font-display text-[9px] text-muted uppercase">
          What is the tell? <span className="text-muted/60">· tick only what the lines support</span>
        </div>
        <ul className="space-y-1">
          {fc.flags.map((flag) => {
            const on = picked.includes(flag.id)
            return (
              <li key={flag.id}>
                <button
                  onClick={() => onToggle(flag.id)}
                  className={`flex w-full items-start gap-2 border-2 px-2 py-1.5 text-left text-xs transition-colors ${
                    on ? 'border-marigold text-marigold' : 'border-line text-muted hover:text-ink'
                  }`}
                >
                  <span className="mt-px font-num">{on ? '[x]' : '[ ]'}</span>
                  <span>{flag.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <p className="mt-1 text-[10px] text-muted">
          {picked.length} ticked. Flagging everything is the same as flagging nothing.
        </p>
      </div>
    </div>
  )
}

function LoanAids({
  fc,
  assist,
  skills,
}: {
  fc: LoanCase
  assist: boolean
  skills: Record<string, number>
}) {
  const f = fc.figures
  return (
    <>
      {(assist || skillLevel(skills.accounting) >= 2) && (
        <Aid tag={skillLevel(skills.accounting) >= 2 ? 'Unlocked · Accounting 2' : 'Assist'}>
          <Explain id="debt-service-cover">Debt-service cover</Explain>{' '}
          <span className="font-num text-ink">
            {f.interestPaid > 0 ? (f.cashFlow / f.interestPaid).toFixed(1) : '—'}×
          </span>{' '}
          — cash flow ÷ interest already paid.
        </Aid>
      )}
      {(assist || skillLevel(skills.analysis) >= 3) && (
        <Aid tag={skillLevel(skills.analysis) >= 3 ? 'Unlocked · Analysis 3' : 'Assist'}>
          <Explain id="leverage">Leverage</Explain>{' '}
          <span className="font-num text-ink">
            {f.revenue - f.expenses > 0
              ? (f.existingDebt / (f.revenue - f.expenses)).toFixed(1)
              : '—'}
          </span>{' '}
          years of profit would clear the existing debt.
        </Aid>
      )}
    </>
  )
}

/* ---------- outcome ---------- */

function Outcome({
  fc,
  r,
  onDone,
}: {
  fc: FinancialCase
  r: ResolvedCase
  onDone: () => void
}) {
  const ex = explainCase(fc, r)
  const explanation = useCaseExplanation(fc, r, ex.drivers)

  // the cue is on the reasoning, not the dice — a sound call chimes even if it defaulted
  useEffect(() => {
    playSound(r.judgement === 'sound' ? 'caseGood' : 'caseBad')
  }, [r.caseId, r.judgement])

  const stoodAside =
    fc.kind === 'loan'
      ? r.choice === 'reject'
      : Boolean(fc.choices.find((c) => c.id === r.choice)?.guards)
  // "came apart" and "would have come apart" are not the same word
  const bad = fc.kind === 'loan' ? 'Defaulted' : 'Came apart'
  const good = fc.kind === 'loan' ? 'Repaid' : 'Held'
  const moneyLabel = stoodAside
    ? r.outcome === 'good'
      ? `Would have ${fc.kind === 'loan' ? 'defaulted' : 'come apart'}`
      : `Would have ${fc.kind === 'loan' ? 'repaid' : 'held'}`
    : r.outcome === 'good'
      ? good
      : bad
  const moneyTone = r.outcome === 'good' ? 'text-jade' : 'text-coral'
  const delta = (n: number) => `${n > 0 ? '+' : ''}${n}`
  const cash = `${r.cashChange < 0 ? '-' : '+'}${rupees(Math.abs(r.cashChange))}`

  return (
    <div className="anim-rise space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-[11px] text-marigold uppercase">{fc.title}</h3>
        <button
          onClick={onDone}
          className="shrink-0 border border-line px-2 py-1 font-display text-[9px] text-muted uppercase hover:text-ink"
        >
          Done
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className={`border-2 border-current px-2 py-1 font-display text-[10px] uppercase ${moneyTone}`}>
          {moneyLabel}
        </span>
        <span
          className={`border-2 border-current px-2 py-1 font-display text-[10px] uppercase ${
            r.judgement === 'sound' ? 'text-jade' : 'text-coral'
          }`}
        >
          {r.judgement === 'sound' ? '✓ Sound call' : '✕ Unsound call'}
        </span>
        {r.prediction && (
          <span
            className={`border-2 border-current px-2 py-1 font-display text-[10px] uppercase ${
              r.predictionRight ? 'text-jade' : 'text-coral'
            }`}
          >
            Read {r.predictionRight ? 'right' : 'off'}
          </span>
        )}
        {r.flagScore && (
          <span
            className={`border-2 border-current px-2 py-1 font-display text-[10px] uppercase ${
              r.flagScore.found === r.flagScore.of && r.flagScore.wrong === 0
                ? 'text-jade'
                : 'text-marigold'
            }`}
          >
            {r.flagScore.found}/{r.flagScore.of} tells
            {r.flagScore.wrong > 0 && ` · ${r.flagScore.wrong} off`}
          </span>
        )}
      </div>

      {r.prediction && <PredictionLine r={r} realRisk={ex.realRisk} />}

      <p className="text-sm text-ink">{explanation}</p>

      <div className="grid grid-cols-3 gap-3">
        <Delta label="Cash" value={cash} tone={r.cashChange >= 0 ? 'text-jade' : 'text-coral'} />
        <Delta label="XP" value={delta(r.xpChange)} tone="text-marigold" />
        <Delta
          label="Reputation"
          value={delta(r.reputationChange)}
          tone={r.reputationChange >= 0 ? 'text-jade' : 'text-coral'}
        />
      </div>

      {ex.ratios.length > 0 && (
        <div>
          <div className="mb-1 font-display text-[9px] text-muted uppercase">
            What the numbers said
          </div>
          <dl className="grid grid-cols-2 gap-x-6 text-sm">
            {ex.ratios.map((ratio) => {
              const conceptId = RATIO_CONCEPT[ratio.label]
              return (
                <div key={ratio.label} className="flex justify-between border-b border-line/50 py-1">
                  <dt className="text-muted">
                    {conceptId ? <Explain id={conceptId}>{ratio.label}</Explain> : ratio.label}
                  </dt>
                  <dd className={`font-num ${VERDICT_TONE[ratio.verdict]}`}>{ratio.value}</dd>
                </div>
              )
            })}
          </dl>
        </div>
      )}

      {fc.kind === 'pattern' && fc.truth.echoes && <SeenBefore casebookId={fc.truth.echoes} />}

      {ex.flags && (
        <div>
          <div className="mb-1 font-display text-[9px] text-muted uppercase">
            Which of those were really tells
          </div>
          <ul className="space-y-1 text-xs">
            {ex.flags.map((f) => (
              <li key={f.label} className="flex items-start gap-2">
                <span className={`font-num ${f.real ? 'text-jade' : 'text-muted'}`}>
                  {f.real ? '✓' : '·'}
                </span>
                <span className={f.real ? 'text-ink' : 'text-muted'}>
                  {f.label}
                  {!f.real && <span className="text-muted/70"> — odd, but not evidence</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <div className="mb-1 font-display text-[9px] text-muted uppercase">What drove the risk</div>
        <ul className="space-y-1 text-sm text-muted">
          {ex.drivers.map((d) => (
            <li key={d} className="flex gap-2">
              <span className="text-marigold">▪</span>
              {d}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">
          {ex.riskLabel}: {Math.round(ex.realRisk * 100)}%.
        </p>
      </div>
    </div>
  )
}

/**
 * Issue B5. The invented file, and the real one it was built from.
 *
 * Shown only on the outcome screen. Naming the event on the decide screen
 * would hand over the answer — the whole exercise is spotting the shape
 * without being told whose shape it is.
 */
function SeenBefore({ casebookId }: { casebookId: string }) {
  const entry = getCasebookEntry(casebookId)
  const setCasebookEntry = useUiStore((s) => s.setCasebookEntry)
  const setOpenBuilding = useUiStore((s) => s.setOpenBuilding)
  if (!entry) return null

  return (
    <div className="border-2 border-amethyst bg-panel-3 p-3">
      <div className="font-display text-[9px] text-amethyst uppercase">You have seen this before</div>
      <p className="mt-1 text-xs text-ink">
        {entry.title} · {entry.year}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">{entry.oneLine}</p>
      <button
        onClick={() => {
          setCasebookEntry(entry.id)
          setOpenBuilding('academy')
        }}
        className="mt-2 font-display text-[9px] text-amethyst uppercase underline hover:text-marigold"
      >
        Read what actually happened →
      </button>
    </div>
  )
}

function Delta({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="border-2 border-line bg-night px-3 py-2">
      <div className="font-display text-[9px] text-muted uppercase">{label}</div>
      <div className={`font-num text-sm ${tone}`}>{value}</div>
    </div>
  )
}

const BAND_LABEL = { low: 'low risk (under 20%)', mid: 'mid risk (20–40%)', high: 'high risk (over 40%)' }

/** the "you called it…" line on the outcome screen (C-d) */
function PredictionLine({ r, realRisk }: { r: ResolvedCase; realRisk: number }) {
  const p = r.prediction!
  const pct = Math.round(realRisk * 100)
  return (
    <div className="border-l-2 border-amethyst pl-3">
      <div className="font-display text-[9px] text-amethyst uppercase">Your read</div>
      <p className="text-xs text-muted">
        You called it {BAND_LABEL[p.risk]}
        {p.note ? ` — “${p.note}”` : ''}. The file was {pct}%.{' '}
        {r.predictionRight
          ? 'Well judged, whichever way the roll went.'
          : 'Worth sitting with why the figures pointed the other way.'}
      </p>
    </div>
  )
}

/** a hint on the decide screen — from a skill unlock, or from the Assist setting */
function Aid({ tag, children }: { tag: string; children: ReactNode }) {
  return (
    <div className="border-l-2 border-marigold pl-3">
      <div className="font-display text-[9px] text-marigold uppercase">{tag}</div>
      <p className="text-xs text-muted">{children}</p>
    </div>
  )
}
