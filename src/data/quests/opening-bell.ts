import type { QuestDef } from '@/sim/quests'

export const openingBell: QuestDef = {
  id: 'opening-bell',
  title: 'Opening Bell',
  building: 'exchange',
  steps: [
    { id: 'visit', text: 'Step onto the Novus Exchange floor', condition: { entered: 'exchange' } },
    { id: 'trade', text: 'Make your first trade', condition: { tradesAtLeast: 1 } },
  ],
  reward: { xp: 25 },
}
