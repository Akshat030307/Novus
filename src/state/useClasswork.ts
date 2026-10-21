import { useEffect } from 'react'
import { useAuthStore } from '@/state/auth'
import { useClassworkStore } from '@/state/classwork'

/**
 * Read what the player's classes have set, loading it once per sign-in.
 *
 * Any panel can call this — Drills, Modules and the Class tab all do — and
 * only the first one pays for the fetch. Signing out empties it, so a shared
 * browser never shows the next person somebody else's deadlines.
 */
export function useClasswork() {
  const user = useAuthStore((s) => s.user)
  const store = useClassworkStore()

  useEffect(() => {
    if (!user) {
      store.clear()
      return
    }
    if (!store.loaded && !store.loading) void store.refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, store.loaded])

  return store
}
