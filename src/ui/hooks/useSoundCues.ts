import { useEffect, useRef } from 'react'
import { useGameStore } from '@/state/store'
import { playSound } from '@/lib/sound'

/**
 * Step 16. Cues that follow game state rather than a click: a new line in the
 * feed pings. Level-ups, case outcomes and the day-end screen make their own
 * noise on mount — this hook only covers the things that appear while you are
 * looking elsewhere. GameScreen mounts it once, next to the clock.
 */
export function useSoundCues() {
  const feedCount = useGameStore((s) => s.state.notifications.length)
  const prevFeed = useRef(feedCount)

  useEffect(() => {
    if (feedCount > prevFeed.current) playSound('notify')
    prevFeed.current = feedCount
  }, [feedCount])
}
