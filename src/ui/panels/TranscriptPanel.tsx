import { useState, type ReactNode } from 'react'
import { useGameStore } from '@/state/store'
import { CONCEPTS, getConcept } from '@/data/concepts'
import { MODULES } from '@/data/modules'
import { getCase } from '@/data/cases'
import { moduleProgress } from '@/sim/modules'
import { PixelButton } from '@/ui/components/PixelButton'

/**
 * Step C-g. Everything the education layer knows about this run, on one page,
 * with a plain-text copy for handing in or keeping.
 */
export function TranscriptPanel() {
  const state = useGameStore((s) => s.state)
  const [copied, setCopied] = useState(false)

  const resolved = state.cases.resolved
  const sound = resolved.filter((r) => r.judgement === 'sound').length
  const withPrediction = resolved.filter((r) => r.prediction)
  const predictionRight = withPrediction.filter((r) => r.predictionRight).length
  const modulesPassed = MODULES.filter((m) => moduleProgress(state, m.id).passed)

  const best = [...resolved].sort((a, b) => b.reputationChange - a.reputationChange)[0]
  const worst = [...resolved].sort((a, b) => a.reputationChange - b.reputationChange)[0]
  const titleOf = (id: string) => getCase(id)?.title ?? id

  const text = [
    `NOVUS — report card`,
    `${state.player.name}, Finance Intern · Level ${state.player.level} · Day ${state.clock.day}`,
    ``,
    `Concepts learned: ${state.learned.length}/${CONCEPTS.length}`,
    `  ${state.learned.map((id) => getConcept(id)?.label ?? id).join(', ') || '—'}`,
    ``,
    `Credit decisions: ${resolved.length} (${sound} sound, ${resolved.length - sound} unsound)`,
    withPrediction.length
      ? `Risk reads: ${predictionRight}/${withPrediction.length} right`
      : `Risk reads: none committed`,
    ``,
    `Modules passed: ${modulesPassed.length}/${MODULES.length}`,
    ...MODULES.map((m) => {
      const p = moduleProgress(state, m.id)
      return `  ${p.passed ? '✓' : p.started ? '·' : ' '} ${m.title}${
        p.score !== undefined ? ` — best ${Math.round(p.score * 100)}%` : ''
      }`
    }),
    ``,
    `Mistakes logged: ${state.mistakes.length}`,
  ].join('\n')

  const copy = () => {
    void navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      },
      () => {},
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-[11px] text-marigold uppercase">Report card</h3>
          <p className="font-display text-[9px] text-muted uppercase">
            {state.player.name} · Level {state.player.level} · Day {state.clock.day}
          </p>
        </div>
        <PixelButton onClick={copy}>{copied ? 'Copied' : 'Copy'}</PixelButton>
      </div>

      <Section title={`Concepts — ${state.learned.length}/${CONCEPTS.length}`}>
        {state.learned.length === 0 ? (
          <p className="text-xs text-muted">Nothing unlocked yet.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {state.learned.map((id) => (
              <span key={id} className="border border-line px-1.5 py-0.5 text-[10px] text-muted">
                {getConcept(id)?.label ?? id}
              </span>
            ))}
          </div>
        )}
      </Section>

      <Section title={`Credit decisions — ${resolved.length}`}>
        <p className="text-xs text-muted">
          <span className="text-jade">{sound} sound</span>,{' '}
          <span className="text-coral">{resolved.length - sound} unsound</span>.
          {withPrediction.length > 0 && (
            <>
              {' '}Risk reads {predictionRight}/{withPrediction.length} right.
            </>
          )}
        </p>
        {best && best.reputationChange > 0 && (
          <p className="mt-1 text-xs text-muted">
            Best call: <span className="text-ink">{titleOf(best.caseId)}</span> — {best.judgement},{' '}
            {best.outcome === 'good' ? 'paid off' : 'went bad but was defensible'}.
          </p>
        )}
        {worst && worst.reputationChange < 0 && (
          <p className="text-xs text-muted">
            Worst call: <span className="text-ink">{titleOf(worst.caseId)}</span> — {worst.judgement}.
          </p>
        )}
      </Section>

      <Section title={`Modules — ${modulesPassed.length}/${MODULES.length} passed`}>
        <ul className="space-y-0.5 text-xs">
          {MODULES.map((m) => {
            const p = moduleProgress(state, m.id)
            return (
              <li key={m.id} className="flex justify-between gap-2">
                <span className={p.passed ? 'text-jade' : p.started ? 'text-marigold' : 'text-muted'}>
                  {p.passed ? '▪' : '▫'} {m.title}
                </span>
                {p.score !== undefined && (
                  <span className="font-num text-muted">{Math.round(p.score * 100)}%</span>
                )}
              </li>
            )
          })}
        </ul>
      </Section>

      <Section title={`Mistakes — ${state.mistakes.length} logged`}>
        {state.mistakes.length === 0 ? (
          <p className="text-xs text-muted">Clean sheet so far.</p>
        ) : (
          <p className="text-xs text-muted">See the Mistakes tab for the log and any pattern.</p>
        )}
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-2 border-line bg-panel-3 p-3">
      <div className="mb-1 font-display text-[9px] text-muted uppercase">{title}</div>
      {children}
    </div>
  )
}
