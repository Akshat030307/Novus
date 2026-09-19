import { useState, useEffect, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { useUiStore, useGameStore } from '@/state/store'
import { hasSave, hasCloudSave, loadGame } from '@/state/save'
import { newGame } from '@/state/newGame'
import { cloudEnabled, sendMagicLink, signOut } from '@/lib/supabase'
import { useAuthStore } from '@/state/auth'
import { useSettingsStore } from '@/state/settings'
import { enterFullscreen } from '@/lib/fullscreen'

/**
 * The front door — a product page rather than a game title screen: what Novus
 * is on the left, what it looks like on the right, one obvious way in.
 *
 * It runs on its own palette (plum + magenta, `--color-plum*`/`--color-magenta*`
 * in styles/index.css). Those tokens exist only for this screen; the game's
 * black-and-marigold interface behind it is deliberately untouched.
 */
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

  // must run inside the click itself — the browser refuses fullscreen after an await
  const goFullscreen = () => {
    if (useSettingsStore.getState().fullscreen) enterFullscreen()
  }

  const startNew = () => {
    goFullscreen()
    load(newGame(name.trim()))
    setScreen('game')
  }

  const continueSaved = async () => {
    goFullscreen()
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

  const canContinue = saveExists || cloudSave

  return (
    <main className="relative h-full overflow-y-auto bg-plum">
      <Blooms />

      <div className="relative z-10 flex min-h-full w-full flex-col px-6 py-8 sm:px-10 lg:px-16 lg:py-10">
        {/* logotype */}
        <header className="anim-rise flex items-center gap-2.5">
          <PixelDollar className="aspect-[6/7] h-5 shrink-0" />
          <span className="font-display text-[11px] tracking-widest text-blush uppercase">Novus</span>
        </header>

        {/* hero — centred in whatever room is left between logotype and footer */}
        <div className="my-auto grid items-center gap-10 py-8 lg:grid-cols-[0.85fr_1.35fr] lg:gap-16">
          <div className="flex flex-col items-start">
            <h1
              className="anim-rise -ml-[0.08em] font-display leading-[0.85] tracking-tight text-blush text-[clamp(3rem,8vw,7.5rem)]"
              style={{ animationDelay: '60ms' }}
            >
              NOVUS
            </h1>

            <p
              className="anim-rise mt-4 font-display uppercase leading-relaxed tracking-wide text-magenta text-[clamp(0.7rem,1.5vw,1.15rem)]"
              style={{ animationDelay: '120ms' }}
            >
              Gamified Financial Markets Education Platform
            </p>

            <p
              className="anim-rise mt-6 max-w-lg text-[15px] leading-relaxed text-blush/70"
              style={{ animationDelay: '180ms' }}
            >
              Walk a city that runs on money. Judge real loan files, trade a live market, and find
              out what your decisions were worth — graded on your reasoning, never on your luck.
            </p>

            <div className="anim-rise mt-8 w-full" style={{ animationDelay: '240ms' }}>
              {naming ? (
                <div className="w-full max-w-sm border-2 border-plum-line bg-plum-2 p-4">
                  <label
                    htmlFor="name"
                    className="mb-2 block font-display text-[10px] text-blush/50 uppercase"
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
                    className="mb-4 w-full border-2 border-plum-line bg-plum px-3 py-2 font-num text-blush
                      placeholder:text-blush/25 focus:border-magenta focus:outline-none"
                  />
                  <div className="flex gap-3">
                    <Cta onClick={startNew}>Start</Cta>
                    <Ghost onClick={() => setNaming(false)}>Back</Ghost>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <Cta onClick={() => setNaming(true)}>Start playing</Cta>
                  <Ghost
                    onClick={continueSaved}
                    disabled={!canContinue}
                    title={canContinue ? '' : 'No saved game yet'}
                  >
                    Continue
                  </Ghost>
                </div>
              )}
            </div>

            <ul
              className="anim-rise mt-10 flex flex-wrap gap-x-5 gap-y-2 font-display text-[9px] text-blush/40 uppercase"
              style={{ animationDelay: '300ms' }}
            >
              <Feature>Credit decisions</Feature>
              <Feature>Live market sim</Feature>
              <Feature>Academy and transcript</Feature>
            </ul>
          </div>

          {/* what it actually looks like */}
          <figure
            className="anim-rise relative border-2 border-plum-line bg-plum-2 p-2"
            style={{
              animationDelay: '200ms',
              boxShadow: '0 0 60px -20px var(--color-magenta)',
            }}
          >
            {/* the trailer, not a still. It doesn't float like the old picture did: controls
                that drift are hard to hit. preload="none" keeps the 11 MB off the page
                until someone presses play, and it never autoplays, because it has music. */}
            <video
              src="/novus-demo.mp4"
              poster="/novus-demo-poster.jpg"
              controls
              playsInline
              preload="none"
              width={1920}
              height={1080}
              className="block aspect-video h-auto w-full bg-plum"
              aria-label="Novus gameplay demo: the credit desk, the market, real-case replays, the day-end report, transcripts and the teacher dashboard"
            />
            <figcaption className="mt-2 px-1 font-display text-[8px] text-blush/35 uppercase">
              Gameplay demo · 1:24 · sound on
            </figcaption>
          </figure>
        </div>

        {/* account + build */}
        <footer className="flex flex-col gap-4 border-t-2 border-plum-line pt-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-sm">
            {cloudEnabled && authReady ? (
              user ? (
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-num text-blush/60">{user.email}</span>
                  <button
                    onClick={() => void signOut()}
                    className="font-display text-[9px] text-blush/40 uppercase transition-colors hover:text-magenta"
                  >
                    Sign out
                  </button>
                </div>
              ) : linkSent ? (
                <p className="text-xs text-blush/60">Sign-in link sent — check your email.</p>
              ) : (
                <>
                  <form onSubmit={sendLink} className="flex gap-3">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="min-w-0 flex-1 border-2 border-plum-line bg-plum-2 px-3 py-2 font-num text-sm text-blush
                        placeholder:text-blush/25 focus:border-magenta focus:outline-none"
                    />
                    <Ghost type="submit">Send link</Ghost>
                  </form>
                  <p className="mt-2 text-[10px] text-blush/35">
                    Optional — sign in to keep your progress across devices.
                  </p>
                </>
              )
            ) : null}
            {authError && <p className="mt-2 text-xs text-coral">{authError}</p>}
          </div>

          <p className="font-display text-[9px] text-blush/30 uppercase">
            Build 0.1 · single player · plays in the browser
          </p>
        </footer>
      </div>
    </main>
  )
}

/* ---------- pieces ---------- */

/** Two slow magenta blooms behind everything — the only light in the room. */
function Blooms() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute -top-56 -left-52 h-[36rem] w-[36rem] blur-[130px]"
        style={{
          background: 'radial-gradient(closest-side, var(--color-magenta), transparent)',
          animation: 'bloom 13s ease-in-out infinite',
        }}
      />
      <div
        className="absolute -right-56 -bottom-64 h-[40rem] w-[40rem] blur-[140px]"
        style={{
          background: 'radial-gradient(closest-side, var(--color-amethyst), transparent)',
          animation: 'bloom 17s ease-in-out infinite',
          animationDelay: '-6s',
        }}
      />
    </div>
  )
}

