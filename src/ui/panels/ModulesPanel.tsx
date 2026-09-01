import { useState } from 'react'
import { useGameStore } from '@/state/store'
import { MODULES, getModule } from '@/data/modules'
import {
  PASS_MARK,
  moduleProgress,
  scoreQuiz,
  markModuleStarted,
  recordAttempt,
} from '@/sim/modules'
import { getConcept } from '@/data/concepts'
import { playSound } from '@/lib/sound'
import { PixelButton } from '@/ui/components/PixelButton'

/**
 * Step C-f. The course. A list of modules, each opening to its blurb, the
 * concepts it covers, what to do in-game, and a short check. Failing blocks
 * nothing — retake it.
 */
export function ModulesPanel() {
  const [openId, setOpenId] = useState<string | null>(null)
  const modules = useGameStore((s) => s.state.modules)

  if (openId) {
    return <ModuleDetail id={openId} onBack={() => setOpenId(null)} />
  }

  const passed = MODULES.filter((m) => modules[m.id]?.passed).length

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        <span className="font-num text-ink">
          {passed}/{MODULES.length}
        </span>{' '}
        modules passed. Each ends with a short check — 60% to clear it, retake as often as you like.
      </p>
      <ul className="space-y-2">
        {MODULES.map((m) => {
          const p = moduleProgress(useGameStore.getState().state, m.id)
          return (
            <li key={m.id}>
              <button
                onClick={() => setOpenId(m.id)}
                className="w-full border-2 border-line bg-panel-3 p-3 text-left hover:border-marigold"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-[11px] text-ink">{m.title}</h3>
                  <span
                    className={`font-display text-[9px] uppercase ${
                      p.passed ? 'text-jade' : p.started ? 'text-marigold' : 'text-muted'
                    }`}
                  >
                    {p.passed
                      ? `Passed ${Math.round((p.score ?? 0) * 100)}%`
                      : p.started
                        ? 'In progress'
                        : 'Not started'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">{m.blurb}</p>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ModuleDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const load = useGameStore((s) => s.load)
  const module = getModule(id)
  const [quizOpen, setQuizOpen] = useState(false)
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    module ? module.quiz.map(() => null) : [],
  )
  const [result, setResult] = useState<number | null>(null)

  if (!module) return null
  const p = moduleProgress(useGameStore.getState().state, id)

  const open = () => {
    load(markModuleStarted(useGameStore.getState().state, id))
    setResult(null)
    setAnswers(module.quiz.map(() => null))
    setQuizOpen(true)
  }

  const submit = () => {
    const score = scoreQuiz(module, answers)
    load(recordAttempt(useGameStore.getState().state, id, score))
    setResult(score)
    playSound(score >= PASS_MARK ? 'caseGood' : 'caseBad')
  }

  const allAnswered = answers.every((a) => a !== null)

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="border border-line px-2 py-1 font-display text-[9px] text-muted uppercase hover:text-ink"
      >
        ← All modules
      </button>

      <div>
        <h3 className="font-display text-[11px] text-marigold uppercase">{module.title}</h3>
        <p className="mt-1 text-sm text-ink">{module.blurb}</p>
      </div>

      <div>
        <div className="mb-1 font-display text-[9px] text-muted uppercase">Concepts</div>
        <div className="flex flex-wrap gap-1.5">
          {module.concepts.map((c) => (
            <span key={c} className="border border-line px-1.5 py-0.5 text-[10px] text-muted">
              {getConcept(c)?.label ?? c}
            </span>
          ))}
        </div>
      </div>

      <div className="border-l-2 border-marigold pl-3">
        <div className="font-display text-[9px] text-marigold uppercase">What to do</div>
        <p className="text-xs text-muted">{module.doWhat}</p>
      </div>

      {!quizOpen ? (
        <PixelButton tone="primary" onClick={open}>
          {p.passed ? 'Retake the check' : 'Take the check'}
        </PixelButton>
      ) : (
        <div className="space-y-4">
          {module.quiz.map((q, qi) => (
            <div key={qi}>
              <p className="mb-1 text-sm text-ink">
                {qi + 1}. {q.q}
              </p>
              <div className="flex flex-col gap-1">
                {q.options.map((opt, oi) => {
                  const picked = answers[qi] === oi
                  const showRight = result !== null && oi === q.answer
                  const showWrong = result !== null && picked && oi !== q.answer
                  return (
                    <button
                      key={oi}
                      disabled={result !== null}
                      onClick={() =>
                        setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))
                      }
                      className={`border-2 px-2 py-1 text-left text-xs transition-colors ${
                        showRight
                          ? 'border-jade text-jade'
                          : showWrong
                            ? 'border-coral text-coral'
                            : picked
                              ? 'border-marigold text-marigold'
                              : 'border-line text-muted hover:text-ink'
                      }`}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {result === null ? (
            <PixelButton tone="primary" onClick={submit} disabled={!allAnswered}>
              Submit
            </PixelButton>
          ) : (
            <div
              className={`border-l-2 pl-3 ${result >= PASS_MARK ? 'border-jade' : 'border-coral'}`}
            >
              <div
                className={`font-display text-[10px] uppercase ${
                  result >= PASS_MARK ? 'text-jade' : 'text-coral'
                }`}
              >
                {Math.round(result * 100)}% — {result >= PASS_MARK ? 'passed' : 'not yet'}
              </div>
              <button
                onClick={open}
                className="mt-1 text-[10px] text-amethyst underline hover:text-marigold"
              >
                Retake
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
