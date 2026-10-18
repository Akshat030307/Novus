import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Assignment, CohortMember } from '@/sim/cohort'
import type { Attempt } from '@/sim/attempts'
import { SAMPLE_CLASS_NAME, sampleClass } from '@/data/sample-class'

/**
 * The sample class at /teach/sample, made editable.
 *
 * It is still invented data and still goes nowhere near the database: a
 * teacher can open it with no account, rename it, set work, change a due date
 * and remove a student, and what they do survives a reload because it lives in
 * this browser's localStorage. "Reset the sample" puts the invented class back.
 *
 * Nothing in here is shared, so there is no privacy boundary to enforce — the
 * real classes in state/cohorts.ts are the ones Postgres guards.
 */

export interface SampleClassState {
  name: string
  members: CohortMember[]
  assignments: Assignment[]
  attempts: (Attempt & { userId: string })[]
  /** when the invented data was last laid out, so the dates read as this week */
  seededAt: number

  rename: (name: string) => void
  removeStudent: (userId: string) => void
  addAssignment: (a: { kind: 'drill' | 'module'; refId: string; title: string; dueAt: string | null }) => void
  updateAssignment: (id: string, patch: Partial<Pick<Assignment, 'dueAt' | 'optional' | 'title'>>) => void
  removeAssignment: (id: string) => void
  moveAssignment: (id: string, by: -1 | 1) => void
  reset: () => void
}

const fresh = () => {
  const data = sampleClass()
  return { name: SAMPLE_CLASS_NAME, ...data, seededAt: Date.now() }
}

/** ids only have to be unique inside this browser */
const newId = () => `sample-a${Math.random().toString(36).slice(2, 8)}`

export const useSampleClass = create<SampleClassState>()(
  persist(
    (set) => ({
      ...fresh(),

      rename: (name) => set({ name: name.trim() || SAMPLE_CLASS_NAME }),

      removeStudent: (userId) =>
        set((s) => ({
          members: s.members.filter((m) => m.userId !== userId),
          attempts: s.attempts.filter((a) => a.userId !== userId),
        })),

      addAssignment: (a) =>
        set((s) => ({ assignments: [...s.assignments, { id: newId(), ...a }] })),

      updateAssignment: (id, patch) =>
        set((s) => ({
          assignments: s.assignments.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),

      removeAssignment: (id) =>
        set((s) => ({ assignments: s.assignments.filter((a) => a.id !== id) })),

      moveAssignment: (id, by) =>
        set((s) => {
          const i = s.assignments.findIndex((a) => a.id === id)
          const j = i + by
          if (i < 0 || j < 0 || j >= s.assignments.length) return s
          const next = [...s.assignments]
          ;[next[i], next[j]] = [next[j], next[i]]
          return { assignments: next }
        }),

      reset: () => set(fresh()),
    }),
    {
      name: 'novus:sample-class:1',
      partialize: (s) => ({
        name: s.name,
        members: s.members,
        assignments: s.assignments,
        attempts: s.attempts,
        seededAt: s.seededAt,
      }),
    },
  ),
)
