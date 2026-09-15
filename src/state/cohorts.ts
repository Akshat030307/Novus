import type { Attempt } from '@/sim/attempts'
import type { Assignment, CohortMember, MemberSummary } from '@/sim/cohort'
import { supabase, currentUser } from '@/lib/supabase'
import { cloudNote, cloudReason } from '@/state/cloud'

/**
 * Issue B3. Everything that talks to the cohort tables.
 *
 * The privacy boundary is enforced in Postgres, not here — see
 * `docs/supabase.sql`. This file could be rewritten by anyone with the anon
 * key and it would still be unable to read a save, a transcript, or the
 * attempts of somebody not in a cohort the caller owns. That is the only kind
 * of boundary worth having in a client-side app.
 */

export type Result<T> = { ok: true; value: T } | { ok: false; error: string }
const fail = (error: string): Result<never> => ({ ok: false, error })

const NOT_SET_UP = /schema cache|does not exist/i
const readable = (message: string) =>
  NOT_SET_UP.test(message)
    ? 'Cohorts are not set up on this Novus install yet — docs/supabase.sql has to be run once on the project.'
    : message

export interface Cohort {
  id: string
  name: string
  joinCode: string
  createdAt: string
}

interface CohortRow {
  id: string
  name: string
  join_code: string
  created_at: string
}
const cohortOf = (r: CohortRow): Cohort => ({
  id: r.id,
  name: r.name,
  joinCode: r.join_code,
  createdAt: String(r.created_at),
})

/* ---------- instructor side ---------- */

export async function myCohorts(): Promise<Cohort[]> {
  if (!supabase) return []
  const user = await currentUser()
  if (!user) return []
  try {
    const { data, error } = await supabase
      .from('cohorts')
      .select('id, name, join_code, created_at')
      .eq('owner', user.id)
      .order('created_at', { ascending: false })
    if (error) {
      cloudNote('cohort list', error.message)
      return []
    }
    return (data ?? []).map((r) => cohortOf(r as CohortRow))
  } catch (e) {
    cloudNote('cohort list', cloudReason(e))
    return []
  }
}

export async function createCohort(name: string): Promise<Result<Cohort>> {
  if (!supabase) return fail('Cloud save is not configured.')
  const user = await currentUser()
  if (!user) return fail('Sign in first.')
  try {
    const { data, error } = await supabase
      .from('cohorts')
      .insert({ owner: user.id, name: name.trim() || 'Untitled cohort' })
      .select('id, name, join_code, created_at')
      .single()
    if (error) return fail(readable(cloudNote('cohort create', error.message)))
    return { ok: true, value: cohortOf(data as CohortRow) }
  } catch (e) {
    return fail(readable(cloudNote('cohort create', cloudReason(e))))
  }
}

export async function listMembers(cohortId: string): Promise<CohortMember[]> {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from('cohort_members')
      .select('user_id, display_name, summary, joined_at')
      .eq('cohort_id', cohortId)
    if (error) {
      cloudNote('cohort members', error.message)
      return []
    }
    return (data ?? []).map((r) => {
      const row = r as {
        user_id: string
        display_name: string
        summary: MemberSummary | null
        joined_at: string
      }
      return {
        userId: row.user_id,
        displayName: row.display_name,
        summary: row.summary ?? null,
        joinedAt: String(row.joined_at),
      }
    })
  } catch (e) {
    cloudNote('cohort members', cloudReason(e))
    return []
  }
}

export async function listAssignments(cohortId: string): Promise<Assignment[]> {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from('assignments')
      .select('id, kind, ref_id, title, due_at')
      .eq('cohort_id', cohortId)
      .order('created_at', { ascending: true })
    if (error) {
      cloudNote('assignments', error.message)
      return []
    }
    return (data ?? []).map((r) => {
      const row = r as { id: string; kind: string; ref_id: string; title: string; due_at: string | null }
      return {
        id: row.id,
        kind: row.kind === 'module' ? 'module' : 'drill',
        refId: row.ref_id,
        title: row.title,
        dueAt: row.due_at ? String(row.due_at) : null,
      }
    })
  } catch (e) {
    cloudNote('assignments', cloudReason(e))
    return []
  }
}

export async function addAssignment(
  cohortId: string,
  assignment: Omit<Assignment, 'id'>,
): Promise<Result<Assignment>> {
  if (!supabase) return fail('Cloud save is not configured.')
  try {
    const { data, error } = await supabase
      .from('assignments')
      .insert({
        cohort_id: cohortId,
        kind: assignment.kind,
        ref_id: assignment.refId,
        title: assignment.title,
        due_at: assignment.dueAt,
      })
      .select('id, kind, ref_id, title, due_at')
      .single()
    if (error) return fail(readable(cloudNote('assign', error.message)))
    const row = data as { id: string; due_at: string | null }
    return { ok: true, value: { ...assignment, id: row.id, dueAt: row.due_at } }
  } catch (e) {
    return fail(readable(cloudNote('assign', cloudReason(e))))
  }
}

