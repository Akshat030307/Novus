import { useEffect } from 'react'
import type { LevelUpReport } from '@/sim/types'
import { playSound } from '@/lib/sound'
import { PixelButton } from '@/ui/components/PixelButton'

/**
 * Fired when the player crosses an XP threshold. Fed a fake report for now;
 * step 11 wires the real one from sim/progression.ts.
 */
export function LevelUpPopup({
  report,
  onClose,
}: {
  report: LevelUpReport
  onClose: () => void
}) {
  useEffect(() => {
    playSound('levelUp')
  }, [report.newLevel])

  return (
    <div className="anim-backdrop fixed inset-0 z-50 flex items-center justify-center bg-night/85 p-6">
      <div className="anim-pop w-full max-w-sm border-2 border-amethyst bg-panel">
        <header className="border-b-2 border-amethyst px-5 py-4 text-center">
          <div className="font-display text-[10px] text-amethyst uppercase">Level up</div>
          <div className="anim-level font-display text-2xl text-ink">Level {report.newLevel}</div>
        </header>

        <div className="p-5">
          <div className="mb-2 font-display text-[9px] text-muted uppercase">Now open to you</div>
          <ul className="space-y-2 text-sm text-ink">
            {report.unlocks.map((u) => (
              <li key={u} className="flex gap-2">
                <span className="text-marigold">+</span>
                {u}
              </li>
            ))}
          </ul>
        </div>

        <footer className="flex justify-end border-t-2 border-amethyst px-5 py-3">
          <PixelButton tone="primary" onClick={onClose}>
            Back to it
          </PixelButton>
        </footer>
      </div>
    </div>
  )
}
