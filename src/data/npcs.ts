import type { Cond, Effect } from '@/sim/quests'

/**
 * Step 12. NPC personalities and dialogue trees. Not everyone is right —
 * the trader is loud and wrong as often as not on the short term, the risk
 * officer is cautious to a fault, the reporter is early and overblown. The
 * player learns whom to trust by watching how the advice lands.
 */

export interface DialogueOption {
  label: string
  /** id of the next node, or null to end the conversation */
  to: string | null
  /** only offered when this holds */
  showIf?: Cond
  /** applied to the game state when chosen */
  effect?: Effect
}

export interface DialogueNode {
  text: string
  options: DialogueOption[]
}

export interface Npc {
  id: string
  name: string
  role: string
  nodes: Record<string, DialogueNode>
}

const NPCS: Npc[] = [
  {
    id: 'bank-manager',
    name: 'Rao',
    role: 'Branch manager, Meridian Bank',
    nodes: {
      start: {
        text: "First day? Rao. I run this branch. Your desk is the one with the wobble. Kettle's broken — don't ask.",
        options: [
          { label: 'What should I be doing?', to: 'brief' },
          {
            label: 'About Sharma Textiles — here is where I landed.',
            to: 'reported',
            showIf: {
              all: [
                { caseResolved: 'loan-sharma-textiles' },
                { not: { flag: 'reported:bad-loan' } },
              ],
            },
            effect: { setFlag: 'reported:bad-loan' },
          },
          { label: 'Nothing for now.', to: null },
        ],
      },
      brief: {
        text: 'Loan files. You read them, you make the call, you carry it. There is one on your desk already — Sharma Textiles. Family firm, good history, shaky order.',
        options: [
          {
            label: "I'll take it.",
            to: 'gave',
            showIf: { questCompleted: 'first-day' },
            effect: { giveQuest: 'the-bad-loan' },
          },
          { label: 'Give me a minute to settle in.', to: null },
        ],
      },
      gave: {
        text: "It's in your Case panel. Don't rush it, and don't fall for the family story — the numbers do not care who is crying.",
        options: [{ label: 'Understood.', to: null }],
      },
      reported: {
        text: 'Right or wrong on the day, I want to hear the reasoning. A good call that goes bad is still a good call. Remember that when it stings.',
        options: [{ label: 'I will.', to: null }],
      },
    },
  },
  {
    id: 'trader',
    name: 'Vikram',
    role: 'Trader, Novus Exchange',
    nodes: {
      start: {
        text: "New blood. Listen — Tarang is going to rip today, I can feel it. Payments, mate. The future, and the future is eleven a.m.",
        options: [
          { label: 'How do I actually trade?', to: 'howto', effect: { giveQuest: 'opening-bell' } },
          { label: 'You "feel" it?', to: 'feel' },
          { label: 'Sure, Vikram.', to: null },
        ],
      },
      howto: {
        text: "Pick a stock in the Market panel, punch in a quantity, hit Buy. Sell when you're up — or when you're scared. Everyone says up. Nobody sells up.",
        options: [{ label: 'Got it.', to: null }],
      },
      feel: {
        text: "Twelve years on this floor. My gut is right more than it is wrong — not by much, mind. Ask Sunil at the risk desk. He'll tell you my gut belongs in a museum.",
        options: [
          { label: "I'll ask Sunil.", to: null, effect: { giveQuest: 'second-opinion' } },
          { label: 'Noted.', to: null },
        ],
      },
    },
  },
  {
    id: 'risk-officer',
    name: 'Sunil',
    role: 'Risk officer',
    nodes: {
      start: {
        text: "You've been talking to Vikram. I can tell — you have that look, like you're about to buy something.",
        options: [
          {
            label: "He says Tarang is going up.",
            to: 'tarang',
            effect: { giveQuest: 'second-opinion' },
          },
          { label: 'What do you do here?', to: 'role' },
          { label: 'Just passing.', to: null },
        ],
      },
      tarang: {
        text: 'Payments is the most volatile line on the board. He is right about one trade in three and remembers only those. Size small. Or do not size at all — cash never defaulted on anyone.',
        options: [{ label: 'Cautious.', to: null }],
      },
      role: {
        text: 'I say no. Sometimes I say no to things that would have been fine, and we both lose money I could have made us. That is the trade. I sleep.',
        options: [{ label: 'Fair.', to: null }],
      },
    },
  },
  {
    id: 'journalist',
    name: 'Meera',
    role: 'Reporter, city desk',
    nodes: {
      start: {
        text: "You're the new one at Meridian. Good — I need a friend on the inside. I hear things first. I just occasionally hear them louder than they were said.",
        options: [
          {
            label: 'Heard anything worth hearing?',
            to: 'tip',
            effect: { giveQuest: 'off-the-record' },
          },
          { label: "I'm not leaking anything.", to: 'nope' },
          { label: 'Some other time.', to: null },
        ],
      },
      tip: {
        text: 'Vector Trading Co. A crore of turnover and — my source swears — a bank balance you could fit in a matchbox. Could be nothing. Could be the story of the year. Pull their file.',
        options: [{ label: "I'll look.", to: null }],
      },
      nope: {
        text: "Not asking you to. Just — when a file smells wrong, you'll want someone who has been smelling them for fifteen years. My card is on the noticeboard.",
        options: [{ label: 'Maybe.', to: null }],
      },
    },
  },
]

const BY_ID: Record<string, Npc> = Object.fromEntries(NPCS.map((n) => [n.id, n]))

export function getNpc(id: string): Npc | undefined {
  return BY_ID[id]
}
