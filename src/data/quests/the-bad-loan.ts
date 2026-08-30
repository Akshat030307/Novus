import type { QuestDef } from '@/sim/quests'

export const theBadLoan: QuestDef = {
  id: 'the-bad-loan',
  title: 'The Bad Loan',
  building: 'bank',
  steps: [
    {
      id: 'decide',
      text: 'Read the Sharma Textiles file and make the call',
      condition: { caseResolved: 'loan-sharma-textiles' },
    },
    {
      id: 'report',
      text: 'Report your reasoning back to Rao',
      condition: { flag: 'reported:bad-loan' },
    },
  ],
  reward: { xp: 40, reputation: 3 },
}
