/**
 * A real class, in the real database, for a demo in front of a room.
 *
 * The sample at /teach/sample is invented data in one browser. This is the
 * same twelve students as actual Supabase accounts, in an actual cohort you
 * own, with their attempts in the attempts table — so the dashboard a judge
 * is looking at is reading real rows through the real policies, and a student
 * who plays during the demo changes it while they watch.
 *
 * The people are still invented. The names come from data/sample-class.ts and
 * belong to nobody; the addresses are on a domain you own so no mail can ever
 * reach a stranger. Say that out loud when you show it.
 *
 *   node tools/seed-demo-class.mjs --teacher you@email.com      # build it
 *   node tools/seed-demo-class.mjs --signin 3                   # sign in as student 3
 *   node tools/seed-demo-class.mjs --list                       # what exists now
 *   node tools/seed-demo-class.mjs --clean                      # remove it all
 *
 * Options: --students 10 (default 12) · --name "FY B.Com · Tuesday group"
 *          --domain demo.yourdomain.com
 *
 * NEEDS THE SERVICE ROLE KEY. Creating users and writing rows as somebody
 * else is exactly what RLS exists to stop, so this cannot be done with the
 * anon key the game ships. Put it in .env, which is gitignored:
 *
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *
 * It has no VITE_ prefix, so Vite cannot bundle it even by accident. Never
 * paste it anywhere else: it reads and writes every table, past every policy.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const arg = (name, fallback) => {
  const i = process.argv.indexOf('--' + name)
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : fallback
}
const has = (name) => process.argv.includes('--' + name)

function env(name) {
  if (process.env[name]) return process.env[name]
  const file = root + '/.env'
  if (!existsSync(file)) return undefined
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && m[1] === name) return m[2].replace(/^["']|["']$/g, '')
  }
  return undefined
}

const URL_ = (env('SUPABASE_URL') || env('VITE_SUPABASE_URL') || '').replace(/\/$/, '')
const SERVICE = env('SUPABASE_SERVICE_ROLE_KEY')
const DOMAIN = arg('domain', 'demo.akshatchowdhary.online')
const CLASS_NAME = arg('name', 'FY B.Com · Finance elective, Tuesday group')
const HOW_MANY = Number(arg('students', 12))

if (!URL_ || !SERVICE) {
  console.error(
    '\nSUPABASE_SERVICE_ROLE_KEY is not set (and SUPABASE_URL must be reachable).\n' +
      'Find the service_role key in Supabase → Project Settings → API, and add it to .env:\n' +
      '  SUPABASE_SERVICE_ROLE_KEY=...\n' +
      '.env is gitignored. The key bypasses every policy — keep it off slides and out of commits.\n',
  )
  process.exit(1)
}

const admin = (path, init = {}) =>
  fetch(`${URL_}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })

const rest = (path, init = {}) =>
  fetch(`${URL_}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers ?? {}),
    },
  })

const ok = async (res, what) => {
  if (!res.ok) throw new Error(`${what}: ${res.status} ${(await res.text()).slice(0, 300)}`)
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

/** every demo account that exists right now, by email */
async function demoUsers() {
  const out = new Map()
  for (let page = 1; page <= 20; page++) {
    const data = await ok(await admin(`/admin/users?page=${page}&per_page=200`), 'list users')
    const users = data.users ?? []
    for (const u of users) if (u.email?.endsWith('@' + DOMAIN)) out.set(u.email, u)
    if (users.length < 200) break
  }
  return out
}

async function findTeacher(email) {
  for (let page = 1; page <= 20; page++) {
    const data = await ok(await admin(`/admin/users?page=${page}&per_page=200`), 'list users')
    const users = data.users ?? []
    const hit = users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (hit) return hit
    if (users.length < 200) break
  }
  return null
}

const emailFor = (i) => `student${String(i + 1).padStart(2, '0')}@${DOMAIN}`

/* ---------------- what each command does ---------------- */

if (has('list')) {
  const users = await demoUsers()
  console.log(`${users.size} demo accounts on @${DOMAIN}`)
  for (const [email, u] of users) console.log('  ', email.padEnd(40), u.id)
  const cohorts = await ok(await rest(`/cohorts?select=id,name,join_code,created_at`), 'cohorts')
  console.log(`\n${cohorts.length} cohorts in the project`)
  for (const c of cohorts) console.log('  ', c.join_code, c.name)
  process.exit(0)
}

if (has('signin')) {
  const which = Number(arg('signin', '1'))
  const email = emailFor(which - 1)
  const data = await ok(
    await admin('/admin/generate_link', {
      method: 'POST',
      body: JSON.stringify({ type: 'magiclink', email }),
    }),
    'generate link',
  )
  // generate_link mints the link without sending any mail, so a demo needs no
  // inbox at all. It is one use and short-lived: get one per browser, when you
  // actually need it, rather than pasting a stale one on stage.
  console.log(`\nSigned-in link for ${email} — open it in the browser you want that student in:\n`)
  console.log(data.properties?.action_link ?? data.action_link ?? JSON.stringify(data).slice(0, 400))
  console.log('\nOne use. Generate another whenever it expires.\n')
  process.exit(0)
}

