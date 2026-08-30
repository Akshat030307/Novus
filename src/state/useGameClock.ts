import { useEffect } from 'react'
import { useGameStore, useUiStore } from '@/state/store'
import { advanceClock } from '@/sim/clock'
import { tickMarket } from '@/sim/market'
import { maybeFireEvent } from '@/sim/events'
import { saveGame } from '@/state/save'

/**
 * The one place a real timer lives. One game minute per real second, skipped
 * while any panel is open (useUiStore.isPaused). sim/clock.ts stays pure — this
 * hook is the only part that ticks. GameScreen mounts it once.
 *
 * Backgrounded tabs throttle setInterval, so hidden time is lost rather than
 * fast-forwarded. Fine for now.
 */
export function useGameClock() {
  useEffect(() => {
    const id = window.setInterval(() => {
      if (useUiStore.getState().isPaused()) return

      const { state, tick } = useGameStore.getState()
      if (state.clock.phase === 'closed') return // day's over, waiting on the player

      const { clock, closed } = advanceClock(state.clock)

      let market = state.market
      let notifications = state.notifications
      if (clock.phase === 'open') {
        const fired = maybeFireEvent(state.market, state.notifications, state.seed, clock)
        market = tickMarket(fired.market, state.seed, clock)
        notifications = fired.notifications
      }
      tick({ clock, market, notifications })

      if (closed) {
        // day-end summary + auto-save; tomorrow's headline is recomputed in buildDayEndReport
        useUiStore.getState().setOverlay('day-end')
        void saveGame(useGameStore.getState().state)
      }
    }, 1000)

    const onLeave = () => void saveGame(useGameStore.getState().state)
    window.addEventListener('beforeunload', onLeave)

    return () => {
      window.clearInterval(id)
      window.removeEventListener('beforeunload', onLeave)
    }
  }, [])
}
