/**
 * Leads for the Casebook, found by the TinyFish Agent.
 *
 * The Casebook (data/casebook.ts) is six entries, written and checked by
 * hand. The regulators publish a steady stream of the same kind of story —
 * a bank fined for lending against weak security, a broker barred for
 * misusing client money — but it is buried a few clicks deep: a listing, then
 * an order, then a PDF. That is the job for the agent rather than Search.
 *
 * This walks each regulator listing, opens the enforcement actions it finds,
 * and writes what each one was about in Casebook terms: what went wrong, the
 * figures, the tells, and which Ledger concepts it teaches.
 *
 * WHAT IT IS NOT. It does not write data/casebook.ts. A Casebook entry is a
 * real, named company presented as fact, and data/casebook.ts says a person
 * signs those off. What lands here is a lead: a candidate file under
 * tools/tinyfish/candidates/ with the source order linked, for someone to read
 * and, if it is worth teaching from, write up properly. Real names stay in the
 * Casebook; nothing here goes near data/stocks.ts or data/events.ts.
 *
 *   node tools/tinyfish/casebook-leads.mjs              # every source
 *   node tools/tinyfish/casebook-leads.mjs --only rbi   # one source
 *   node tools/tinyfish/casebook-leads.mjs --per 3      # actions per source
 *   node tools/tinyfish/casebook-leads.mjs --dry        # no API calls
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'
import { root, requireKey, runAgent } from './agent.mjs'

const OUT_DIR = root + '/tools/tinyfish/candidates'

const arg = (name, fallback) => {
  const i = process.argv.indexOf('--' + name)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}
const dry = process.argv.includes('--dry')
const only = arg('only', null)
const per = Number(arg('per', 5))

const { createJiti } = await import(root + '/node_modules/jiti/lib/jiti.mjs')
const jiti = createJiti(root + '/', { alias: { '@': root + '/src' } })
const { CASEBOOK } = await jiti.import(root + '/src/data/casebook.ts')
const { CONCEPTS } = await jiti.import(root + '/src/data/concepts.ts')
const conceptIds = new Set(CONCEPTS.map((c) => c.id))

/**
 * Where enforcement actions are published. `hosts` is the guard on the way
 * back: a lead's source link must be on the regulator's own site, so a lead
 * cannot rest on a link the agent made up or a news page that paraphrased it.
 */
const SOURCES = [
  {
    id: 'rbi',
    label: 'RBI press releases',
    url: 'https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx',
    hosts: ['rbi.org.in'],
    find:
      'press releases announcing a monetary penalty on a bank, an NBFC or a co-operative bank, ' +
      'a cancellation of a licence, or directions restricting a lender. Skip auction results, ' +
      'money market operations and routine notices.',
    stealth: false,
  },
  {
    id: 'sebi',
    label: 'SEBI enforcement orders',
    url: 'https://www.sebi.gov.in/',
    hosts: ['sebi.gov.in'],
    find:
      'final orders from the Enforcement section (Orders) that bar, penalise or direct a listed ' +
      'company, its promoters, a broker or an intermediary — for misstated accounts, diverted funds, ' +
      'insider trading, or misuse of client money. Navigate to Enforcement > Orders first.',
    stealth: true, // the site turns plain bots away
  },
]

/** what the agent brings back — every field the reviewer needs, no prose to parse */
const SCHEMA = {
  type: 'object',
  properties: {
    actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          entity: { type: 'string', description: 'the bank, company or person the action is against' },
          date: { type: 'string', description: 'date of the order or release, YYYY-MM-DD' },
          title: { type: 'string', description: 'the release or order title as published' },
          what_went_wrong: {
            type: 'string',
            description: 'one or two plain sentences: what the regulator found, in its own terms',
          },
          figures: {
            type: 'array',
            items: { type: 'string' },
            description: 'the amounts in the order: penalty, loans involved, funds diverted — each with its unit',
          },
          warning_signs: {
            type: 'array',
            items: { type: 'string' },
            description: 'facts in the order that were visible before the action: weak collateral, related-party lending, missing disclosures',
          },
          source_url: { type: 'string', description: 'the link to the release or order itself (the page or PDF opened)' },
        },
        required: ['entity', 'date', 'title', 'what_went_wrong', 'source_url'],
      },
    },
  },
  required: ['actions'],
}

const goalFor = (s) =>
  `You are collecting study material for a finance teaching course. On this site, find the ${per} most ` +
  `recent ${s.find} Open each one (follow the link to the release or the order; open the PDF if that is ` +
  `where the detail is). For each, report the entity, the date, the title as published, what the ` +
  `regulator found in one or two plain sentences, the money figures stated, and any warning signs the ` +
  `order describes that were visible beforehand. Use only what the page says; leave a field empty ` +
  `rather than guess. Give the URL of the page or PDF you actually read.`

/* ---------------- what counts as already known ---------------- */

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** every source url already in the Casebook or in an earlier lead file */
const seenUrls = new Set(CASEBOOK.flatMap((e) => e.sources.map((s) => s.url)))
mkdirSync(OUT_DIR, { recursive: true })
for (const f of readdirSync(OUT_DIR).filter((f) => /^casebook-leads-.*\.json$/.test(f))) {
  try {
    for (const l of JSON.parse(readFileSync(`${OUT_DIR}/${f}`, 'utf8')).leads ?? []) seenUrls.add(l.source.url)
  } catch {
    /* a hand-edited file that no longer parses is the reviewer's, not ours */
  }
}

