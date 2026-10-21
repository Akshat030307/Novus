/**
 * Real headlines in, fictional market events out.
 *
 * The game's market moves on events (data/events.ts): a headline, a map of
 * sector shocks the player never sees, and a decay. There are eight, written
 * by hand, and a player who sees all eight has seen the weather.
 *
 * This asks TinyFish Search what kinds of macro news are actually happening
 * right now — rate decisions, infrastructure spending, tariffs, fuel, monsoon,
 * bad loans — and proposes new event templates in the same shape.
 *
 * THE RULE THAT MAKES THIS SAFE
 * Headlines are built from this file's own templates. Nothing from a fetched
 * page is ever copied into one. Exactly two things cross over from reality:
 *   1. which archetype is in the news (so the game's weather tracks the real
 *      world's shape), and
 *   2. a magnitude bucket — 25 or 50 basis points, ₹20,000 or ₹60,000 crore.
 * A real company name therefore cannot reach the playable market, which is the
 * line the whole project holds: a learning game with real tickers is advice.
 * The check at the bottom enforces it rather than trusting it.
 *
 * Output is a candidate file for a human to read, never a direct edit of
 * data/events.ts. Promotion is a judgement call about play, not a script's.
 *
 *   node tools/tinyfish/harvest-events.mjs              # last 30 days
 *   node tools/tinyfish/harvest-events.mjs --days 90
 *   node tools/tinyfish/harvest-events.mjs --dry        # no API calls
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const OUT_DIR = root + '/tools/tinyfish/candidates'
const ENDPOINT = 'https://api.search.tinyfish.ai'

const arg = (name, fallback) => {
  const i = process.argv.indexOf('--' + name)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}
const dry = process.argv.includes('--dry')
const days = Number(arg('days', 30))

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

/* ---------------- the archetypes the game can express ----------------
 *
 * Sector keys must exist in data/stocks.ts. Shock sizes follow the tuning
 * note at the top of data/events.ts: a primary sector 4-6%, a secondary
 * 1.5-2.5%, a contra 1-2%, so the headline prompts thinking rather than a
 * reflex. `fill` turns a magnitude found in the news into template words.
 */
const ARCHETYPES = [
  {
    id: 'rate-hike-harvested',
    replaces: 'rate-hike',
    queries: ['RBI repo rate hike monetary policy', 'central bank raises policy rate India'],
    keywords: ['repo rate', 'policy rate', 'rate hike', 'raises rate', 'tighten'],
    template: 'Central bank raises the policy rate by {bp} basis points',
    fill: (m) => ({ bp: bucket(m.bp, [25, 35, 40, 50], 40) }),
    official: (f) => rateDecision(f, 'raised'),
    sectorShocks: { banking: -0.035, energy: -0.02, consumer: -0.015, it: 0.012 },
    decayMinutes: 260,
  },
  {
    id: 'rate-cut',
    queries: ['RBI repo rate cut monetary policy', 'central bank cuts policy rate India'],
    keywords: ['rate cut', 'cuts rate', 'lowers rate', 'easing', 'reduced repo'],
    template: 'Central bank cuts the policy rate by {bp} basis points',
    fill: (m) => ({ bp: bucket(m.bp, [25, 35, 50], 25) }),
    official: (f) => rateDecision(f, 'cut'),
    sectorShocks: { banking: 0.03, construction: 0.025, consumer: 0.02, it: -0.01 },
    decayMinutes: 250,
  },
  {
    id: 'infra-spend-harvested',
    replaces: 'infra-spend',
    queries: ['cabinet approves highway projects crore', 'India infrastructure investment approved crore'],
    keywords: ['highway', 'infrastructure', 'port', 'corridor', 'approved', 'cabinet'],
    template: 'Government clears ₹{crore} crore of highway and port projects',
    fill: (m) => ({ crore: comma(bucket(m.crore, [20000, 40000, 60000, 90000], 40000)) }),
    official: (f) => (f['infra-approvals'] ? { crore: f['infra-approvals'].crore } : undefined),
    sectorShocks: { construction: 0.06, steel: 0.045, cement: 0.04, it: -0.012 },
    decayMinutes: 220,
  },
  {
    id: 'bank-asset-quality',
    queries: ['Indian banks bad loans NPA ratio', 'bank asset quality slippage India'],
    keywords: ['bad loan', 'npa', 'non-performing', 'slippage', 'asset quality', 'provisioning'],
    template: 'Bad-loan ratios tick up across the banking system',
    fill: () => ({}),
    sectorShocks: { banking: -0.045, payments: -0.015, consumer: -0.012 },
    decayMinutes: 240,
  },
  {
    id: 'freight-squeeze',
    queries: ['port congestion freight rates India', 'shipping freight rates surge'],
    keywords: ['freight', 'congestion', 'shipping', 'container', 'port delays'],
    template: 'Freight rates spike as port congestion builds',
    fill: () => ({}),
    sectorShocks: { logistics: 0.045, consumer: -0.018, steel: -0.012 },
    decayMinutes: 200,
  },
  {
    id: 'fuel-spike-harvested',
    replaces: 'fuel-spike',
    queries: ['crude oil price surge supply disruption', 'oil prices jump percent'],
    keywords: ['crude', 'oil price', 'brent', 'supply disruption', 'opec'],
    template: 'Global crude jumps {pct}% after a supply disruption',
    fill: (m) => ({ pct: bucket(m.pct, [5, 7, 9, 12], 9) }),
    sectorShocks: { energy: 0.04, logistics: -0.03, consumer: -0.02, cement: -0.015 },
    decayMinutes: 200,
  },
  {
    id: 'cement-demand',
    queries: ['cement demand housing construction India', 'cement prices demand quarter'],
    keywords: ['cement', 'housing starts', 'construction demand', 'realty'],
    template: 'Housing starts lift cement demand to a multi-year high',
    fill: () => ({}),
    sectorShocks: { cement: 0.045, construction: 0.025, logistics: 0.012 },
    decayMinutes: 190,
  },
  {
    id: 'power-shortage',
    queries: ['India power demand record peak shortage', 'electricity demand surge grid'],
    keywords: ['power demand', 'electricity', 'grid', 'peak demand', 'coal stock'],
    template: 'Peak power demand sets a record and strains the grid',
    fill: () => ({}),
    sectorShocks: { energy: 0.04, steel: -0.018, cement: -0.015, it: -0.01 },
    decayMinutes: 210,
  },
  {
    id: 'export-incentive',
    queries: ['India export incentive scheme manufacturing', 'production linked incentive approved'],
    keywords: ['incentive', 'pli', 'export scheme', 'manufacturing push', 'subsidy'],
    template: 'Manufacturing incentive scheme widened to more sectors',
    fill: () => ({}),
    sectorShocks: { steel: 0.035, it: 0.02, logistics: 0.018, banking: 0.01 },
    decayMinutes: 220,
  },
  {
    id: 'pharma-pricing',
    queries: ['drug price control India regulator ceiling', 'essential medicines price cap'],
    keywords: ['price cap', 'price control', 'ceiling price', 'essential medicines', 'nppa'],
    template: 'Price caps extended to another list of essential medicines',
    fill: () => ({}),
    sectorShocks: { pharma: -0.05, consumer: 0.01 },
    decayMinutes: 230,
  },
]

