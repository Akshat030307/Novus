import type { BuildingId, GameState, LevelUpReport, QuestState } from '@/sim/types'
import { awardProgress } from '@/sim/progression'
import { QUEST_DEFS, getQuestDef } from '@/data/quests'

/**
 * Step 12. A quest is a small state machine: its steps have conditions read off
 * the game state, and completing it pays a reward through progression. Pure and
 * deterministic — no rng. Dialogue options in data/npcs.ts drive the parts the
 * world can't observe on its own (a quest given, a report handed in) via
 * `applyDialogueEffect`.
 */

/* ---------- content shapes (filled in by data/) ---------- */

export type StepCondition =
  | { talked: string }
  | { entered: string }
  | { caseResolved: string }
  | { casesResolvedAtLeast: number }
  | { tradesAtLeast: number }
  | { flag: string }

export interface QuestStepDef {
  id: string
  text: string
  condition: StepCondition
}

export interface QuestDef {
  id: string
  title: string
  building?: BuildingId
  /** starts itself the moment the game begins */
  autoStart?: boolean
  steps: QuestStepDef[]
  reward: { xp?: number; reputation?: number; cash?: number }
}

export type Cond =
  | StepCondition
  | { questActive: string }
  | { questCompleted: string }
  | { not: Cond }
  | { all: Cond[] }
  | { any: Cond[] }

export type Effect = { giveQuest: string } | { setFlag: string }

/* ---------- evaluation ---------- */

export function evalCond(state: GameState, cond: Cond): boolean {
  if ('not' in cond) return !evalCond(state, cond.not)
  if ('all' in cond) return cond.all.every((c) => evalCond(state, c))
  if ('any' in cond) return cond.any.some((c) => evalCond(state, c))
  if ('questActive' in cond) return state.quests.active.some((q) => q.id === cond.questActive)
  if ('questCompleted' in cond) return state.quests.completed.includes(cond.questCompleted)
  if ('talked' in cond) return state.flags[`talked:${cond.talked}`] === true
  if ('entered' in cond) return state.flags[`entered:${cond.entered}`] === true
  if ('caseResolved' in cond) return state.cases.resolved.some((r) => r.caseId === cond.caseResolved)
  if ('casesResolvedAtLeast' in cond) return state.cases.resolved.length >= cond.casesResolvedAtLeast
  if ('tradesAtLeast' in cond) return state.portfolio.trades.length >= cond.tradesAtLeast
  if ('flag' in cond) return state.flags[cond.flag] === true
  return false
}

/* ---------- transitions ---------- */

export function startQuest(state: GameState, defId: string): GameState {
  const def = getQuestDef(defId)
  if (!def) return state
  if (state.quests.active.some((q) => q.id === defId)) return state
  if (state.quests.completed.includes(defId)) return state
  const quest: QuestState = {
    id: def.id,
    title: def.title,
    building: def.building,
    steps: def.steps.map((s) => ({ id: s.id, text: s.text, done: false })),
  }
  return { ...state, quests: { ...state.quests, active: [...state.quests.active, quest] } }
}

export function applyDialogueEffect(state: GameState, effect: Effect): GameState {
  if ('giveQuest' in effect) return startQuest(state, effect.giveQuest)
  if ('setFlag' in effect) return { ...state, flags: { ...state.flags, [effect.setFlag]: true } }
  return state
}

/**
 * Re-evaluate every active quest against the current state: tick step `done`
 * flags, and when all steps are done pay the reward and retire the quest.
 * Auto-starts anything marked `autoStart`. Returns the new state plus any
 * level-ups the rewards triggered.
 */
export function checkQuests(state: GameState): { state: GameState; levelUps: LevelUpReport[] } {
  let s = state
  for (const def of QUEST_DEFS) {
    if (def.autoStart) s = startQuest(s, def.id)
  }

  const levelUps: LevelUpReport[] = []
  const stillActive: QuestState[] = []
  const completed = [...s.quests.completed]
  let player = s.player

  for (const quest of s.quests.active) {
    const def = getQuestDef(quest.id)
    const steps = def
      ? quest.steps.map((step) => {
          const d = def.steps.find((x) => x.id === step.id)
          return d ? { ...step, done: step.done || evalCond(s, d.condition) } : step
        })
      : quest.steps

    if (def && steps.every((step) => step.done)) {
      completed.push(quest.id)
      const award = awardProgress(
        { ...player, cash: player.cash + (def.reward.cash ?? 0) },
        { xp: def.reward.xp, reputation: def.reward.reputation },
      )
      player = award.player
      levelUps.push(...award.levelUps)
    } else {
      stillActive.push({ ...quest, steps })
    }
  }

  s = { ...s, player, quests: { active: stillActive, completed } }
  return { state: s, levelUps }
}
