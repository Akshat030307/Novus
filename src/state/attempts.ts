import { create } from 'zustand'
import type { Attempt, NewAttempt } from '@/sim/attempts'
import { supabase, currentUser } from '@/lib/supabase'
import { cloudNote, cloudReason } from '@/state/cloud'

/**
 * Issue B2. The attempt log: every drill run and every module check, kept.
 *
 * Separate from the world save on purpose. The save is one slot and gets
 * overwritten constantly; this is append-only and nothing in it is ever
 * rewritten, because "3/5 then 5/5 two days later" is the whole point and
 * keeping only the best score destroys it.
 *
 * Local first, like everything else here. Signed out, the log still builds up
 * in the browser and the panels still show it; signing in pushes what has not
 * been pushed yet and pulls anything from another device.
 *
 * Nothing in here may throw. A drill that crashes because the network is down
 * would be a much worse bug than a missing row.
 */
const KEY = 'novus:attempts:1'
/** ids already sent to the cloud, so signing in on a shared browser can't claim someone else's runs */
const PUSHED_KEY = 'novus:attempts:1:pushed'
/** plenty for a term's work, and keeps localStorage small */
const CAP = 500

interface AttemptsStore {
  attempts: Attempt[]
  /** false until the first local read has happened */
  ready: boolean
  /**
   * Why the log last failed to reach the cloud, if it did. Kept here rather
   * than on the save indicator: the local log is intact either way, and this
   * is not a reason to tell someone their game didn't save.
   */
  error: string | null
  record: (attempt: NewAttempt) => void
  hydrate: () => Promise<void>
}

function readLocal(): Attempt[] {
  try {
    const raw = localStorage.getItem(KEY)
    const list: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? (list as Attempt[]) : []
  } catch {
    return [] // corrupt log — an empty history beats a crash on load
  }
}

function writeLocal(attempts: Attempt[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(attempts.slice(0, CAP)))
  } catch {
    /* quota or private mode — the cloud copy is still going out */
  }
}

const pushedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(PUSHED_KEY)
    return new Set<string>(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function markPushed(ids: string[]) {
  try {
    const all = pushedIds()
    for (const id of ids) all.add(id)
    localStorage.setItem(PUSHED_KEY, JSON.stringify([...all].slice(-CAP)))
  } catch {
    /* see writeLocal */
  }
}

const rowOf = (a: Attempt, userId: string) => ({
  id: a.id,
  user_id: userId,
  kind: a.kind,
  ref_id: a.refId,
  score: a.score,
  out_of: a.outOf,
  passed: a.passed,
  detail: a.detail ?? null,
  attempted_at: a.at,
})

interface AttemptRow {
  id: string
  kind: string
  ref_id: string
  score: number
  out_of: number
  passed: boolean
  detail: Record<string, number> | null
  attempted_at: string
}

const attemptOf = (r: AttemptRow): Attempt => ({
  id: r.id,
  kind: r.kind === 'module' ? 'module' : 'drill',
  refId: r.ref_id,
  score: r.score,
  outOf: r.out_of,
  passed: r.passed,
  at: String(r.attempted_at),
  detail: r.detail ?? undefined,
})

/** newest first, one row per id */
function merge(a: Attempt[], b: Attempt[]): Attempt[] {
  const byId = new Map<string, Attempt>()
  for (const at of [...a, ...b]) byId.set(at.id, at)
  return [...byId.values()].sort((x, y) => (x.at < y.at ? 1 : -1))
}

export const useAttemptsStore = create<AttemptsStore>((set, get) => ({
  attempts: [],
  ready: false,
  error: null,

  record: (attempt) => {
    const full: Attempt = {
      ...attempt,
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
    }
    const next = merge([full], get().attempts)
    set({ attempts: next, ready: true })
    writeLocal(next)
    void push([full])
  },

  hydrate: async () => {
    const local = readLocal()
    set({ attempts: local, ready: true })

    const user = await currentUser()
    if (!supabase || !user) return

    // send anything logged while signed out, then take whatever else is there
    await push(local.filter((a) => !pushedIds().has(a.id)))

    try {
      const { data, error } = await supabase
        .from('attempts')
        .select('id, kind, ref_id, score, out_of, passed, detail, attempted_at')
        .eq('user_id', user.id)
        .order('attempted_at', { ascending: false })
        .limit(CAP)
      if (error) return set({ error: cloudNote('attempts load', error.message) })

      const next = merge(get().attempts, (data ?? []).map(attemptOf))
      markPushed(next.map((a) => a.id))
      set({ attempts: next, error: null })
      writeLocal(next)
    } catch (e) {
      set({ error: cloudNote('attempts load', cloudReason(e)) })
    }
  },
}))

/** best effort — an unsent attempt goes up on the next hydrate */
async function push(attempts: Attempt[]) {
  if (!supabase || attempts.length === 0) return
  const user = await currentUser()
  if (!user) return

  try {
    // ignoreDuplicates, so a re-push is a no-op rather than an edit — there is
    // no UPDATE policy on the table and there is not meant to be one
    const { error } = await supabase
      .from('attempts')
      .upsert(attempts.map((a) => rowOf(a, user.id)), {
        onConflict: 'id',
        ignoreDuplicates: true,
      })
    if (error) {
      useAttemptsStore.setState({ error: cloudNote('attempt log', error.message) })
      return
    }
    markPushed(attempts.map((a) => a.id))
    useAttemptsStore.setState({ error: null })
  } catch (e) {
    useAttemptsStore.setState({ error: cloudNote('attempt log', cloudReason(e)) })
  }
}

/**
 * Convenience for the runners — one call, no selector boilerplate. Named
 * `logAttempt` rather than `recordAttempt` because `sim/modules.ts` already
 * owns that name for the in-save best-score bookkeeping, and the two do
 * genuinely different jobs.
 */
export const logAttempt = (attempt: NewAttempt) => useAttemptsStore.getState().record(attempt)
