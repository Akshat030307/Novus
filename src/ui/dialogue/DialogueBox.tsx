import { useEffect, useState } from 'react'
import { useGameStore, useUiStore } from '@/state/store'
import { getNpc, type DialogueOption } from '@/data/npcs'
import { evalCond, applyDialogueEffect, checkQuests } from '@/sim/quests'
import { PixelButton } from '@/ui/components/PixelButton'

/**
 * Step 12. A real dialogue tree: the node's text, then the options that pass
 * their `showIf`. Choosing an option applies its `effect` (give a quest, set a
 * flag), re-checks the quests, then moves to the next node or leaves.
 */
export function DialogueBox() {
  const npcId = useUiStore((s) => s.dialogueNpc)
  const setDialogueNpc = useUiStore((s) => s.setDialogueNpc)
  const pushLevelUps = useUiStore((s) => s.pushLevelUps)
  const state = useGameStore((s) => s.state)
  const load = useGameStore((s) => s.load)
  const [nodeId, setNodeId] = useState('start')

  useEffect(() => {
    setNodeId('start')
  }, [npcId])

  const npc = npcId ? getNpc(npcId) : undefined
  if (!npc) return null

  const node = npc.nodes[nodeId] ?? npc.nodes.start
  const options = node.options.filter((o) => !o.showIf || evalCond(state, o.showIf))
  const close = () => setDialogueNpc(null)

  const pick = (o: DialogueOption) => {
    if (o.effect) {
      const next = checkQuests(applyDialogueEffect(useGameStore.getState().state, o.effect))
      load(next.state)
      pushLevelUps(next.levelUps)
    }
    if (o.to) setNodeId(o.to)
    else close()
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4">
      <div className="pointer-events-auto mx-auto max-w-3xl border-2 border-marigold bg-panel p-4">
        <div className="mb-1 flex items-baseline gap-2">
          <h3 className="font-display text-[11px] text-marigold uppercase">{npc.name}</h3>
          <span className="font-display text-[9px] text-muted uppercase">{npc.role}</span>
        </div>
        <p className="mb-4 text-sm text-ink">{node.text}</p>
        <div className="flex flex-wrap justify-end gap-2">
          {options.map((o, i) => (
            <PixelButton key={i} onClick={() => pick(o)}>
              {o.label}
            </PixelButton>
          ))}
          <PixelButton onClick={close}>Leave</PixelButton>
        </div>
      </div>
    </div>
  )
}
