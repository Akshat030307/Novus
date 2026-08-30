import { useState } from 'react'
import { useUiStore, useGameStore } from '@/state/store'
import { hasSave, loadGame } from '@/state/save'
import { newGame } from '@/state/newGame'
import { PixelButton } from '@/ui/components/PixelButton'

/**
 * The first thing anyone sees.
 *
 * The Supabase login (step 14) slots in below the buttons without moving
 * anything else.
 */
export default function HomeScreen() {
  const setScreen = useUiStore((s) => s.setScreen)
  const load = useGameStore((s) => s.load)
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const saveExists = hasSave()

  const startNew = () => {
    load(newGame(name.trim()))
    setScreen('game')
  }

  const continueSaved = async () => {
    const saved = await loadGame()
    if (saved) {
      load(saved)
      setScreen('game')
    }
  }

  return (
    <main className="relative flex h-full flex-col items-center justify-center overflow-hidden px-6">
      {/* skyline: flat blocks, no gradient — the city as it will actually look */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-64 items-end justify-center gap-1 opacity-30">
        {[48, 96, 72, 130, 88, 160, 104, 74, 120, 60, 140, 84].map((h, i) => (
          <div key={i} className="w-10 border-t-2 border-line bg-panel" style={{ height: h }}>
            <div className="mt-3 grid grid-cols-3 gap-1 px-2">
              {Array.from({ length: 6 }, (_, j) => (
                <span
                  key={j}
                  className={`h-1 ${(i + j) % 3 === 0 ? 'bg-marigold/70' : 'bg-line'}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <h1 className="font-display text-5xl tracking-tight text-ink">NOVUS</h1>
        <p className="mt-3 mb-10 text-center text-sm text-muted">
          A city that runs on money. You start at the bottom of it.
        </p>

        {naming ? (
          <div className="w-full border-2 border-line bg-panel p-4">
            <label
              htmlFor="name"
              className="mb-2 block font-display text-[10px] text-muted uppercase"
            >
              What should people call you?
            </label>
            <input
              id="name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={16}
              placeholder="Arjun"
              className="mb-4 w-full border-2 border-line bg-night px-3 py-2 font-num text-ink
                placeholder:text-muted/50 focus:border-marigold focus:outline-none"
            />
            <div className="flex gap-2">
              <PixelButton tone="primary" className="flex-1" onClick={startNew}>
                Start
              </PixelButton>
              <PixelButton onClick={() => setNaming(false)}>Back</PixelButton>
            </div>
          </div>
        ) : (
          <nav className="flex w-full flex-col gap-2">
            <PixelButton tone="primary" onClick={() => setNaming(true)}>
              New game
            </PixelButton>
            <PixelButton
              disabled={!saveExists}
              title={saveExists ? '' : 'No saved game yet'}
              onClick={continueSaved}
            >
              Continue
            </PixelButton>
            <PixelButton onClick={() => setScreen('game')}>
              Skip to the UI demo
            </PixelButton>
          </nav>
        )}

        <p className="mt-10 font-display text-[9px] text-muted/60 uppercase">
          Build 0.1 · single player
        </p>
      </div>
    </main>
  )
}