if (has('clean')) {
  const users = await demoUsers()
  const ids = [...users.values()].map((u) => u.id)
  if (ids.length === 0) console.log('no demo accounts to remove')
  // cohort_members, attempts and saves all cascade from auth.users, so the
  // rows go with the people. The cohort itself is owned by the teacher, so it
  // is named and removed on its own.
  for (const [email, u] of users) {
    await ok(await admin(`/admin/users/${u.id}`, { method: 'DELETE' }), `delete ${email}`)
    console.log('removed', email)
  }
  const cohorts = await ok(
    await rest(`/cohorts?select=id,name&name=eq.${encodeURIComponent(CLASS_NAME)}`),
    'find cohort',
  )
  for (const c of cohorts) {
    await ok(await rest(`/cohorts?id=eq.${c.id}`, { method: 'DELETE' }), 'delete cohort')
    console.log('removed class', c.name)
  }
  console.log(`\ndone — ${ids.length} accounts and ${cohorts.length} class(es) gone`)
  process.exit(0)
}

/* ---------------- build it ---------------- */

const teacherEmail = arg('teacher', null)
if (!teacherEmail) {
  console.error('\nWhich account owns the class?  --teacher you@email.com')
  console.error('It has to have signed in to Novus at least once, so the account exists.\n')
  process.exit(1)
}

const teacher = await findTeacher(teacherEmail)
if (!teacher) {
  console.error(`\nNo account for ${teacherEmail}. Sign in once at /teach first, then run this.\n`)
  process.exit(1)
}
console.log(`teacher: ${teacherEmail}`)

// the same invented class the sample uses, so the figures tell the same story
const { createJiti } = await import(root + '/node_modules/jiti/lib/jiti.mjs')
const jiti = createJiti(root + '/', { alias: { '@': root + '/src' } })
const { sampleClass } = await jiti.import(root + '/src/data/sample-class.ts')
const sample = sampleClass(Date.now())
const members = sample.members.slice(0, HOW_MANY)
const keep = new Set(members.map((m) => m.userId))

// 1. the accounts
const existing = await demoUsers()
const idFor = new Map()
for (let i = 0; i < members.length; i++) {
  const email = emailFor(i)
  if (existing.has(email)) {
    idFor.set(members[i].userId, existing.get(email).id)
    console.log('·', email, 'already there')
    continue
  }
  const made = await ok(
    await admin('/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email,
        email_confirm: true,
        user_metadata: { novus_demo: true, display_name: members[i].displayName },
      }),
    }),
    `create ${email}`,
  )
  idFor.set(members[i].userId, made.id)
  console.log('+', email, '→', members[i].displayName)
}

// 2. the class
const found = await ok(
  await rest(`/cohorts?select=id,name,join_code&owner=eq.${teacher.id}&name=eq.${encodeURIComponent(CLASS_NAME)}`),
  'find cohort',
)
const cohort =
  found[0] ??
  (await ok(
    await rest('/cohorts', {
      method: 'POST',
      body: JSON.stringify({ owner: teacher.id, name: CLASS_NAME }),
    }),
    'create cohort',
  ))[0]
console.log(`class: ${cohort.name} · join code ${cohort.join_code}`)

// 3. who is in it, with the progress they have published
await ok(
  await rest('/cohort_members?on_conflict=cohort_id,user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(
      members.map((m) => ({
        cohort_id: cohort.id,
        user_id: idFor.get(m.userId),
        display_name: m.displayName,
        summary: m.summary,
        joined_at: m.joinedAt,
      })),
    ),
  }),
  'add members',
)
console.log(`members: ${members.length}`)

// 4. the work, and every attempt at it
const already = await ok(
  await rest(`/assignments?select=id,ref_id&cohort_id=eq.${cohort.id}`),
  'existing assignments',
)
const want = sample.assignments.filter((a) => !already.some((x) => x.ref_id === a.refId))
if (want.length > 0) {
  await ok(
    await rest('/assignments', {
      method: 'POST',
      body: JSON.stringify(
        want.map((a) => ({
          cohort_id: cohort.id,
          kind: a.kind,
          ref_id: a.refId,
          title: a.title,
          due_at: a.dueAt,
        })),
      ),
    }),
    'set work',
  )
}
console.log(`work set: ${already.length + want.length}`)

// Attempts are append-only by design, so a second run would double them.
// Only the people who have none get theirs.
const mine = sample.attempts.filter((a) => keep.has(a.userId))
const userIds = [...idFor.values()]
const have = await ok(
  await rest(`/attempts?select=user_id&user_id=in.(${userIds.join(',')})&limit=5000`),
  'existing attempts',
)
const seeded = new Set(have.map((a) => a.user_id))
const toWrite = mine.filter((a) => !seeded.has(idFor.get(a.userId)))
if (toWrite.length > 0) {
  await ok(
    await rest('/attempts', {
      method: 'POST',
      body: JSON.stringify(
        toWrite.map((a) => ({
          user_id: idFor.get(a.userId),
          kind: a.kind,
          ref_id: a.refId,
          score: a.score,
          out_of: a.outOf,
          passed: a.passed,
          attempted_at: a.at,
        })),
      ),
    }),
    'write attempts',
  )
}
console.log(`attempts written: ${toWrite.length}${toWrite.length === 0 ? ' (already seeded)' : ''}`)

console.log(`
Done. Sign in at /teach as ${teacherEmail} and open "${cohort.name}".

  join code            ${cohort.join_code}
  play as a student    node tools/seed-demo-class.mjs --signin 3
  take it all away     node tools/seed-demo-class.mjs --clean

These twelve are invented people with addresses on a domain you own. Nobody
real is in this class, and it is worth saying so when you show it.
`)
