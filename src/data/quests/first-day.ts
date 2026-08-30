import type { QuestDef } from '@/sim/quests'

export const firstDay: QuestDef = {
  id: 'first-day',
  title: 'First Day at Meridian',
  building: 'bank',
  autoStart: true,
  steps: [
    { id: 'enter', text: 'Find Meridian Bank and go in', condition: { entered: 'bank' } },
    { id: 'meet', text: 'Introduce yourself to the branch manager', condition: { talked: 'bank-manager' } },
  ],
  reward: { xp: 20 },
}
