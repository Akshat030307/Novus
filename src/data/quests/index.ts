import type { QuestDef } from '@/sim/quests'
import { firstDay } from './first-day'
import { theBadLoan } from './the-bad-loan'
import { openingBell } from './opening-bell'
import { secondOpinion } from './second-opinion'
import { offTheRecord } from './off-the-record'

/** every quest in the build, in the order they tend to come up */
export const QUEST_DEFS: QuestDef[] = [
  firstDay,
  theBadLoan,
  openingBell,
  secondOpinion,
  offTheRecord,
]

const BY_ID: Record<string, QuestDef> = Object.fromEntries(QUEST_DEFS.map((q) => [q.id, q]))

export function getQuestDef(id: string): QuestDef | undefined {
  return BY_ID[id]
}
