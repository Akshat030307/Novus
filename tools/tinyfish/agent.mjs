/**
 * The TinyFish Agent API, for the build-time scripts that need a browser
 * rather than a search box: a listing to page through, an order to open, a
 * PDF behind a link. Search and Fetch read one page; the agent is given a
 * starting url and a goal and does the clicking.
 *
 * Same rules as the other TinyFish scripts: it runs here, never in the
 * browser, the key is TINYFISH_API_KEY in .env, and what comes back is a
 * candidate for a person to read, never a direct edit of game data.
 *
 * Every call passes an output_schema, so the result is typed fields to check,
 * not prose to parse. A run takes tens of seconds, so it is started with
 * /run-async and polled.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const BASE = 'https://agent.tinyfish.ai/v1'
const POLL_MS = 5000

/** .env, read by hand — this is a build-time script, not the app */
export function env(name) {
  if (process.env[name]) return process.env[name]
  const file = root + '/.env'
  if (!existsSync(file)) return undefined
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && m[1] === name) return m[2].replace(/^["']|["']$/g, '')
  }
  return undefined
}

export function requireKey() {
  const key = env('TINYFISH_API_KEY')
  if (!key) {
    console.error(
      '\nTINYFISH_API_KEY is not set.\n' +
        'Create a key at https://agent.tinyfish.ai/api-keys, then add this line to .env:\n' +
        '  TINYFISH_API_KEY=your-key-here\n',
    )
    process.exit(1)
  }
  return key
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * The Agent API refuses an output_schema that carries `description` fields
 * (400 INVALID_INPUT). They are kept in the schemas in this folder as notes
 * for the reader, and stripped here on the way out.
 */
export function wireSchema(schema) {
  if (Array.isArray(schema)) return schema.map(wireSchema)
  if (!schema || typeof schema !== 'object') return schema
  const out = {}
  for (const [k, v] of Object.entries(schema)) if (k !== 'description') out[k] = wireSchema(v)
  return out
}

async function call(key, path, init = {}, timeoutMs = 60_000) {
  // every request gets its own deadline: a hung connection must not sit for
  // five minutes while the run it was asking about finishes without us
  const res = await fetch(BASE + path, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'X-API-Key': key, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  if (!res.ok) throw new Error(`agent ${path} ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return res.json()
}

/**
 * Start a run, wait for it, return its result object.
 *
 *   url, goal       where to start and what to bring back
 *   schema          JSON schema for the result (required — see the note above)
 *   stealth         'stealth' browser profile, for sites that turn bots away
 *   maxSeconds      wall-clock cap on the run
 */
export async function runAgent(key, { url, goal, schema, stealth = false, maxSeconds = 300, runId = null, onStart }) {
  let id = runId
  if (!id) {
    const started = await call(key, '/automation/run-async', {
      method: 'POST',
      body: JSON.stringify({
        url,
        goal,
        output_schema: wireSchema(schema),
        browser_profile: stealth ? 'stealth' : 'lite',
        agent_config: { max_duration_seconds: maxSeconds },
      }),
    }, 120_000)
    if (!started.run_id) throw new Error(`run not created: ${JSON.stringify(started.error ?? started)}`)
    id = started.run_id
  }
  // said out loud at once, so a crash below never loses a run already paid for
  onStart?.(id)

  const deadline = Date.now() + (maxSeconds + 120) * 1000
  let misses = 0
  for (;;) {
    await sleep(POLL_MS)
    let run
    try {
      run = await call(key, `/runs/${id}`, {}, 30_000)
      misses = 0
    } catch (e) {
      // a dropped poll is the network, not the run: try again, give up after a few
      if (++misses > 6) throw new Error(`run ${id}: status unreachable (${e.message}); resume with its id`)
      continue
    }
    if (run.status === 'COMPLETED') {
      // a bare list or plain-text answer comes back wrapped as result.result
      return { runId: run.run_id ?? id, steps: run.num_of_steps, result: run.result ?? {} }
    }
    if (run.status === 'FAILED' || run.status === 'CANCELLED') {
      const e = run.error ?? {}
      throw new Error(`run ${id} ${run.status}: ${e.category ?? ''} ${e.message ?? ''}`.trim())
    }
    if (Date.now() > deadline) throw new Error(`run ${id} still ${run.status} after the deadline; resume with its id`)
  }
}