/** snap a real figure to the nearest value the game would plausibly print */
function bucket(value, options, fallback) {
  if (!Number.isFinite(value)) return fallback
  return options.reduce((best, o) => (Math.abs(o - value) < Math.abs(best - value) ? o : best), options[0])
}
const comma = (n) => n.toLocaleString('en-IN')

/* ---------------- figures read from the source ----------------
 *
 * official-figures.mjs sends the TinyFish Agent to the RBI's policy statement
 * and the Cabinet's approvals and writes what they say. When a recent file is
 * there, its numbers beat the headline regex — and a decision that went the
 * other way rules an archetype out, however many headlines speculated about
 * it. `official` returns magnitudes to use, null to drop the archetype, or
 * undefined when there is nothing official to go on.
 */
function loadOfficial() {
  if (!existsSync(OUT_DIR)) return null
  const files = readdirSync(OUT_DIR).filter((f) => /^official-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()
  if (!files.length) return null
  const data = JSON.parse(readFileSync(`${OUT_DIR}/${files.at(-1)}`, 'utf8'))
  const age = (Date.now() - Date.parse(data.readAt)) / 86_400_000
  if (!(age <= days)) return null // older than the window being harvested
  return { file: files.at(-1), figures: data.figures ?? {} }
}

function rateDecision(f, wanted) {
  const p = f['policy-rate']
  if (!p) return undefined
  if (p.direction !== wanted) return null
  return Number.isFinite(p.bp) ? { bp: p.bp } : undefined
}

/** the only numbers allowed to cross over from a real page */
function magnitudes(text) {
  const bp = text.match(/(\d{2,3})\s*(?:bps|basis points)/i)
  const crore = text.match(/₹?\s?([\d,]{3,})\s*crore/i)
  const pct = text.match(/(\d{1,2}(?:\.\d)?)\s*(?:%|per cent|percent)/i)
  return {
    bp: bp ? Number(bp[1]) : NaN,
    crore: crore ? Number(crore[1].replace(/,/g, '')) : NaN,
    pct: pct ? Number(pct[1]) : NaN,
  }
}

async function search(key, query) {
  const url = new URL(ENDPOINT)
  url.searchParams.set('query', query)
  url.searchParams.set('domain_type', 'news')
  url.searchParams.set('recency_minutes', String(days * 24 * 60))
  url.searchParams.set(
    'purpose',
    'Classify what kind of macro news is current, to shape fictional market events in a finance teaching game.',
  )
  const res = await fetch(url, { headers: { 'X-API-Key': key } })
  if (!res.ok) throw new Error(`search ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

/* ---------------- run ---------------- */

if (dry) {
  console.log(`${ARCHETYPES.length} archetypes, ${ARCHETYPES.reduce((n, a) => n + a.queries.length, 0)} queries`)
  for (const a of ARCHETYPES) console.log('  ', a.id.padEnd(24), a.queries[0])
  process.exit(0)
}

const key = env('TINYFISH_API_KEY')
if (!key) {
  console.error('TINYFISH_API_KEY is not set in .env — see tools/tinyfish/check-sources.mjs for the note.')
  process.exit(1)
}

const official = loadOfficial()
console.log(official ? `official figures from ${official.file}` : 'no recent official figures — magnitudes come from headlines')

const candidates = []
for (const a of ARCHETYPES) {
  const fromSource = official && a.official ? a.official(official.figures) : undefined
  if (fromSource === null) {
    console.log(`· ${a.id} skipped: the official decision went the other way`)
    continue
  }

  const hits = []
  for (const q of a.queries) {
    process.stdout.write(`· ${a.id} ← "${q}" `)
    let data
    try {
      data = await search(key, q)
    } catch (e) {
      console.log('failed:', e.message)
      continue
    }
    const matched = (data.results ?? []).filter((r) => {
      const hay = `${r.title} ${r.snippet ?? ''}`.toLowerCase()
      return a.keywords.some((k) => hay.includes(k))
    })
    console.log(`${matched.length}/${(data.results ?? []).length} on topic`)
    hits.push(...matched)
  }

  if (hits.length < 2) continue // one stray article is not weather

  const found = { ...magnitudes(hits.map((h) => `${h.title} ${h.snippet ?? ''}`).join(' ')), ...(fromSource ?? {}) }
  const filled = a.fill(found)
  const headline = a.template.replace(/\{(\w+)\}/g, (_, k) => String(filled[k] ?? ''))

  // The guard, stated the strict way round: a generated headline is template
  // text plus numbers, so every word in it must already be in the template
  // and every filled value must be a figure. Nothing else can be true, and
  // checking it this way cannot be fooled by a real name that happens to
  // look like an ordinary word.
  const templateWords = new Set(a.template.toLowerCase().match(/[a-z]+/g) ?? [])
  const leaked = (headline.toLowerCase().match(/[a-z]+/g) ?? []).filter((w) => !templateWords.has(w))
  const badFill = Object.entries(filled).filter(([, v]) => !/^[\d,.]+$/.test(String(v)))
  for (const [k, v] of badFill) leaked.push(`${k}=${v}`)

  candidates.push({
    event: {
      id: a.replaces ?? a.id,
      headline,
      sectorShocks: a.sectorShocks,
      decayMinutes: a.decayMinutes,
    },
    replaces: a.replaces ?? null,
    signal: hits.length,
    magnitudesFound: found,
    magnitudesFrom: fromSource ? 'official' : 'headlines',
    leaked,
    // provenance stays here, in the candidate file — it never ships with the game
    seenIn: hits.slice(0, 5).map((h) => ({ title: h.title, url: h.url, site: h.site_name })),
  })
}

const clean = candidates.filter((c) => c.leaked.length === 0)
const rejected = candidates.filter((c) => c.leaked.length > 0)

mkdirSync(OUT_DIR, { recursive: true })
const stamp = new Date().toISOString().slice(0, 10)
const file = `${OUT_DIR}/events-${stamp}.json`
writeFileSync(
  file,
  JSON.stringify(
    {
      harvestedAt: new Date().toISOString(),
      harvestedBy: 'TinyFish Search API',
      window: `${days} days`,
      note: 'Candidates only. A human promotes these into src/data/events.ts after playing them.',
      candidates: clean,
      rejected,
    },
    null,
    2,
  ) + '\n',
)

console.log(`\n${clean.length} candidates · ${rejected.length} rejected for leaking a real name`)
for (const c of rejected) console.log('  REJECTED', c.event.id, '→', c.leaked.join(', '))
console.log(`written to ${file.replace(root + '/', '')}\n`)

if (clean.length) {
  console.log('Paste-ready for src/data/events.ts:\n')
  for (const c of clean) {
    console.log(`  {`)
    console.log(`    id: '${c.event.id}',`)
    console.log(`    headline: '${c.event.headline.replace(/'/g, "\\'")}',`)
    console.log(`    sectorShocks: ${JSON.stringify(c.event.sectorShocks).replace(/"/g, '').replace(/:/g, ': ').replace(/,/g, ', ')},`)
    console.log(`    decayMinutes: ${c.event.decayMinutes},`)
    console.log(`  },${c.replaces ? `   // UPDATE the existing '${c.replaces}' in place` : '   // NEW'}`)
  }
}
