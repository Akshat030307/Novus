/**
 * Keep the Casebook's citations honest, with TinyFish.
 *
 * The Casebook is the one place Novus names real companies, so its links are
 * the thing that must not rot. This opens every source through TinyFish Fetch,
 * records whether it resolved and what the page calls itself, and writes
 * src/data/casebook-sources.json for the app to show.
 *
 * It runs here, never in the browser: the bundle is static and public, so a
 * key in it would be a key for everyone. TINYFISH_API_KEY lives in .env
 * (gitignored, and deliberately without the VITE_ prefix, so Vite cannot
 * bundle it even by accident).
 *
 *   node tools/tinyfish/check-sources.mjs          # check every source
 *   node tools/tinyfish/check-sources.mjs --dry    # list what it would check
 *
 * The generated JSON is committed: the game reads it offline, nobody needs a
 * key to play, and a link that dies shows up in the next run's diff.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = root + '/src/data/casebook-sources.json'
const ENDPOINT = 'https://api.fetch.tinyfish.ai'
const BATCH = 10 // the Fetch API's limit per request
const dry = process.argv.includes('--dry')

/** .env, read by hand — this is a build-time script, not the app */
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

const { createJiti } = await import(root + '/node_modules/jiti/lib/jiti.mjs')
const jiti = createJiti(root + '/', { alias: { '@': root + '/src' } })
const { CASEBOOK } = await jiti.import(root + '/src/data/casebook.ts')

/** every distinct source url, with the entries that cite it */
const byUrl = new Map()
for (const entry of CASEBOOK) {
  for (const s of entry.sources) {
    if (!byUrl.has(s.url)) byUrl.set(s.url, { url: s.url, label: s.label, cited: [] })
    byUrl.get(s.url).cited.push(entry.id)
  }
}
const urls = [...byUrl.keys()]
console.log(`${CASEBOOK.length} casebook entries · ${urls.length} distinct sources`)
if (dry) {
  for (const u of urls) console.log('  ', u, '←', byUrl.get(u).cited.join(', '))
  process.exit(0)
}

const key = env('TINYFISH_API_KEY')
if (!key) {
  console.error(
    '\nTINYFISH_API_KEY is not set.\n' +
      'Create a key at https://agent.tinyfish.ai/api-keys, then add this line to .env:\n' +
      '  TINYFISH_API_KEY=your-key-here\n' +
      '(.env is gitignored, and the name has no VITE_ prefix so it never reaches the browser.)\n',
  )
  process.exit(1)
}

async function fetchBatch(batch) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'X-API-Key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      urls: batch,
      format: 'markdown',
      ttl: 0, // a live fetch: a cached copy cannot tell us the link still works
      purpose: 'Verify that the cited sources behind a finance teaching game still resolve.',
    }),
  })
  if (!res.ok) throw new Error(`TinyFish replied ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return res.json()
}

const checked = {}
for (let i = 0; i < urls.length; i += BATCH) {
  const batch = urls.slice(i, i + BATCH)
  process.stdout.write(`fetching ${i + 1}–${i + batch.length} of ${urls.length}… `)
  const data = await fetchBatch(batch)

  for (const r of data.results ?? []) {
    checked[r.url] = {
      ok: true,
      title: (r.title || '').trim().slice(0, 140) || null,
      finalUrl: r.final_url && r.final_url !== r.url ? r.final_url : null,
      // a rough sign the page still has substance rather than a redirect stub
      words: typeof r.text === 'string' ? r.text.split(/\s+/).filter(Boolean).length : null,
    }
  }
  for (const e of data.errors ?? []) {
    checked[e.url] = { ok: false, error: String(e.error).slice(0, 200) }
  }
  console.log('done')
}

const missing = urls.filter((u) => !(u in checked))
for (const u of missing) checked[u] = { ok: false, error: 'no result returned' }

const out = {
  checkedAt: new Date().toISOString(),
  checkedBy: 'TinyFish Fetch API',
  sources: Object.fromEntries(
    urls.map((u) => [u, { ...checked[u], label: byUrl.get(u).label, cited: byUrl.get(u).cited }]),
  ),
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')

const good = urls.filter((u) => checked[u].ok).length
console.log(`\n${good}/${urls.length} sources resolved · written to src/data/casebook-sources.json`)
for (const u of urls.filter((x) => !checked[x].ok)) console.log('  BROKEN', u, '—', checked[u].error)
