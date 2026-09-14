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
