import { useState, useEffect, type FormEvent, type ReactNode } from 'react'
import { useUiStore, useGameStore } from '@/state/store'
import { hasSave, hasCloudSave, loadGame } from '@/state/save'
import { newGame } from '@/state/newGame'
import { cloudEnabled, sendMagicLink, signOut } from '@/lib/supabase'
import { useAuthStore } from '@/state/auth'
import { useSettingsStore } from '@/state/settings'
import { enterFullscreen } from '@/lib/fullscreen'

/**
 * The start screen at /play.
 *
 * It used to be the front door and do the selling. The front door is now
 * index.html — a static page with its own canvas work — so this is the thing
 * that starts a career: name yourself, carry on from a save, and optionally
 * sign in so progress follows you to another machine.
 *
 * It takes the palette and the three faces from that page, so crossing from
 * one to the other feels like one product: lime for the thing to press, the
 * same dark greys, Archivo for anything that announces itself.
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
    <main className="relative h-full overflow-y-auto bg-night">
      <Glow />

      <div className="relative z-10 flex min-h-full w-full flex-col px-6 py-7 sm:px-10 lg:px-16">
        <header className="anim-rise flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2.5" aria-label="Back to the Novus home page">
            <Mark />
            <span className="font-display text-[21px] font-black tracking-tight text-ink">NOVUS</span>
          </a>
          <a
            href="/teach"
            className="rounded-full border border-line px-4 py-2 text-[14px] font-semibold text-muted transition-colors hover:border-lime hover:text-lime"
          >
            For teachers
          </a>
        </header>

        <div className="my-auto grid items-center gap-10 py-10 lg:grid-cols-[0.9fr_1.3fr] lg:gap-16">
          <div className="flex flex-col items-start">
            <p
              className="anim-rise font-num text-[12px] tracking-[0.18em] text-lime uppercase"
              style={{ animationDelay: '40ms' }}
            >
              Day one · ₹5,00,000 · one city
            </p>

            <h1
              className="anim-rise mt-3 font-display text-[clamp(2.6rem,6vw,4.6rem)] leading-[0.95] font-extrabold tracking-tight text-ink"
              style={{ animationDelay: '80ms' }}
            >
              Make the call,
              <br />
              <span className="text-lime">live with it.</span>
            </h1>

            <p
              className="anim-rise mt-5 max-w-lg text-[17px] leading-relaxed text-muted"
              style={{ animationDelay: '140ms' }}
            >
              Walk a city that runs on money. Judge real loan files, trade a live market, and find
              out what your decisions were worth, graded on your reasoning, never on your luck.
            </p>

            <div className="anim-rise mt-8 w-full" style={{ animationDelay: '200ms' }}>
              {naming ? (
                <div className="w-full max-w-sm rounded-2xl border border-line bg-panel p-5">
                  <label
                    htmlFor="name"
                    className="mb-2 block font-num text-[12px] tracking-[0.14em] text-muted uppercase"
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
                    className="mb-4 w-full rounded-xl border border-line bg-panel-2 px-4 py-3 text-[16px] text-ink
                      placeholder:text-muted/40 focus:border-lime focus:outline-none"
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
              className="anim-rise mt-9 flex flex-wrap gap-x-5 gap-y-2 font-num text-[12px] tracking-[0.1em] text-muted uppercase"
              style={{ animationDelay: '260ms' }}
            >
              <Feature>Credit decisions</Feature>
              <Feature>Live market sim</Feature>
              <Feature>Academy and transcript</Feature>
            </ul>
          </div>

          {/* the trailer, not a still. preload="none" keeps the 11 MB off the
              page until someone presses play, and it never autoplays. */}
          <figure
            className="anim-rise relative rounded-2xl border border-line bg-panel p-2"
            style={{ animationDelay: '180ms', boxShadow: '0 30px 80px -40px rgba(198,255,61,0.35)' }}
          >
            <video
              src="/novus-demo.mp4"
              poster="/novus-demo-poster.jpg"
              controls
              playsInline
              preload="none"
              width={1920}
              height={1080}
              className="block aspect-video h-auto w-full rounded-xl bg-night"
              aria-label="Novus gameplay demo: the credit desk, the market, real-case replays, the day-end report, transcripts and the teacher dashboard"
            />
            <figcaption className="mt-2 px-1 font-num text-[11px] tracking-[0.1em] text-muted uppercase">
              Gameplay demo · 1:24 · sound on
            </figcaption>
          </figure>
        </div>

        <footer className="flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-sm">
            {cloudEnabled && authReady ? (
              user ? (
                <div className="flex items-center gap-3 text-[14px]">
                  <span className="font-num text-muted">{user.email}</span>
                  <button
                    onClick={() => void signOut()}
                    className="text-[13px] font-semibold text-muted transition-colors hover:text-lime"
                  >
                    Sign out
                  </button>
                </div>
              ) : linkSent ? (
                <p className="text-[14px] text-muted">Sign-in link sent. Check your email.</p>
              ) : (
                <>
                  <form onSubmit={sendLink} className="flex gap-2">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="min-w-0 flex-1 rounded-full border border-line bg-panel px-4 py-2.5 font-num text-[14px] text-ink
                        placeholder:text-muted/40 focus:border-lime focus:outline-none"
                    />
                    <Ghost type="submit">Send link</Ghost>
                  </form>
                  <p className="mt-2 text-[13px] text-muted/80">
                    Optional. Sign in to keep your progress across devices.
                  </p>
                </>
              )
            ) : null}
            {authError && <p className="mt-2 text-[14px] text-coral">{authError}</p>}
          </div>

          <p className="font-num text-[12px] tracking-[0.1em] text-muted/70 uppercase">
            Build 0.1 · single player · plays in the browser
          </p>
        </footer>
      </div>
    </main>
  )
}

/* ---------- pieces ---------- */

/** the same mark as the front door: a lime tile with a line that turns up */
function Mark() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="8" fill="var(--color-lime)" />
      <path
        d="M6 22l6-7 5 4 9-10"
        fill="none"
        stroke="var(--color-night)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** two slow washes behind everything — the only light in the room */
function Glow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute -top-56 -left-40 h-[34rem] w-[34rem] blur-[140px]"
        style={{
          background: 'radial-gradient(closest-side, rgba(198,255,61,0.16), transparent)',
          animation: 'bloom 13s ease-in-out infinite',
        }}
      />
      <div
        className="absolute -right-52 -bottom-60 h-[38rem] w-[38rem] blur-[150px]"
        style={{
          background: 'radial-gradient(closest-side, rgba(139,123,255,0.18), transparent)',
          animation: 'bloom 17s ease-in-out infinite',
          animationDelay: '-6s',
        }}
      />
    </div>
  )
}

/** the one thing we want pressed */
function Cta({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-lime bg-lime px-6
        text-[15px] font-semibold text-night transition-shadow hover:shadow-[0_0_0_6px_rgba(198,255,61,0.18)]"
    >
      {children}
    </button>
  )
}

/** everything else: outline only, so it never competes with the CTA */
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
      className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-ink/70 px-6 text-[15px]
        font-semibold text-ink transition-colors hover:bg-ink/10
        disabled:cursor-not-allowed disabled:border-line disabled:text-muted/40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}

function Feature({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
      {children}
    </li>
  )
}
