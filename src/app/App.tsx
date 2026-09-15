import { useEffect } from 'react'
import { useUiStore } from '@/state/store'
import { useSettingsStore } from '@/state/settings'
import { useAuthStore } from '@/state/auth'
import { cloudEnabled, currentUser, onAuthChange } from '@/lib/supabase'
import { syncOnLogin } from '@/state/save'
import { useAttemptsStore } from '@/state/attempts'
import { codeFromLocation } from '@/state/transcripts'
import HomeScreen from '@/ui/screens/HomeScreen'
import GameScreen from '@/ui/screens/GameScreen'
import VerifyScreen from '@/ui/screens/VerifyScreen'
import TeachScreen from '@/ui/instructor/TeachScreen'

/**
 * `/t/<code>` — or `?t=<code>` on a host with no SPA fallback — is the public
 * transcript page (issue B1). Read once, before anything else mounts: it is a
 * different product surface with no game behind it, and someone arriving with
 * a code should never be shown a title screen first.
 */
const verifying = codeFromLocation(window.location.search, window.location.pathname)
/** `/teach` — the instructor surface (issue B3). A teacher is not a player. */
const teaching = /^\/teach\/?$/.test(window.location.pathname)

export default function App() {
  const screen = useUiStore((s) => s.screen)
  const reducedMotion = useSettingsStore((s) => s.reducedMotion)
  const colourSafe = useSettingsStore((s) => s.colourSafe)
  const setUser = useAuthStore((s) => s.setUser)
  const setReady = useAuthStore((s) => s.setReady)
  const hydrateAttempts = useAttemptsStore((s) => s.hydrate)

  // mirror the settings onto <html> so styles/index.css can act on them
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reducedMotion)
  }, [reducedMotion])
  useEffect(() => {
    document.documentElement.dataset.colourSafe = String(colourSafe)
  }, [colourSafe])

  // resolve the persisted session, then track sign-in / sign-out
  useEffect(() => {
    if (!cloudEnabled) {
      setReady(true)
      return
    }
    void currentUser().then((u) => {
      setUser(u)
      setReady(true)
    })
    return onAuthChange((u, event) => {
      setUser(u)
      if (event === 'SIGNED_IN') {
        void syncOnLogin()
        void hydrateAttempts() // push anything logged while signed out, then pull
      }
    })
  }, [setUser, setReady, hydrateAttempts])

  // the attempt log is local-first, so read it before any session resolves
  useEffect(() => {
    void hydrateAttempts()
  }, [hydrateAttempts])

  if (verifying) return <VerifyScreen code={verifying} />
  if (teaching) return <TeachScreen />

  return (
    <div key={screen} className="anim-fade h-full">
      {screen === 'home' ? <HomeScreen /> : <GameScreen />}
    </div>
  )
}
