/**
 * What is in the news about the thing this student keeps getting wrong.
 *
 * The teacher dashboard recommends an exercise for a weak area. The exercise
 * is chosen by a rule in src/sim/recommend.ts, not here and not by a model: a
 * recommendation a teacher cannot audit is worse than none. What this adds is
 * the other half — one or two current, real pieces about the same mistake
 * happening in the world, so "you keep approving against weak security" can be
 * followed by "and here is a bank that did it last month".
 *
 * It runs here, never in the browser. The bundle is static and public, so a
 * key in it would be a key for everyone; and a teacher opening a dashboard
 * should not be waiting on somebody else's service. The output is committed
 * and the game reads it offline.
 *
 *   node tools/tinyfish/recommend.mjs              # last 120 days
 *   node tools/tinyfish/recommend.mjs --days 365
 *   node tools/tinyfish/recommend.mjs --dry        # no API calls
 *
 * THE LINE THIS HOLDS. These links are teacher-facing reading, shown on the
 * dashboard beside a recommendation. Nothing from them reaches the playable
 * market, no company found here is ever added to data/stocks.ts, and no
 * headline here is copied into data/events.ts. The game's fiction stays
 * fiction; only a teacher's reading list touches the real world — which is
 * the same rule the Casebook already follows.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = root + '/src/data/recommendations.json'
const ENDPOINT = 'https://api.search.tinyfish.ai'
const PER_AREA = 2 // two pieces is a prompt; ten is homework for the teacher

const arg = (name, fallback) => {
  const i = process.argv.indexOf('--' + name)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}
const dry = process.argv.includes('--dry')
const days = Number(arg('days', 120))

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

/**
 * One query per weak area the game can detect. The area ids match
 * weakAreas() in sim/cohort.ts — `habit:` for something the game logged while
 * they played, `work:` for a piece of set work they have not passed.
 *
 * The queries are about the mistake, not about the student. Nothing about any
 * real person is sent anywhere: these strings are the whole request.
 */
const AREAS = [
  {
    id: 'habit:noise_trade',
    label: 'Trading the noise',
    queries: ['retail traders losses India', 'overtrading retail investors', 'market volatility noise investors'],
    keywords: ['overtrading', 'retail trader', 'retail investor', 'day trading', 'losses', 'noise', 'volatility'],
  },
  {
    id: 'habit:concentration',
    label: 'One name, most of the book',
    queries: ['portfolio concentration risk', 'single stock exposure risk', 'diversification India portfolio'],
    keywords: ['concentration', 'diversif', 'single stock', 'exposure', 'portfolio risk'],
  },
  {
    id: 'habit:unsound_call',
    label: 'Judging a call by how it turned out',
    queries: ['investing luck versus skill', 'risk management lessons blow up', 'judging investment decisions process'],
    keywords: ['luck', 'skill', 'process', 'hindsight', 'outcome', 'decision', 'risk management'],
  },
  {
    id: 'habit:missed_flags',
    label: 'Reading a file too fast',
    queries: ['auditor resignation India company', 'corporate governance red flags India', 'related party transactions scrutiny'],
    keywords: ['red flag', 'auditor', 'governance', 'related party', 'disclosure', 'forensic'],
  },
  {
    id: 'work:credit-desk',
    label: 'The credit desk',
    queries: ['collateral cover bank lending India', 'bad loans recovery India banks', 'bank lending standards India'],
    keywords: ['collateral', 'bad loan', 'npa', 'lending', 'recovery', 'security', 'provision'],
  },
  {
    id: 'work:cash-vs-profit',
    label: 'Cash is not profit',
    queries: ['cash flow versus profit company', 'earnings quality accruals India', 'working capital squeeze company India'],
    keywords: ['cash flow', 'earnings quality', 'accrual', 'working capital', 'reported profit'],
  },
  {
    id: 'work:replay-ilfs',
    label: 'Funding that stops',
    queries: ['NBFC funding liquidity India', 'asset liability mismatch India', 'refinancing risk bonds India'],
    keywords: ['nbfc', 'refinanc', 'mismatch', 'liquidity', 'rollover', 'funding'],
  },
]

