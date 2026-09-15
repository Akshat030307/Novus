import type { TranscriptDoc } from '@/sim/transcript'
export { codeFromLocation } from '@/sim/transcript'
import { supabase, currentUser } from '@/lib/supabase'
import { cloudNote, cloudReason } from '@/state/cloud'

/**
 * Issue B1. Issuing and verifying a report card.
 *
 * A transcript row is written once and never touched again — the table has no
 * UPDATE and no DELETE policy, and that absence is the feature. What the code
 * proves is narrow and worth stating plainly wherever it is shown:
 *
 *   it proves this document came out of the game, under this account, at the
 *   time the database recorded — and that nobody has edited it since.
 *
 *   it does not prove how the run was played. Nothing client-side can.
 *
 * Verification goes through a `security definer` function rather than a public
 * read policy, so holding one code reads one transcript and gives no way to
 * list or enumerate the rest.
 *
 * Schema and policies: docs/supabase.sql.
 */

export interface IssuedTranscript {
  code: string
  playerName: string
  doc: TranscriptDoc
  issuedAt: string
}

export type Issued<T> = { ok: true; value: T } | { ok: false; error: string }

const fail = (error: string): Issued<never> => ({ ok: false, error })

interface TranscriptRow {
  code: string
  player_name: string
  body: TranscriptDoc
  issued_at: string
}

const issuedOf = (r: TranscriptRow): IssuedTranscript => ({
  code: r.code,
  playerName: r.player_name,
  doc: r.body,
  issuedAt: String(r.issued_at),
})

/** the shareable address for a code — `/t/<code>`, with `?t=` as a fallback */
export function verifyUrl(code: string): string {
  if (typeof window === 'undefined') return `/t/${code}`
  return `${window.location.origin}/t/${code}`
}

/**
 * Write the transcript and let the database mint the code and the timestamp.
 * Both are server-side deliberately: a code the client chose and a time the
 * client claimed would be worth nothing.
 */
export async function issueTranscript(
  doc: TranscriptDoc,
): Promise<Issued<IssuedTranscript>> {
  if (!supabase) return fail('Cloud save is not configured, so there is nothing to issue against.')
  const user = await currentUser()
  if (!user) return fail('Sign in first — a transcript has to be issued against an account.')

  try {
    const { data, error } = await supabase
      .from('transcripts')
      .insert({ user_id: user.id, player_name: doc.player, body: doc })
      .select('code, player_name, body, issued_at')
      .single()
    if (error) return fail(cloudNote('transcript issue', error.message))
    return { ok: true, value: issuedOf(data as TranscriptRow) }
  } catch (e) {
    return fail(cloudNote('transcript issue', cloudReason(e)))
  }
}

/** every transcript this account has issued, newest first */
export async function myTranscripts(): Promise<IssuedTranscript[]> {
  if (!supabase) return []
  const user = await currentUser()
  if (!user) return []

  try {
    const { data, error } = await supabase
      .from('transcripts')
      .select('code, player_name, body, issued_at')
      .eq('user_id', user.id)
      .order('issued_at', { ascending: false })
      .limit(20)
    if (error) {
      cloudNote('transcript list', error.message)
      return []
    }
    return (data ?? []).map((r) => issuedOf(r as TranscriptRow))
  } catch (e) {
    cloudNote('transcript list', cloudReason(e))
    return []
  }
}

/** look a code up. No sign-in needed — this is the instructor's side. */
export async function verifyTranscript(code: string): Promise<Issued<IssuedTranscript>> {
  if (!supabase) return fail('This copy of Novus has no cloud configured, so codes cannot be checked here.')
  try {
    const { data, error } = await supabase.rpc('verify_transcript', { p_code: code })
    if (error) return fail(error.message)
    const rows = (data ?? []) as TranscriptRow[]
    if (rows.length === 0) return fail('No transcript has been issued with that code.')
    return { ok: true, value: issuedOf(rows[0]) }
  } catch (e) {
    return fail(cloudReason(e))
  }
}
