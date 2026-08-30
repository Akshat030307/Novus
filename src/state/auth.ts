import { create } from 'zustand'
import type { AuthUser } from '@/lib/supabase'

/**
 * Step 14. Who is signed in, if anyone. Not game state, not on-screen UI —
 * `save.ts` uses it to decide whether to sync, the home screen shows it.
 */
interface AuthStore {
  user: AuthUser | null
  /** false until the first session check has resolved */
  ready: boolean
  setUser: (user: AuthUser | null) => void
  setReady: (ready: boolean) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  ready: false,
  setUser: (user) => set({ user }),
  setReady: (ready) => set({ ready }),
}))
