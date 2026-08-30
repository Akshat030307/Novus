import type { QuestDef } from '@/sim/quests'

export const secondOpinion: QuestDef = {
  id: 'second-opinion',
  title: 'Second Opinion',
  building: 'exchange',
  steps: [
    { id: 'trader', text: 'Hear Vikram out on the floor', condition: { talked: 'trader' } },
    { id: 'risk', text: "Get Sunil's read from the risk desk", condition: { talked: 'risk-officer' } },
    {
      id: 'judge',
      text: 'Resolve a case with both voices in your head',
      condition: { casesResolvedAtLeast: 1 },
    },
  ],
  reward: { xp: 35, reputation: 2 },
}