export async function removeAssignment(id: string): Promise<void> {
  if (!supabase) return
  try {
    const { error } = await supabase.from('assignments').delete().eq('id', id)
    if (error) cloudNote('unassign', error.message)
  } catch (e) {
    cloudNote('unassign', cloudReason(e))
  }
}

/**
 * The cohort's attempts. The policy in Postgres decides whose rows come back;
 * asking for more than the caller teaches simply returns less.
 */
export async function cohortAttempts(userIds: string[]): Promise<(Attempt & { userId: string })[]> {
  if (!supabase || userIds.length === 0) return []
  try {
    const { data, error } = await supabase
      .from('attempts')
      .select('id, user_id, kind, ref_id, score, out_of, passed, detail, attempted_at')
      .in('user_id', userIds)
      .order('attempted_at', { ascending: false })
      .limit(2000)
    if (error) {
      cloudNote('cohort attempts', error.message)
      return []
    }
    return (data ?? []).map((r) => {
      const row = r as {
        id: string
        user_id: string
        kind: string
        ref_id: string
        score: number
        out_of: number
        passed: boolean
        detail: Record<string, number> | null
        attempted_at: string
      }
      return {
        id: row.id,
        userId: row.user_id,
        kind: row.kind === 'module' ? 'module' : 'drill',
        refId: row.ref_id,
        score: row.score,
        outOf: row.out_of,
        passed: row.passed,
        at: String(row.attempted_at),
        detail: row.detail ?? undefined,
      }
    })
  } catch (e) {
    cloudNote('cohort attempts', cloudReason(e))
    return []
  }
}

/* ---------- student side ---------- */

export interface Membership {
  cohortId: string
  cohortName: string
}

export async function joinCohort(code: string, displayName: string): Promise<Result<Membership>> {
  if (!supabase) return fail('Cloud save is not configured.')
  const user = await currentUser()
  if (!user) return fail('Sign in before joining a cohort.')
  try {
    const { data, error } = await supabase.rpc('join_cohort', {
      p_code: code.trim().toUpperCase(),
      p_name: displayName,
    })
    if (error) return fail(readable(error.message))
    const rows = (data ?? []) as { out_cohort_id: string; out_cohort_name: string }[]
    if (rows.length === 0) return fail('No cohort has that code.')
    return { ok: true, value: { cohortId: rows[0].out_cohort_id, cohortName: rows[0].out_cohort_name } }
  } catch (e) {
    return fail(readable(cloudReason(e)))
  }
}

/** every cohort the signed-in player belongs to */
export async function myMemberships(): Promise<Membership[]> {
  if (!supabase) return []
  const user = await currentUser()
  if (!user) return []
  try {
    const { data, error } = await supabase
      .from('cohort_members')
      .select('cohort_id, cohorts ( name )')
      .eq('user_id', user.id)
    if (error) {
      cloudNote('memberships', error.message)
      return []
    }
    return (data ?? []).map((r) => {
      const row = r as { cohort_id: string; cohorts: { name: string } | { name: string }[] | null }
      const joined = Array.isArray(row.cohorts) ? row.cohorts[0] : row.cohorts
      return { cohortId: row.cohort_id, cohortName: joined?.name ?? 'A cohort' }
    })
  } catch (e) {
    cloudNote('memberships', cloudReason(e))
    return []
  }
}

/** publish the player's own progress summary to every cohort they are in */
export async function publishSummary(summary: MemberSummary): Promise<void> {
  if (!supabase) return
  const user = await currentUser()
  if (!user) return
  try {
    const { error } = await supabase
      .from('cohort_members')
      .update({ summary, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
    if (error) cloudNote('publish summary', error.message)
  } catch (e) {
    cloudNote('publish summary', cloudReason(e))
  }
}

export async function leaveCohort(cohortId: string): Promise<void> {
  if (!supabase) return
  const user = await currentUser()
  if (!user) return
  try {
    const { error } = await supabase
      .from('cohort_members')
      .delete()
      .eq('cohort_id', cohortId)
      .eq('user_id', user.id)
    if (error) cloudNote('leave cohort', error.message)
  } catch (e) {
    cloudNote('leave cohort', cloudReason(e))
  }
}
