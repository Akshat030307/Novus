import { useEffect } from 'react'
import { useSettingsStore } from '@/state/settings'
import { useUiStore } from '@/state/store'
import { setMusic } from '@/lib/music'

/**
 * Background music. Mounted by GameScreen only, so the landing page,
 * the verification page and /teach stay silent — and so the track can only
 * start after "Start playing" or "Continue", which is the click browsers
 * require before any audio is allowed.
 *
 * Ducks whenever anything is open on top of the city: a building (where the
 * case files, the market and the Academy live), a conversation, the day-end
 * screen, settings, a level-up. Those are the moments someone is reading.
 */
export function useMusic() {
  const enabled = useSettingsStore((s) => s.music)
  const inside = useUiStore(
    (s) =>
      s.openBuilding !== null ||
      s.dialogueNpc !== null ||
      s.overlay !== null ||
      s.levelUpQueue.length > 0,
  )

  useEffect(() => {
    setMusic(!enabled ? 'off' : inside ? 'ducked' : 'full')
  }, [enabled, inside])

  // leaving the game screen stops it
  useEffect(() => () => setMusic('off'), [])
}
