import type { GameState } from '@/sim/types'
import { migrate } from '@/state/migrate'
import { supabase, currentUser } from '@/lib/supabase'

/**
 * Step 7 writes to the browser; step 14 adds Supabase behind the same two
 * functions. Always write locally first — if the network is down or nobody is
 * signed in, the game keeps working and the cloud catches up on the next save
 * or the next sign-in.
 */
const KEY = 'novus:save:1'
const AT_KEY = 'novus:save:1:at' // ISO timestamp of the last local write, for newer-wins
const SLOT = 1

const localAt = () => localStorage.getItem(AT_KEY) ?? ''

export async function saveGame(state: GameState): Promise<void> {
  const now = new Date().toISOString()
  localStorage.setItem(KEY, JSON.stringify(state))
  localStorage.setItem(AT_KEY, now)

  const user = await currentUser()
  if (!supabase || !user) return
  try {
    await supabase
      .from('saves')
      .upsert(
        { user_id: user.id, slot: SLOT, state, updated_at: now },
        { onConflict: 'user_id,slot' },
      )
  } catch {
    // offline or rejected — the local copy is safe, retry on the next save
  }
}

export async function loadGame(): Promise<GameState | null> {
  const local = readLocal()

  const user = await currentUser()
  if (supabase && user) {
    try {
      const { data } = await supabase
        .from('saves')
        .select('state, updated_at')
        .eq('user_id', user.id)
        .eq('slot', SLOT)
        .maybeSingle()
      if (data && (!local || String(data.updated_at) > localAt())) {
        return migrate(data.state)
      }
    } catch {
      // fall through to the local copy
    }
  }
  return local
}

export function hasSave(): boolean {
  return localStorage.getItem(KEY) !== null
}

/** does the signed-in user have a cloud save? async — the home screen awaits it */
export async function hasCloudSave(): Promise<boolean> {
  const user = await currentUser()
  if (!supabase || !user) return false
  try {
    const { data } = await supabase
      .from('saves')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('slot', SLOT)
      .maybeSingle()
    return Boolean(data)
  } catch {
    return false
  }
}

/** on sign-in, push a local save up when the cloud has nothing newer */
export async function syncOnLogin(): Promise<void> {
  const local = localStorage.getItem(KEY)
  if (!supabase || !local) return
  const user = await currentUser()
  if (!user) return
  try {
    const { data } = await supabase
      .from('saves')
      .select('updated_at')
      .eq('user_id', user.id)
      .eq('slot', SLOT)
      .maybeSingle()
    if (data && String(data.updated_at) >= localAt()) return // cloud is newer, keep it
    await supabase
      .from('saves')
      .upsert(
        {
          user_id: user.id,
          slot: SLOT,
          state: JSON.parse(local),
          updated_at: localAt() || new Date().toISOString(),
        },
        { onConflict: 'user_id,slot' },
      )
  } catch {
    // best effort — loadGame still has the local copy
  }
}

function readLocal(): GameState | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    return migrate(JSON.parse(raw))
  } catch {
    return null // corrupt save — fall back to "no save" rather than crash
  }
}