/** The one thing we want pressed. Hard corners, magenta fill, glow on hover. */
function Cta({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="border-2 border-magenta bg-magenta px-5 py-2.5 font-display text-[11px] tracking-wide
        text-plum uppercase transition-[box-shadow,background-color]
        hover:bg-magenta-soft hover:[box-shadow:0_0_24px_var(--color-magenta)]"
    >
      {children}
    </button>
  )
}

/** Everything else: outline only, so it never competes with the CTA. */
function Ghost({
  children,
  onClick,
  disabled,
  title,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  title?: string
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="border-2 border-plum-line px-5 py-2.5 font-display text-[11px] tracking-wide
        text-blush/70 uppercase transition-colors hover:border-magenta hover:text-magenta
        disabled:cursor-not-allowed disabled:border-plum-line disabled:text-blush/20
        disabled:hover:border-plum-line disabled:hover:text-blush/20"
    >
      {children}
    </button>
  )
}

/** A hard magenta pixel rather than a glyph — Silkscreen has no icon set, and
 *  anything fancier falls back to a different face mid-line. */
function Feature({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span className="h-1.5 w-1.5 shrink-0 bg-magenta" />
      {children}
    </li>
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

/** The mark, rendered as hard pixels — a grid of magenta cells, no anti-alias. */
function PixelDollar({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      aria-hidden
      className={`grid ${className}`}
      style={{
        gridTemplateColumns: 'repeat(6, 1fr)',
        gridAutoRows: '1fr',
        filter: 'drop-shadow(0 0 4px var(--color-magenta))',
        ...style,
      }}
    >
      {DOLLAR.flat().map((on, i) => (
        <span key={i} className={on ? 'bg-magenta' : ''} />
      ))}
    </div>
  )
}
