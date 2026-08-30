import { useEffect } from 'react'
import { useUiStore } from '@/state/store'
import { useSettingsStore } from '@/state/settings'
import { useAuthStore } from '@/state/auth'
import { cloudEnabled, currentUser, onAuthChange } from '@/lib/supabase'
import { syncOnLogin } from '@/state/save'
import HomeScreen from '@/ui/screens/HomeScreen'
import GameScreen from '@/ui/screens/GameScreen'

export default function App() {
  const screen = useUiStore((s) => s.screen)
  const reducedMotion = useSettingsStore((s) => s.reducedMotion)
  const setUser = useAuthStore((s) => s.setUser)
  const setReady = useAuthStore((s) => s.setReady)

  // mirror the setting onto <html> so styles/index.css can act on it
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reducedMotion)
  }, [reducedMotion])

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
      if (event === 'SIGNED_IN') void syncOnLogin()
    })
  }, [setUser, setReady])

  return screen === 'home' ? <HomeScreen /> : <GameScreen />
}