/**
 * Which Ledger concepts a lead teaches. Decided here, by keyword, from the
 * agent's text — not by asking the agent — so the tag can be audited and can
 * only ever be an id that exists in data/concepts.ts.
 */
const TEACHES = [
  ['collateral-cover', ['collateral', 'security', 'pledge', 'mortgage', 'valuation']],
  ['debt-service-cover', ['repayment', 'servicing', 'overdue', 'interest payment']],
  ['default-risk', ['default', 'npa', 'non-performing', 'written off', 'fraud classification']],
  ['credit-score', ['kyc', 'due diligence', 'credit appraisal', 'borrower assessment', 'credit information']],
  ['operating-cash-flow', ['diverted', 'diversion', 'siphon', 'fictitious', 'misstat', 'inflated revenue']],
  ['leverage', ['exposure limit', 'capital adequacy', 'over-leverag', 'borrowings']],
  ['diversification', ['concentration', 'single borrower', 'group exposure', 'large exposure']],
  ['margin', ['margin', 'profit inflat']],
  ['drift-noise-shock', ['manipulat', 'circular trading', 'pump', 'price rigging']],
].filter(([id]) => conceptIds.has(id))

function teachesFor(text) {
  const hay = text.toLowerCase()
  return TEACHES.filter(([, words]) => words.some((w) => hay.includes(w))).map(([id]) => id)
}

function onHost(url, hosts) {
  try {
    const h = new URL(url).hostname.toLowerCase()
    return hosts.some((x) => h === x || h.endsWith('.' + x))
  } catch {
    return false
  }
}

/* ---------------- run ---------------- */

const sources = SOURCES.filter((s) => !only || s.id === only)
if (!sources.length) {
  console.error(`no source "${only}" — have: ${SOURCES.map((s) => s.id).join(', ')}`)
  process.exit(1)
}

console.log(`${CASEBOOK.length} casebook entries · ${seenUrls.size} source urls already known`)
if (dry) {
  for (const s of sources) console.log(`\n[${s.id}] ${s.url}${s.stealth ? '  (stealth)' : ''}\n  goal: ${goalFor(s)}`)
  process.exit(0)
}

const key = requireKey()
const leads = []
const rejected = []
const runs = []

for (const s of sources) {
  process.stdout.write(`· ${s.id} — ${s.label} … `)
  let out
  try {
    out = await runAgent(key, { url: s.url, goal: goalFor(s), schema: SCHEMA, stealth: s.stealth, maxSeconds: 600 })
  } catch (e) {
    console.log('failed:', e.message)
    runs.push({ source: s.id, ok: false, error: e.message })
    continue
  }
  const actions = out.result.actions ?? out.result.result?.actions ?? []
  console.log(`${actions.length} actions in ${out.steps ?? '?'} steps`)
  runs.push({ source: s.id, ok: true, runId: out.runId, steps: out.steps, actions: actions.length })

  for (const a of actions) {
    const why = []
    if (!a.source_url || !onHost(a.source_url, s.hosts)) why.push(`source not on ${s.hosts.join('/')}`)
    if (!a.what_went_wrong?.trim()) why.push('no finding')
    if (seenUrls.has(a.source_url)) why.push('already known')
    if (CASEBOOK.some((e) => norm(e.title) && norm(a.entity).includes(norm(e.title)))) why.push('already in the Casebook')
    if (why.length) {
      rejected.push({ source: s.id, entity: a.entity, url: a.source_url, why })
      continue
    }
    seenUrls.add(a.source_url)

    const text = [a.title, a.what_went_wrong, ...(a.figures ?? []), ...(a.warning_signs ?? [])].join(' ')
    leads.push({
      regulator: s.id,
      entity: a.entity,
      date: a.date,
      title: a.title,
      whatWentWrong: a.what_went_wrong,
      figures: a.figures ?? [],
      warningSigns: a.warning_signs ?? [],
      teaches: teachesFor(text),
      source: { label: `${s.id.toUpperCase()} — ${a.title}`.slice(0, 160), url: a.source_url },
    })
  }
}

const stamp = new Date().toISOString().slice(0, 10)
const file = `${OUT_DIR}/casebook-leads-${stamp}.json`
writeFileSync(
  file,
  JSON.stringify(
    {
      foundAt: new Date().toISOString(),
      foundBy: 'TinyFish Agent API',
      note:
        'Leads only — real, named entities, unverified. A person reads the source, checks every figure, ' +
        'and writes the entry into src/data/casebook.ts by hand if it is worth teaching from.',
      runs,
      leads,
      rejected,
    },
    null,
    2,
  ) + '\n',
)

console.log(`\n${leads.length} leads · ${rejected.length} set aside`)
for (const l of leads) console.log(`  ${l.date}  ${l.entity}  [${l.teaches.join(', ') || 'no concept matched'}]`)
for (const r of rejected) console.log(`  SET ASIDE  ${r.entity ?? '?'} — ${r.why.join('; ')}`)
console.log(`written to ${file.replace(root + '/', '')}`)
