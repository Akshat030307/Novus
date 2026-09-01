import { useState, useEffect, useMemo, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { useUiStore, useGameStore } from '@/state/store'
import { hasSave, hasCloudSave, loadGame } from '@/state/save'
import { newGame } from '@/state/newGame'
import { cloudEnabled, sendMagicLink, signOut } from '@/lib/supabase'
import { useAuthStore } from '@/state/auth'

/** The first thing anyone sees. Left-anchored: giant wordmark, a plain menu
 *  list under it, the skyline shoved to the right as a backdrop. */
export default function HomeScreen() {
  const setScreen = useUiStore((s) => s.setScreen)
  const load = useGameStore((s) => s.load)
  const user = useAuthStore((s) => s.user)
  const authReady = useAuthStore((s) => s.ready)
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [linkSent, setLinkSent] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [cloudSave, setCloudSave] = useState(false)
  const saveExists = hasSave()

  useEffect(() => {
    if (cloudEnabled && user) void hasCloudSave().then(setCloudSave)
    else setCloudSave(false)
  }, [user])

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

  const sendLink = async (e: FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    const { error } = await sendMagicLink(email.trim())
    if (error) setAuthError(error)
    else setLinkSent(true)
  }

  return (
    <main className="relative flex h-full flex-col justify-center overflow-hidden">
      <Backdrop />

      {/* skyline: flat blocks, no gradient — pushed right, tall enough to fill
          the bottom half. items-end so the tallest towers clip past mid-screen. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-1/2 items-end justify-end gap-1.5 pr-4 opacity-90">
        {[220, 360, 280, 480, 320, 560, 400, 260, 460, 240, 520, 340].map((h, i) => (
          <div key={i} className="w-16 border-t-2 border-hi bg-panel-3" style={{ height: h }}>
            <div className="mt-4 grid grid-cols-3 gap-1.5 px-2">
              {Array.from({ length: 18 }, (_, j) => {
                const lit = (i + j) % 3 === 0
                const flicker = lit && (i * 5 + j) % 4 === 0
                return (
                  <span
                    key={j}
                    className={`h-1.5 ${lit ? 'bg-marigold' : 'bg-hi'}`}
                    style={
                      flicker
                        ? { animation: 'citylight 7s ease-in-out infinite', animationDelay: `${(i * 3 + j) % 9}s` }
                        : undefined
                    }
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-10 flex w-full flex-col items-start pl-[6vw] pr-6">
        {/* ~half the viewport wide — tweak the vw if it drifts. the negative
            margin cancels Silkscreen's left side-bearing so the glyph edge
            lines up with the menu below. */}
        <h1 className="-ml-[0.08em] mb-3 font-display leading-[0.82] tracking-tight text-ink text-[clamp(3.5rem,12vw,11rem)]">
          NOVUS
        </h1>
        <p className="mb-12 font-display uppercase tracking-wide text-jade text-[clamp(0.7rem,1.9vw,1.1rem)] leading-relaxed">
          Gamified Financial Markets Education Platform
        </p>

        {naming ? (
          <div className="w-full max-w-sm">
            <label htmlFor="name" className="mb-2 block font-display text-[10px] text-muted uppercase">
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
            <div className="flex gap-6 font-display text-sm uppercase tracking-wide">
              <button
                onClick={startNew}
                className="text-marigold transition-[color,text-shadow]
                  hover:[text-shadow:0_0_18px_var(--color-marigold)]"
              >
                Start
              </button>
              <button
                onClick={() => setNaming(false)}
                className="text-muted transition-[color,text-shadow]
                  hover:text-marigold hover:[text-shadow:0_0_18px_var(--color-marigold)]"
              >
                Back
              </button>
            </div>
          </div>
        ) : (
          <nav className="flex flex-col items-start font-display text-xl uppercase tracking-wide">
            <MenuItem onClick={() => setNaming(true)}>New game</MenuItem>
            <MenuItem
              onClick={continueSaved}
              disabled={!saveExists && !cloudSave}
              title={saveExists || cloudSave ? '' : 'No saved game yet'}
            >
              Continue
            </MenuItem>
          </nav>
        )}

        {cloudEnabled && authReady && (
          <div className="mt-10 w-full max-w-sm">
            {user ? (
              <div className="flex items-center gap-3 text-xs">
                <span className="font-num text-muted">{user.email}</span>
                <button
                  onClick={() => void signOut()}
                  className="font-display text-[9px] text-muted uppercase hover:text-marigold"
                >
                  Sign out
                </button>
              </div>
            ) : linkSent ? (
              <p className="text-xs text-muted">Sign-in link sent — check your email.</p>
            ) : (
              <form onSubmit={sendLink} className="flex w-full gap-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="min-w-0 flex-1 border-2 border-line bg-night px-3 py-2 font-num text-sm text-ink
                    placeholder:text-muted/50 focus:border-marigold focus:outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 font-display text-[11px] text-muted uppercase tracking-wide
                    transition-[color,text-shadow] hover:text-marigold
                    hover:[text-shadow:0_0_16px_var(--color-marigold)]"
                >
                  Send link
                </button>
              </form>
            )}
            {authError && <p className="mt-2 text-xs text-coral">{authError}</p>}
            <p className="mt-2 text-[10px] text-muted/60">
              Sign in to save your progress to the cloud.
            </p>
          </div>
        )}

        <p className="mt-12 font-display text-[9px] text-muted/60 uppercase">
          Build 0.1 · single player
        </p>
      </div>
    </main>
  )
}

/** A menu row: no border, a marigold tick and a fill band that grow in on hover. */
function MenuItem({
  children,
  onClick,
  disabled,
  title,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="group flex items-center gap-3 py-2 pr-6 text-muted transition-[color,text-shadow]
        hover:text-marigold hover:[text-shadow:0_0_18px_var(--color-marigold)]
        disabled:cursor-not-allowed disabled:text-muted/30
        disabled:hover:text-muted/30 disabled:hover:[text-shadow:none]"
    >
      <span className="h-3 w-1 origin-left scale-y-0 bg-marigold transition-transform
        group-hover:scale-y-100 group-hover:[box-shadow:0_0_12px_var(--color-marigold)]
        group-disabled:group-hover:scale-y-0" />
      {children}
    </button>
  )
}

/* A dollar sign at 6×7 pixels: stem nub, top bar, upper block, middle bar,
   lower block, bottom bar, stem nub. */
const DOLLAR = [
  [0, 0, 1, 1, 0, 0],
  [1, 1, 1, 1, 1, 1],
  [1, 1, 1, 0, 0, 0],
  [0, 1, 1, 1, 1, 0],
  [0, 0, 0, 1, 1, 1],
  [1, 1, 1, 1, 1, 1],
  [0, 0, 1, 1, 0, 0],
]

/** The dollar mark rendered as hard pixels — a grid of neon-jade cells, no
 *  anti-alias, with a bloom so it reads against the black. */
function PixelDollar({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      aria-hidden
      className={`grid ${className}`}
      style={{
        gridTemplateColumns: 'repeat(6, 1fr)',
        gridAutoRows: '1fr',
        filter: 'drop-shadow(0 0 3px var(--color-jade)) drop-shadow(0 0 8px var(--color-jade))',
        ...style,
      }}
    >
      {DOLLAR.flat().map((on, i) => (
        <span key={i} className={on ? 'bg-jade' : ''} />
      ))}
    </div>
  )
}

/* Money rain: a field of small pixel-dollars falling straight down, each on its
   own speed and offset. Randomised once per mount so every visit differs; the
   negative delays mean the screen is already full on load. */
function Backdrop() {
  const drops = useMemo(
    () =>
      Array.from({ length: 40 }, () => {
        const size = 10 + Math.random() * 14 // px wide
        return {
          left: Math.random() * 100, // %
          size,
          dur: 4 + Math.random() * 5, // s
          delay: -Math.random() * 9, // s, negative → mid-fall already
          opacity: 0.4 + Math.random() * 0.45,
        }
      }),
    [],
  )

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {drops.map((d, i) => (
        <div
          key={i}
          className="absolute top-0"
          style={{
            left: `${d.left}%`,
            width: d.size,
            height: (d.size * 7) / 6,
            opacity: d.opacity,
            animation: `money-rain ${d.dur}s linear infinite`,
            animationDelay: `${d.delay}s`,
            willChange: 'transform',
          }}
        >
          <PixelDollar className="h-full w-full" />
        </div>
      ))}
    </div>
  )
}
