import { create } from 'zustand'

/**
 * Whether the last cloud round-trip worked, and why it didn't.
 *
 * Supabase's client returns `{ error }` rather than throwing, so a failed
 * upsert used to vanish without a trace — the game kept its local save and
 * nobody was told the cloud copy never landed. `state/save.ts` reports every
 * outcome here and the HUD shows it. Not game state, never saved.
 */
export type CloudStatus =
  /** no VITE_SUPABASE_* env — browser storage only */
  | 'off'
  /** configured, but nobody is signed in */
  | 'idle'
  | 'syncing'
  | 'saved'
  | 'error'

interface CloudStore {
  status: CloudStatus
  /** the last failure, verbatim from Supabase */
  error: string | null
  /** ISO time of the last successful cloud write */
  savedAt: string | null
  report: (status: CloudStatus, error?: string | null, savedAt?: string) => void
}

export const useCloudStore = create<CloudStore>((set) => ({
  status: 'off',
  error: null,
  savedAt: null,
  report: (status, error = null, savedAt) =>
    set((s) => ({ status, error, savedAt: savedAt ?? s.savedAt })),
}))

/**
 * A failure of the world save. This is what the HUD indicator means, and
 * nothing else may set it — see `cloudNote`.
 */
export function cloudFailed(where: string, message: string) {
  useCloudStore.getState().report('error', message)
  console.warn(`[novus] cloud ${where} failed: ${message}`)
}

/**
 * A failure in something that is not the world save — the attempt log, a
 * transcript. Logged, and surfaced by whichever panel owns it, but it must not
 * touch the save indicator: telling a player their progress failed to save
 * because a drill score didn't upload would be a worse lie than saying
 * nothing. The rule from `save.ts` still holds — nothing is swallowed.
 */
export function cloudNote(where: string, message: string): string {
  console.warn(`[novus] cloud ${where} failed: ${message}`)
  return message
}

/** message from anything a Supabase call can hand back or throw */
export const cloudReason = (e: unknown) =>
  e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unknown error'
