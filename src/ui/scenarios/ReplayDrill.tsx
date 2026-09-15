import { useState } from 'react'
import { getReplay, type ReplayStep } from '@/data/replays'
import { getCasebookEntry } from '@/data/casebook'
import { useUiStore } from '@/state/store'
import { logAttempt } from '@/state/attempts'
import { PixelButton } from '@/ui/components/PixelButton'

/**
 * Issue B7. A concluded event, walked forward one decision at a time.
 *
 * The design rule is the one the subject demands: the player is marked on
 * whether the call was defensible **on what was knowable at that step**, never
 * on whether it matched the ending. A drill that rewarded hindsight would
 * teach the opposite of what a historical replay is for.
 *
 * So each step commits before it reveals, the reveal always comes with the
 * reasoning rather than just the result, and the source card is one click away
 * throughout — nothing here is asserted that the Casebook cannot back.
 */
export function ReplayDrill({ replayId }: { replayId: string }) {
  const replay = getReplay(replayId)
  const setCasebookEntry = useUiStore((s) => s.setCasebookEntry)
  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [right, setRight] = useState<boolean[]>([])

  if (!replay) return null
  const done = right.length === replay.steps.length
  const entry = getCasebookEntry(replay.casebookId)

  const reveal = () => {
    if (!picked) return
    const ok = replay.steps[step].defensible.includes(picked)
    const next = [...right, ok]
    setRight(next)
    setRevealed(true)
    if (next.length === replay.steps.length) {
      logAttempt({
        kind: 'drill',
        refId: replay.id,
        score: next.filter(Boolean).length,
        outOf: replay.steps.length,
        passed: next.every(Boolean),
        detail: { steps: replay.steps.length },
      })
    }
  }

  const advance = () => {
    setStep((n) => n + 1)
    setPicked(null)
    setRevealed(false)
  }

  const restart = () => {
    setStep(0)
    setPicked(null)
    setRevealed(false)
    setRight([])
  }

  const header = (
    <div className="space-y-2">
      <div className="border-l-2 border-coral bg-panel-3 py-2 pl-3 pr-2 text-[10px] leading-relaxed text-muted">
        {replay.caution}
        {entry && (
          <>
            {' '}
            <button
              onClick={() => setCasebookEntry(entry.id)}
              className="text-amethyst underline hover:text-marigold"
            >
              Every fact here is on the {entry.title} card →
            </button>
          </>
        )}
      </div>
      <p className="text-xs text-muted">{replay.role}</p>
    </div>
  )

  if (done && revealed && step === replay.steps.length - 1) {
    const score = right.filter(Boolean).length
    return (
      <div className="space-y-3">
        {header}
        <Reveal step={replay.steps[step]} ok={right[step]} />
        <div
          className={`border-l-2 pl-3 ${score === replay.steps.length ? 'border-jade' : 'border-marigold'}`}
        >
          <div className="font-display text-[10px] uppercase text-ink">
            {score}/{replay.steps.length} calls defensible at the time
          </div>
          <p className="mt-1 text-xs text-muted">
            {score === replay.steps.length
              ? 'Every call held up on what was on the table when you made it. That is the only standard anyone can be held to.'
              : 'Go back over the ones that slipped — not because of how it ended, but because of what was already published when you decided.'}
          </p>
        </div>
        <PixelButton onClick={restart}>Run it again</PixelButton>
      </div>
    )
  }

  const s = replay.steps[step]

  return (
    <div className="space-y-3">
      {header}

      <div className="font-display text-[9px] text-muted uppercase">
        Step {step + 1} of {replay.steps.length} · {s.when}
      </div>

      <div>
        <div className="mb-1 font-display text-[9px] text-muted uppercase">Public at this point</div>
        <ul className="space-y-1 text-sm text-ink">
          {s.known.map((k) => (
            <li key={k} className="flex gap-2">
              <span className="text-marigold">▪</span>
              {k}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-sm text-ink">{s.question}</p>

      <div className="flex flex-col gap-1">
        {s.options.map((o) => {
          const isPicked = picked === o.id
          const good = revealed && s.defensible.includes(o.id)
          const badPick = revealed && isPicked && !s.defensible.includes(o.id)
          return (
            <button
              key={o.id}
              disabled={revealed}
              onClick={() => setPicked(o.id)}
              className={`border-2 px-2 py-1.5 text-left text-xs transition-colors ${
                good
                  ? 'border-jade text-jade'
                  : badPick
                    ? 'border-coral text-coral'
                    : isPicked
                      ? 'border-marigold text-marigold'
                      : 'border-line text-muted hover:text-ink'
              }`}
            >
              {revealed && (good ? '✓ ' : badPick ? '✕ ' : '  ')}
              {o.label}
            </button>
          )
        })}
      </div>

      {!revealed ? (
        <PixelButton tone="primary" onClick={reveal} disabled={!picked}>
          Commit and see what happened
        </PixelButton>
      ) : (
        <>
          <Reveal step={s} ok={right[step]} />
          {step < replay.steps.length - 1 && <PixelButton onClick={advance}>Next</PixelButton>}
        </>
      )}
    </div>
  )
}

function Reveal({ step, ok }: { step: ReplayStep; ok: boolean }) {
  return (
    <div className={`border-l-2 pl-3 ${ok ? 'border-jade' : 'border-coral'}`}>
      <div className={`font-display text-[9px] uppercase ${ok ? 'text-jade' : 'text-coral'}`}>
        {ok ? '✓ Defensible at the time' : '✕ Not supported by what was known then'}
      </div>
      <p className="mt-1 text-xs text-ink">{step.outcome}</p>
      <p className="mt-1 text-xs text-muted">{step.note}</p>
    </div>
  )
}
