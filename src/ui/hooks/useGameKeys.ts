import { useEffect, useRef } from 'react'
import { useUiStore, BOTTOM_TABS } from '@/state/store'
import { playSound } from '@/lib/sound'

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)

/**
 * The React side of the game-screen keyboard. WASD walks the city (that lives
 * in the world layer); everything here is the menus:
 *
 *   Escape          close the open dialogue / overlay — topmost first
 *   ← / →           previous / next bottom tab, when nothing is open
 *   Enter / Space   confirm the day-end screen, dismiss a level-up
 *
 * One window listener, routed off the ui store so there is never a question of
 * which overlay an Escape belongs to. Dialogue options and the settings list
 * own their own up/down.
 */
export function useGameKeys({ onAdvanceDay }: { onAdvanceDay: () => void }) {
  const advance = useRef(onAdvanceDay)
  advance.current = onAdvanceDay

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return
      const ui = useUiStore.getState()

      if (e.key === 'Escape') {
        if (ui.levelUpQueue.length) ui.dismissLevelUp()
        else if (ui.dialogueNpc) ui.setDialogueNpc(null)
        else if (ui.openBuilding) ui.setOpenBuilding(null)
        else if (ui.overlay === 'settings') ui.setOverlay(null)
        else return // day-end has no Escape — it needs a deliberate "start day"
        e.preventDefault()
        playSound('tab')
        return
      }

      if (e.key === 'Enter' || e.key === ' ') {
        if (ui.overlay === 'day-end') {
          e.preventDefault()
          advance.current()
        } else if (ui.levelUpQueue.length) {
          e.preventDefault()
          ui.dismissLevelUp()
        }
        return
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const blocking =
          ui.levelUpQueue.length > 0 || ui.dialogueNpc || ui.openBuilding || ui.overlay
        if (blocking) return
        e.preventDefault()
        const i = BOTTOM_TABS.indexOf(ui.bottomTab)
        const step = e.key === 'ArrowRight' ? 1 : BOTTOM_TABS.length - 1
        ui.setBottomTab(BOTTOM_TABS[(i + step) % BOTTOM_TABS.length])
        playSound('tab')
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
