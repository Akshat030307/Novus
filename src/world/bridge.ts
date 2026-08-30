/**
 * The only place Phaser and React are allowed to meet.
 *
 * Phaser reads the game store through here and reports events back through
 * here. If Phaser code starts importing React components, or a React panel
 * starts reaching into a Phaser scene, the layer split is gone and every bug
 * afterwards is twice as hard to find.
 */
import { useGameStore, useUiStore } from '@/state/store'
import { checkQuests } from '@/sim/quests'

/** set a world flag on the save, then let the quests catch up */
function mark(flag: string) {
  const g = useGameStore.getState()
  const next = checkQuests({ ...g.state, flags: { ...g.state.flags, [flag]: true } })
  g.load(next.state)
  useUiStore.getState().pushLevelUps(next.levelUps)
}

export const bridge = {
  /** read a snapshot of the world for the scene to draw */
  readState: () => useGameStore.getState().state,

  /** the player walked into a door */
  enterBuilding: (id: string) => {
    mark(`entered:${id}`)
    useUiStore.getState().setOpenBuilding(id)
  },

  /** the player walked up to an NPC and pressed the action key */
  talkTo: (npcId: string) => {
    mark(`talked:${npcId}`)
    useUiStore.getState().setDialogueNpc(npcId)
  },

  /** the clock must not run while a panel is blocking the view */
  isPaused: () => useUiStore.getState().isPaused(),
}
