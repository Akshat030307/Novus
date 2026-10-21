/**
 * syllabus-plan: the one place Novus calls the TinyFish Agent while somebody
 * is using it.
 *
 * A teacher pastes a syllabus link on the dashboard. This function starts an
 * Agent run on it and returns at once; the dashboard then asks every few
 * seconds how it is going. A run takes minutes, longer than any single
 * request may stay open, which is why it is two calls and not one.
 *
 *   POST { action: 'start', url }  ->  { id }
 *   POST { action: 'poll',  id }   ->  { status: 'running' | 'done' | 'failed', result?, error?, seconds }
 *
 * The key never leaves this function. Who may spend it:
 *   - a signed-in account (the JWT is checked here, not trusted),
 *   - that owns at least one class,
 *   - at most DAILY_LIMIT starts in the last 24 hours, counted from the
 *     syllabus_runs table, which only this function can write.
 *
 * Secrets: TINYFISH_API_KEY (set it in the dashboard). SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY are provided by Supabase itself.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SYLLABUS_GOAL, SYLLABUS_SCHEMA, SYLLABUS_MAX_SECONDS, cleanSyllabus } from '../_shared/syllabus-spec.js'

const AGENT = 'https://agent.tinyfish.ai/v1'
const DAILY_LIMIT = 5

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

async function agent(path: string, init: RequestInit = {}) {
  const key = Deno.env.get('TINYFISH_API_KEY')
  if (!key) throw new Error('TINYFISH_API_KEY is not set on this function')
  const res = await fetch(AGENT + path, {
    ...init,
    signal: AbortSignal.timeout(25_000),
    headers: { 'X-API-Key': key, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  if (!res.ok) throw new Error(`TinyFish ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

/** only a public web address; nothing on this machine's network, nothing odd */
function acceptableUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 2000) return null
  try {
    const u = new URL(raw.trim())
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(u.hostname) || u.hostname.endsWith('.local')) return null
    return u.toString()
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return reply({ error: 'POST only' }, 405)

  // who is asking: verified against Supabase Auth, never read from the body
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: who } = await admin.auth.getUser(token)
  const user = who?.user
  if (!user) return reply({ error: 'Sign in to read a syllabus.' }, 401)

  let body: { action?: string; url?: string; id?: string }
  try {
    body = await req.json()
  } catch {
    return reply({ error: 'Send JSON.' }, 400)
  }

  if (body.action === 'start') {
    const url = acceptableUrl(body.url)
    if (!url) return reply({ error: 'That does not look like a web address for a syllabus.' }, 400)

    const { count: classes } = await admin.from('cohorts').select('id', { count: 'exact', head: true }).eq('owner', user.id)
    if (!classes) return reply({ error: 'Reading a syllabus is for teachers: create a class first.' }, 403)

    const since = new Date(Date.now() - 86_400_000).toISOString()
    const { count: used, error: countError } = await admin
      .from('syllabus_runs').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).gte('created_at', since)
    // the limit fails closed: if the runs cannot be counted, nothing is spent
    if (countError || used === null) {
      return reply({ error: 'The syllabus reader is not set up on this Novus install yet (docs/supabase.sql).' }, 503)
    }
    if (used >= DAILY_LIMIT) {
      return reply({ error: `That is ${DAILY_LIMIT} syllabus reads in the last 24 hours, the daily limit. Try again tomorrow.` }, 429)
    }

    let started: { run_id?: string; error?: unknown }
    try {
      started = await agent('/automation/run-async', {
        method: 'POST',
        body: JSON.stringify({
          url,
          goal: SYLLABUS_GOAL,
          output_schema: SYLLABUS_SCHEMA,
          browser_profile: 'lite',
          agent_config: { max_duration_seconds: SYLLABUS_MAX_SECONDS },
        }),
      })
    } catch (e) {
      return reply({ error: `TinyFish could not start: ${(e as Error).message}` }, 502)
    }
    if (!started.run_id) return reply({ error: 'TinyFish did not start a run.' }, 502)

    const { data: row, error } = await admin
      .from('syllabus_runs').insert({ user_id: user.id, url, run_id: started.run_id }).select('id').single()
    if (error) return reply({ error: `Could not record the run: ${error.message}` }, 500)
    return reply({ id: row.id, remainingToday: DAILY_LIMIT - used - 1 })
  }

  if (body.action === 'poll') {
    const { data: row } = await admin
      .from('syllabus_runs').select('*').eq('id', body.id ?? '').eq('user_id', user.id).maybeSingle()
    if (!row) return reply({ error: 'No such run.' }, 404)
    const seconds = Math.round(((row.finished_at ? Date.parse(row.finished_at) : Date.now()) - Date.parse(row.created_at)) / 1000)
    if (row.status !== 'running') return reply({ status: row.status, result: row.result, error: row.error, seconds })

    let run: { status?: string; result?: unknown; error?: { message?: string } }
    try {
      run = await agent(`/runs/${row.run_id}`)
    } catch {
      // a dropped status check is the network, not the run
      return reply({ status: 'running', seconds })
    }
    if (run.status === 'COMPLETED') {
      const result = { url: row.url, readAt: new Date().toISOString(), readBy: 'TinyFish Agent API', ...cleanSyllabus(run.result) }
      const status = result.courses.length ? 'done' : 'failed'
      const error = result.courses.length ? null : 'TinyFish read the page but found no courses with units on it.'
      await admin.from('syllabus_runs').update({ status, result, error, finished_at: new Date().toISOString() }).eq('id', row.id)
      return reply({ status, result, error, seconds })
    }
    if (run.status === 'FAILED' || run.status === 'CANCELLED') {
      const error = `TinyFish could not read it: ${run.error?.message ?? run.status.toLowerCase()}`
      await admin.from('syllabus_runs').update({ status: 'failed', error, finished_at: new Date().toISOString() }).eq('id', row.id)
      return reply({ status: 'failed', error, seconds })
    }
    return reply({ status: 'running', seconds })
  }

  return reply({ error: 'Unknown action.' }, 400)
})
