import { supabase } from '@/lib/supabase'
import type { SyllabusRead } from '@/sim/syllabus'

/**
 * Talking to the `syllabus-plan` Supabase function, which runs the TinyFish
 * Agent on a teacher's syllabus link. The key lives there, never here: this
 * file only says "start" and then "how is it going".
 */

export type ReadStatus =
  | { status: 'running'; seconds: number }
  | { status: 'done'; seconds: number; result: SyllabusRead }
  | { status: 'failed'; seconds: number; error: string }

async function call(body: Record<string, unknown>): Promise<{ ok: true; data: any } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'Cloud features are not configured on this install.' }
  const { data, error } = await supabase.functions.invoke('syllabus-plan', { body })
  if (!error) return { ok: true, data }
  // the function's own words, when it sent some, beat the client's generic ones
  try {
    const ctx = (error as { context?: Response }).context
    const said = ctx ? await ctx.json() : null
    if (said?.error) return { ok: false, error: said.error }
  } catch {
    /* fall through */
  }
  return {
    ok: false,
    error: /not found|404/i.test(error.message)
      ? 'The syllabus reader is not deployed on this Novus install yet.'
      : error.message,
  }
}

export async function startRead(url: string) {
  const r = await call({ action: 'start', url })
  return r.ok ? { ok: true as const, id: String(r.data.id), remainingToday: Number(r.data.remainingToday ?? 0) } : r
}

export async function pollRead(id: string): Promise<ReadStatus | { status: 'error'; error: string }> {
  const r = await call({ action: 'poll', id })
  if (!r.ok) return { status: 'error', error: r.error }
  return r.data as ReadStatus
}

/** the teacher's most recent read, so a reload picks up where it left off for free */
export async function latestRead(): Promise<{ id: string; status: string; result: SyllabusRead | null; url: string } | null> {
  if (!supabase) return null
  const { data } = await supabase
    .from('syllabus_runs')
    .select('id, status, result, url')
    .order('created_at', { ascending: false })
    .limit(1)
  const row = data?.[0] as { id: string; status: string; result: SyllabusRead | null; url: string } | undefined
  return row ?? null
}
