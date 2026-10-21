import { create } from 'zustand'
import type { Assignment, SetWork } from '@/sim/cohort'
import type { BoardMember } from '@/sim/leaderboard'
import { classBoard, listAssignments, myMemberships, type Membership } from '@/state/cohorts'

/**
 * What the player's classes have set, in one place.
 *
 * Before this, only the Class tab knew about assignments, which meant a
 * student could open Drills, do the wrong three, and never see that two of
 * them were homework due on Friday. The work belongs where the work is done.
 *
 * A player in no class never fills this store and never sees a deadline. That
 * is the whole of the difference between the two ways of playing: solo is the
 * same game with nothing set. Nothing here gates anything — a class can say
 * "do this by Friday", it cannot lock a drill.
 */
interface ClassworkStore {
  loaded: boolean
  loading: boolean
  classes: Membership[]
  /** cohort id -> what that class set */
  assignments: Record<string, Assignment[]>
  /** cohort id -> the leaderboard rows that class may see */
  boards: Record<string, BoardMember[]>
  /** everything set for this player, whichever class set it */
  work: SetWork[]
  refresh: () => Promise<void>
  clear: () => void
}

export const useClassworkStore = create<ClassworkStore>()((set, get) => ({
  loaded: false,
  loading: false,
  classes: [],
  assignments: {},
  boards: {},
  work: [],

  refresh: async () => {
    if (get().loading) return
    set({ loading: true })
    const classes = await myMemberships()
    const assignments: Record<string, Assignment[]> = {}
    const boards: Record<string, BoardMember[]> = {}
    for (const c of classes) {
      assignments[c.cohortId] = await listAssignments(c.cohortId)
      boards[c.cohortId] = await classBoard(c.cohortId)
    }
    const work = classes.flatMap((c) =>
      (assignments[c.cohortId] ?? []).map((a) => ({
        ...a,
        cohortId: c.cohortId,
        cohortName: c.cohortName,
      })),
    )
    set({ classes, assignments, boards, work, loaded: true, loading: false })
  },

  clear: () => set({ loaded: false, classes: [], assignments: {}, boards: {}, work: [] }),
}))
