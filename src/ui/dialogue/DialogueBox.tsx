import { useEffect, useRef, useState } from 'react'
import { useGameStore, useUiStore } from '@/state/store'
import { getNpc, type DialogueOption } from '@/data/npcs'
import { evalCond, applyDialogueEffect, checkQuests } from '@/sim/quests'
import { playSound } from '@/lib/sound'
import { PixelButton } from '@/ui/components/PixelButton'

/**
 * Step 12. A real dialogue tree: the node's text, then the options that pass
 * their `showIf`. Choosing an option applies its `effect` (give a quest, set a
 * flag), re-checks the quests, then moves to the next node or leaves.
 *
 * Keyboard: ↑/↓ moves the highlight over the choices (Leave is the last one),
 * Enter/Space takes it. Escape (handled in useGameKeys) leaves.
 */
export function DialogueBox() {
  const npcId = useUiStore((s) => s.dialogueNpc)
  const setDialogueNpc = useUiStore((s) => s.setDialogueNpc)
  const pushLevelUps = useUiStore((s) => s.pushLevelUps)
  const state = useGameStore((s) => s.state)
  const load = useGameStore((s) => s.load)
  const [nodeId, setNodeId] = useState('start')
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    setNodeId('start')
    setSelected(0)
    if (npcId) playSound('dialogue')
  }, [npcId])

  useEffect(() => {
    setSelected(0)
  }, [nodeId])

  const npc = npcId ? getNpc(npcId) : undefined
  const node = npc ? (npc.nodes[nodeId] ?? npc.nodes.start) : undefined
  const options = node ? node.options.filter((o) => !o.showIf || evalCond(state, o.showIf)) : []
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

  // refs so the one keydown binding always sees the live selection and choices
  const count = options.length + 1 // + Leave
  const selRef = useRef(0)
  const commit = useRef<(i: number) => void>(() => {})
  useEffect(() => {
    selRef.current = selected
  }, [selected])
  commit.current = (i: number) => (i < options.length ? pick(options[i]) : close())

  useEffect(() => {
    if (!npc) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelected((s) => (s + 1) % count)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelected((s) => (s - 1 + count) % count)
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        commit.current(selRef.current)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [npc, count])

  if (!npc || !node) return null

  // a ring rather than border/text overrides — those collide with PixelButton's own
  const pickCls = (i: number) => (i === selected ? 'ring-2 ring-marigold' : '')

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4">
      <div className="anim-rise pointer-events-auto mx-auto max-w-3xl border-2 border-marigold bg-panel p-4">
        <div className="mb-1 flex items-baseline gap-2">
          <h3 className="font-display text-[11px] text-marigold uppercase">{npc.name}</h3>
          <span className="font-display text-[9px] text-muted uppercase">{npc.role}</span>
        </div>
        <p className="mb-4 text-sm text-ink">{node.text}</p>
        <div className="flex flex-wrap justify-end gap-2">
          {options.map((o, i) => (
            <PixelButton key={i} className={pickCls(i)} onClick={() => pick(o)}>
              {o.label}
            </PixelButton>
          ))}
          <PixelButton className={pickCls(options.length)} onClick={close}>
            Leave
          </PixelButton>
        </div>
      </div>
    </div>
  )
}
