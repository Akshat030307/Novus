import type { GameState } from '@/sim/types'
import { migrate } from '@/state/migrate'
import { supabase, cloudEnabled, currentUser } from '@/lib/supabase'
import { useCloudStore, cloudFailed, cloudReason } from '@/state/cloud'

/**
 * Step 7 writes to the browser; step 14 adds Supabase behind the same two
 * functions. Always write locally first — if the network is down or nobody is
 * signed in, the game keeps working and the cloud catches up on the next save
 * or the next sign-in.
 *
 * Every Supabase call here checks its `{ error }`: the client resolves with a
 * failure rather than throwing, so a plain try/catch sees nothing and a
 * rejected write disappears silently. Outcomes go to `state/cloud.ts`, which
 * the HUD reads. Nothing in here may throw — the local copy is the guarantee.
 */
const KEY = 'novus:save:1'
const AT_KEY = 'novus:save:1:at' // ISO timestamp of the last local write, for newer-wins
/**
 * One world save, on purpose. Issue B2 asked for attempt history and the
 * temptation was to turn this into slots — but a career run and a record of
 * practice are different things with different lifetimes, so the log lives in
 * `state/attempts.ts` against its own table and this stays a single slot.
 */
const SLOT = 1

const localAt = () => localStorage.getItem(AT_KEY) ?? ''
const cloud = () => useCloudStore.getState()


export async function saveGame(state: GameState): Promise<void> {
  const now = new Date().toISOString()
  localStorage.setItem(KEY, JSON.stringify(state))
  localStorage.setItem(AT_KEY, now)

  const user = await currentUser()
  if (!supabase || !user) {
    cloud().report(cloudEnabled ? 'idle' : 'off')
    return
  }

  cloud().report('syncing')
  try {
    const { error } = await supabase
      .from('saves')
      .upsert(
        { user_id: user.id, slot: SLOT, state, updated_at: now },
        { onConflict: 'user_id,slot' },
      )
    if (error) cloudFailed('save', error.message)
    else cloud().report('saved', null, now)
  } catch (e) {
    // offline or blocked — the local copy is safe, retry on the next save
    cloudFailed('save', cloudReason(e))
  }
}

export async function loadGame(): Promise<GameState | null> {
  const local = readLocal()

  const user = await currentUser()
  if (supabase && user) {
    try {
      const { data, error } = await supabase
        .from('saves')
        .select('state, updated_at')
        .eq('user_id', user.id)
        .eq('slot', SLOT)
        .maybeSingle()
      if (error) {
        cloudFailed('load', error.message)
      } else if (data && (!local || String(data.updated_at) > localAt())) {
        cloud().report('saved', null, String(data.updated_at))
        return migrate(data.state)
      } else {
        cloud().report('saved')
      }
    } catch (e) {
      cloudFailed('load', cloudReason(e)) // fall through to the local copy
    }
  } else {
    cloud().report(cloudEnabled ? 'idle' : 'off')
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
    const { data, error } = await supabase
      .from('saves')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('slot', SLOT)
      .maybeSingle()
    if (error) {
      cloudFailed('lookup', error.message)
      return false
    }
    return Boolean(data)
  } catch (e) {
    cloudFailed('lookup', cloudReason(e))
    return false
  }
}

/** on sign-in, push a local save up when the cloud has nothing newer */
export async function syncOnLogin(): Promise<void> {
  const local = localStorage.getItem(KEY)
  if (!supabase || !local) return
  const user = await currentUser()
  if (!user) return

  cloud().report('syncing')
  try {
    const { data, error } = await supabase
      .from('saves')
      .select('updated_at')
      .eq('user_id', user.id)
      .eq('slot', SLOT)
      .maybeSingle()
    if (error) return cloudFailed('sync', error.message)
    if (data && String(data.updated_at) >= localAt()) {
      cloud().report('saved', null, String(data.updated_at)) // cloud is newer, keep it
      return
    }

    const at = localAt() || new Date().toISOString()
    const { error: writeError } = await supabase
      .from('saves')
      .upsert(
        { user_id: user.id, slot: SLOT, state: JSON.parse(local), updated_at: at },
        { onConflict: 'user_id,slot' },
      )
    if (writeError) cloudFailed('sync', writeError.message)
    else cloud().report('saved', null, at)
  } catch (e) {
    cloudFailed('sync', cloudReason(e)) // best effort — loadGame still has the local copy
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
