import { useSettingsStore, type Settings } from '@/state/settings'
import { aiConfigured } from '@/ai/flavour'
import { playSound } from '@/lib/sound'
import { PixelButton } from '@/ui/components/PixelButton'

const ROWS: { key: keyof Settings; label: string; hint: string }[] = [
  { key: 'sound', label: 'Sound', hint: 'Interface clicks and cues. No music yet.' },
  {
    key: 'assist',
    label: 'Assist',
    hint: 'Show the case ratios up front. Off, and you work them out (or unlock them with skills).',
  },
  {
    key: 'reducedMotion',
    label: 'Reduced motion',
    hint: 'Cuts animations and transitions across the game.',
  },
  {
    key: 'aiWording',
    label: 'AI wording',
    hint: aiConfigured
      ? 'Let a model rephrase the case write-ups. Falls back instantly to the written text.'
      : 'Needs VITE_AI_ENABLED, VITE_AI_BASE_URL and VITE_AI_KEY in .env.',
  },
]

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const settings = useSettingsStore()

  return (
    <div className="anim-backdrop fixed inset-0 z-50 flex items-center justify-center bg-night/85 p-6">
      <div className="anim-pop w-full max-w-md border-2 border-line bg-panel">
        <header className="border-b-2 border-line px-5 py-3">
          <h2 className="font-display text-sm text-ink">Settings</h2>
        </header>

        <div className="divide-y-2 divide-line">
          {ROWS.map((row) => {
            const on = settings[row.key]
            const locked = row.key === 'aiWording' && !aiConfigured
            return (
              <div key={row.key} className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <div className="font-display text-[11px] text-ink">{row.label}</div>
                  <div className="text-xs text-muted">{row.hint}</div>
                </div>
                <button
                  onClick={() => {
                    if (locked) return
                    settings.set(row.key, !on)
                    playSound('click')
                  }}
                  disabled={locked}
                  aria-pressed={on}
                  className={`shrink-0 border-2 px-3 py-1 font-display text-[10px] uppercase transition-colors disabled:opacity-40 ${
                    on && !locked
                      ? 'border-jade bg-jade/10 text-jade'
                      : 'border-line bg-panel-2 text-muted'
                  }`}
                >
                  {locked ? 'Off' : on ? 'On' : 'Off'}
                </button>
              </div>
            )
          })}
        </div>

        <footer className="flex justify-end border-t-2 border-line px-5 py-3">
          <PixelButton tone="primary" onClick={onClose}>
            Done
          </PixelButton>
        </footer>
      </div>
    </div>
  )
}
