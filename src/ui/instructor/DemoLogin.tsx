import { useState, type ReactNode } from 'react'

/**
 * The gate in front of the demo dashboard at /teach/sample.
 *
 * READ THIS BEFORE TRUSTING IT. This is a stage prop, not security. Novus
 * ships as a static bundle, so this username and password are sitting in
 * public JavaScript that anyone can read, and the check happens in the
 * browser, where anyone can skip it. It keeps a passer-by out of a demo
 * screen; it protects nothing.
 *
 * That is acceptable here only because there is nothing behind it worth
 * protecting: /teach/sample is twelve invented students in this browser's
 * localStorage. Real classes live at /teach behind a real email sign-in, and
 * what a teacher may read there is enforced in Postgres. Never put this in
 * front of real student data.
 */

const USER = 'root'
const PASS = '12345'
const KEY = 'novus:teach-demo-unlocked'

export const demoUnlocked = () => {
  try {
    return sessionStorage.getItem(KEY) === 'yes'
  } catch {
    return false // private windows and blocked storage: ask again, no crash
  }
}

export function DemoLogin({ onUnlock }: { onUnlock: () => void }) {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (user.trim().toLowerCase() !== USER || pass !== PASS) {
      setError('That is not the demo username and password.')
      return
    }
    try {
      sessionStorage.setItem(KEY, 'yes')
    } catch {
      // storage refused: unlock for this view anyway
    }
    onUnlock()
  }

  return (
    <div className="mx-auto max-w-md pt-10">
      <h1 className="text-2xl font-semibold text-ink">Teacher dashboard</h1>
      <p className="mt-2 text-muted">
        The demo class, with twelve invented students. Sign in to open it.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-xl border border-line bg-panel-2 p-5">
        <Field label="Username">
          <input
            autoFocus
            value={user}
            onChange={(e) => setUser(e.target.value)}
            autoComplete="username"
            className={field}
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoComplete="current-password"
            className={field}
          />
        </Field>

        {error && <p className="text-sm text-coral">{error}</p>}

        <button
          type="submit"
          className="w-full rounded-md border border-marigold bg-marigold px-4 py-2.5 text-[15px] font-semibold text-night transition-colors hover:bg-marigold/90"
        >
          Open the dashboard
        </button>
      </form>

      <p className="mt-4 text-[13px] text-muted">
        This is a demo gate on invented data, not a security control. Real classes sign in by email
        at{' '}
        <a href="/teach" className="text-amethyst underline hover:text-marigold">
          /teach
        </a>
        .
      </p>
    </div>
  )
}

const field =
  'w-full rounded-md border border-line bg-panel px-3 py-2 text-[15px] text-ink placeholder:text-muted/60 focus:border-marigold focus:outline-none'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      {children}
    </label>
  )
}