/** outlets that report the thing, rather than selling something next to it */
const PREFERRED = [
  'reuters', 'bloomberg', 'financial times', 'ft', 'wsj', 'the economist',
  'mint', 'livemint', 'economic times', 'business standard', 'moneycontrol',
  'the hindu', 'business today', 'morningstar', 'harvard business review',
  'bis', 'imf', 'rbi', 'sebi', 'cnbc',
]

/** press offices and marketing blogs: the words match, the piece does not */
const PR = [
  'newsroom', 'prnewswire', 'businesswire', 'globenewswire', 'accesswire',
  'press release', 'investing.com', 'tradingview', 'substack', 'seekingalpha',
  'medium.com', 'linkedin',
]

const search = async (key, query) => {
  const url = new URL(ENDPOINT)
  url.searchParams.set('query', query)
  url.searchParams.set('domain_type', 'news')
  url.searchParams.set('recency_minutes', String(days * 24 * 60))
  url.searchParams.set(
    'purpose',
    'Find current coverage of a specific financial reasoning mistake, as background reading for a teacher.',
  )
  const res = await fetch(url, { headers: { 'X-API-Key': key } })
  if (!res.ok) throw new Error(`search ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

if (dry) {
  console.log(`${AREAS.length} weak areas · ${AREAS.reduce((n, a) => n + a.queries.length, 0)} queries`)
  for (const a of AREAS) console.log('  ', a.id.padEnd(22), a.queries[0])
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

const areas = {}
for (const area of AREAS) {
  const hits = []
  for (const q of area.queries) {
    process.stdout.write(`· ${area.id.padEnd(22)} ← "${q}" `)
    try {
      const data = await search(key, q)
      const on = (data.results ?? []).filter((r) => {
        const title = String(r.title ?? '').toLowerCase()
        const hay = `${title} ${String(r.snippet ?? '').toLowerCase()}`
        const inTitle = area.keywords.some((k) => title.includes(k))
        const hits = area.keywords.filter((k) => hay.includes(k)).length
        // one generic word in a trade-press headline is not a match
        return inTitle || hits >= 2
      })
      console.log(`${on.length}/${(data.results ?? []).length} on topic`)
      hits.push(...on)
    } catch (e) {
      console.log('failed:', e.message)
    }
  }

  // Rank before picking. A press release from a company that happens to use
  // the words "cash flow" is not reading for a teacher, and a wire service
  // reporting the thing itself is. Neither judgement is the model's — both
  // are lists in this file, which is the point.
  const score = (h) => {
    const pub = String(h.publisher ?? h.site_name ?? '')
    const host = String(h.site_name ?? '').toLowerCase()
    const title = String(h.title ?? '').toLowerCase()
    let n = 0
    if (PREFERRED.some((p) => pub.toLowerCase().includes(p))) n += 3
    if (area.keywords.some((k) => title.includes(k))) n += 2
    if (PR.some((p) => host.includes(p) || pub.toLowerCase().includes(p))) n -= 8
    return n
  }
  hits.sort((a, b) => score(b) - score(a))

  // one per site, so two pieces are two views rather than one paper twice
  const seen = new Set()
  const reading = []
  for (const h of hits) {
    const site = h.publisher || (h.site_name ?? '').replace(/^www\./, '')
    if (!site || seen.has(site)) continue
    seen.add(site)
    reading.push({
      // the site carries no em dashes, so a headline's own become a colon
      title: String(h.title).replace(/\s*\u2014\s*/g, ': ').slice(0, 160),
      url: h.url,
      site,
      // the search reports a human date ("Feb 15, 2026"), not an instant
      at: h.date ? String(h.date) : null,
    })
    if (reading.length === PER_AREA) break
  }
  areas[area.id] = { label: area.label, reading }
}

const out = {
  builtAt: new Date().toISOString(),
  builtBy: 'TinyFish Search API',
  window: `${days} days`,
  note:
    'Teacher-facing reading only. Nothing here reaches the playable market: no company found here is added to data/stocks.ts and no headline here is copied into data/events.ts.',
  areas,
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')

const filled = Object.values(areas).filter((a) => a.reading.length > 0).length
console.log(`\n${filled}/${AREAS.length} areas have reading · written to src/data/recommendations.json`)
for (const [id, a] of Object.entries(areas)) {
  if (a.reading.length === 0) console.log('  EMPTY', id)
}
