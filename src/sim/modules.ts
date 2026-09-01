import type { GameState, ModuleProgress } from '@/sim/types'
import type { Module } from '@/data/modules'

/**
 * Step C-f. Scoring and progress for the Academy modules. Pure — the panel
 * owns the quiz UI, this owns the numbers. Failing the check blocks nothing
 * (docs/education.md principle 2); it just withholds the pass.
 */
export const PASS_MARK = 0.6

const BLANK: ModuleProgress = { started: false, passed: false }

export function moduleProgress(state: GameState, id: string): ModuleProgress {
  return state.modules[id] ?? BLANK
}

/** fraction of questions answered correctly */
export function scoreQuiz(module: Module, answers: (number | null)[]): number {
  if (module.quiz.length === 0) return 0
  const right = module.quiz.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0)
  return right / module.quiz.length
}

export function markModuleStarted(state: GameState, id: string): GameState {
  const cur = moduleProgress(state, id)
  if (cur.started) return state
  return { ...state, modules: { ...state.modules, [id]: { ...cur, started: true } } }
}

/** record an attempt: keep the best score, pass sticks once earned */
export function recordAttempt(state: GameState, id: string, score: number): GameState {
  const cur = moduleProgress(state, id)
  const best = Math.max(cur.score ?? 0, score)
  return {
    ...state,
    modules: {
      ...state.modules,
      [id]: { started: true, passed: cur.passed || score >= PASS_MARK, score: best },
    },
  }
}
