import type { QuestDef } from '@/sim/quests'

export const offTheRecord: QuestDef = {
  id: 'off-the-record',
  title: 'Off the Record',
  steps: [
    { id: 'meet', text: 'Find Meera, the reporter', condition: { talked: 'journalist' } },
    {
      id: 'dig',
      text: 'Pull the Vector Trading Co file and make a call',
      condition: { caseResolved: 'loan-vector-trading' },
    },
  ],
  reward: { xp: 40, reputation: 2 },
}
