import { createClient, type Session } from '@supabase/supabase-js'

/**
 * Step 14. Client and auth, nothing else. `state/save.ts` decides when to talk
 * to the cloud; the game never imports this. When the env vars are missing,
 * `cloudEnabled` is false and everything falls back to browser storage.
 *
 *   saves ( user_id uuid, slot int, state jsonb, updated_at timestamptz )
 *
 * RLS is on, so a player only ever reaches their own row.
 */

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const cloudEnabled = Boolean(url && key)

export const supabase = cloudEnabled ? createClient(url, key) : null

export interface AuthUser {
  id: string
  email: string
}

function toUser(session: Session | null): AuthUser | null {
  const u = session?.user
  return u?.email ? { id: u.id, email: u.email } : null
}

/** current signed-in user, from the persisted session */
export async function currentUser(): Promise<AuthUser | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return toUser(data.session)
}

/** subscribe to sign-in / sign-out; returns an unsubscribe fn */
export function onAuthChange(cb: (user: AuthUser | null, event: string) => void): () => void {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((event, session) => cb(toUser(session), event))
  return () => data.subscription.unsubscribe()
}

/** email a one-time sign-in link back to this origin */
export async function sendMagicLink(email: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Cloud save is not configured.' }
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  })
  return { error: error?.message ?? null }
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut()
}
