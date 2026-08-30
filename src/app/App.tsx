import { useEffect } from 'react'
import { useUiStore } from '@/state/store'
import { useSettingsStore } from '@/state/settings'
import HomeScreen from '@/ui/screens/HomeScreen'
import GameScreen from '@/ui/screens/GameScreen'

export default function App() {
  const screen = useUiStore((s) => s.screen)
  const reducedMotion = useSettingsStore((s) => s.reducedMotion)

  // mirror the setting onto <html> so styles/index.css can act on it
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reducedMotion)
  }, [reducedMotion])

  return screen === 'home' ? <HomeScreen /> : <GameScreen />
}
