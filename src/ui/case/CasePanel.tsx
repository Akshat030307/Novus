import { useEffect, useState } from 'react'
import type { FinancialCase, ResolvedCase } from '@/sim/types'
import { useGameStore, useUiStore } from '@/state/store'
import { rupees } from '@/lib/format'
import { playSound } from '@/lib/sound'
import { CASE_ORDER, getCase } from '@/data/cases'
import { resolveCase, explainCase, riskRead, type CaseRatio } from '@/sim/cases'
import { checkQuests } from '@/sim/quests'
import { skillLevel } from '@/sim/progression'
import { useCaseIntro, useCaseExplanation } from '@/ui/hooks/useFlavour'
import { PixelButton } from '@/ui/components/PixelButton'

const VERDICT_TONE: Record<CaseRatio['verdict'], string> = {
  strong: 'text-jade',
  ok: 'text-muted',
  weak: 'text-coral',
}

/**
 * Step 10. Pick a file, read the figures, make the call, then see the outcome
 * and an explanation that points back at those figures. The score is on the
 * reasoning, not the dice.
 */
export function CasePanel() {
  const openCaseId = useGameStore((s) => s.state.cases.openCaseId)
  const resolved = useGameStore((s) => s.state.cases.resolved)
  const skills = useGameStore((s) => s.state.player.skills)
  const apply = useGameStore((s) => s.apply)
  const load = useGameStore((s) => s.load)
  const pushLevelUps = useUiStore((s) => s.pushLevelUps)
  const [choice, setChoice] = useState<string | null>(null)

  const openCase = openCaseId ? getCase(openCaseId) : undefined
  const openResolved = openCaseId ? resolved.find((r) => r.caseId === openCaseId) : undefined
  const intro = useCaseIntro(openCase) // written brief now, AI phrasing if it resolves

  const openFile = (id: string) => {
    setChoice(null)
    apply((d) => {
      d.cases.openCaseId = id
      return d
    })
  }
  const closeFile = () => {
    setChoice(null)
    apply((d) => {
      d.cases.openCaseId = null
      return d
    })
  }
  const submit = () => {
    if (!openCase || !choice) return
    const result = resolveCase(useGameStore.getState().state, openCase, choice)
    const quested = checkQuests(result.state)
    load(quested.state)
    pushLevelUps([...result.levelUps, ...quested.levelUps])
    setChoice(null)
  }

  /* ---------- list ---------- */
  if (!openCase) {
    const done = new Set(resolved.map((r) => r.caseId))
    const pending = CASE_ORDER.filter((id) => !done.has(id))
    return (
      <div className="space-y-4 p-4">
        <div>
          <div className="mb-2 font-display text-[9px] text-muted uppercase">On the manager's desk</div>
          {pending.length === 0 ? (
            <p className="text-sm text-muted">
              Nothing on the desk right now — more files come with the quests (step 12).
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {pending.map((id) => (
                <button
                  key={id}
                  onClick={() => openFile(id)}
                  className="border-2 border-line px-3 py-2 text-left text-sm text-ink hover:border-marigold"
                >
                  {getCase(id)!.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {resolved.length > 0 && (
          <div>
            <div className="mb-2 font-display text-[9px] text-muted uppercase">Resolved</div>
            <div className="flex flex-col gap-1">
              {resolved.map((r, i) => (
                <button
                  key={`${r.caseId}-${i}`}
                  onClick={() => openFile(r.caseId)}
                  className="flex items-center justify-between gap-2 border border-line/50 px-3 py-1.5 text-left text-xs hover:border-line"
                >
                  <span className="text-muted">{getCase(r.caseId)?.title ?? r.caseId}</span>
                  <span className={r.judgement === 'sound' ? 'text-jade' : 'text-coral'}>
                    {r.judgement === 'sound' ? 'sound call' : 'unsound call'}
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
  const f = openCase.figures
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
    <div className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
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

      {skillLevel(skills.accounting) >= 2 && (
        <div className="border-l-2 border-marigold pl-3">
          <div className="font-display text-[9px] text-marigold uppercase">Unlocked · Accounting 2</div>
          <p className="text-xs text-muted">
            Debt-service cover{' '}
            <span className="font-num text-ink">
              {f.interestPaid > 0 ? (f.cashFlow / f.interestPaid).toFixed(1) : '—'}×
            </span>{' '}
            — cash flow ÷ interest already paid.
          </p>
        </div>
      )}
      {skillLevel(skills.risk) >= 2 && (
        <div className="border-l-2 border-marigold pl-3">
          <div className="font-display text-[9px] text-marigold uppercase">Unlocked · Risk 2</div>
          <p className="text-xs text-muted">{riskRead(openCase)}</p>
        </div>
      )}
      {skillLevel(skills.analysis) >= 3 && (
        <div className="border-l-2 border-marigold pl-3">
          <div className="font-display text-[9px] text-marigold uppercase">Unlocked · Analysis 3</div>
          <p className="text-xs text-muted">
            Leverage{' '}
            <span className="font-num text-ink">
              {f.revenue - f.expenses > 0
                ? (f.existingDebt / (f.revenue - f.expenses)).toFixed(1)
                : '—'}
            </span>{' '}
            years of profit would clear the existing debt.
          </p>
        </div>
      )}

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

  const lent = r.choice !== 'reject'
  const moneyLabel = lent
    ? r.outcome === 'good'
      ? 'Repaid'
      : 'Defaulted'
    : r.outcome === 'good'
      ? 'Would have defaulted'
      : 'Would have repaid'
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
          {r.judgement === 'sound' ? 'Sound call' : 'Unsound call'}
        </span>
      </div>

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

      <div>
        <div className="mb-1 font-display text-[9px] text-muted uppercase">What the numbers said</div>
        <dl className="grid grid-cols-2 gap-x-6 text-sm">
          {ex.ratios.map((ratio) => (
            <div key={ratio.label} className="flex justify-between border-b border-line/50 py-1">
              <dt className="text-muted">{ratio.label}</dt>
              <dd className={`font-num ${VERDICT_TONE[ratio.verdict]}`}>{ratio.value}</dd>
            </div>
          ))}
        </dl>
      </div>

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
          Real default risk on this file: {Math.round(ex.realRisk * 100)}%.
        </p>
      </div>
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
