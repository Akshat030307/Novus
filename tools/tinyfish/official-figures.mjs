/**
 * The figures behind the game's market events, read from the source.
 *
 * harvest-events.mjs decides which kinds of macro news are current by
 * searching headlines, and takes its magnitudes — 25 or 50 basis points,
 * ₹20,000 or ₹60,000 crore — out of headline text with a regex. That is right
 * about the weather and loose about the numbers: a headline about a 50bp
 * "expected" hike and one about a 25bp actual hike look the same to it.
 *
 * This sends the TinyFish Agent to the documents themselves — the RBI's latest
 * monetary policy statement, the Cabinet's latest infrastructure approvals —
 * and writes the figures down. harvest-events.mjs reads the newest file this
 * writes and prefers its numbers over the headline guess.
 *
 * THE LINE THIS HOLDS. Only a number, a direction and a date come back, and
 * the check below throws away anything else. These are economy-wide figures,
 * never a company's; nothing here can carry a name into the playable market.
 *
 *   node tools/tinyfish/official-figures.mjs
 *   node tools/tinyfish/official-figures.mjs --dry      # no API calls
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { root, requireKey, runAgent } from './agent.mjs'

const OUT_DIR = root + '/tools/tinyfish/candidates'
const dry = process.argv.includes('--dry')

/**
 * One reading per figure. `check` is the guard: it sees the agent's typed
 * result and returns only the fields allowed to cross, or null if the
 * reading cannot be trusted.
 */
const READINGS = [
  {
    id: 'policy-rate',
    feeds: ['rate-hike-harvested', 'rate-cut'],
    url: 'https://www.rbi.org.in/Scripts/Annualpolicy.aspx',
    hosts: ['rbi.org.in'],
    stealth: false,
    goal:
      'Open the most recent Monetary Policy Statement (or MPC resolution) listed on this page. ' +
      'Report the date of the decision, the policy repo rate before and after the decision in percent, ' +
      'and whether the rate was raised, cut or held. Use only what the document says. ' +
      'Give the URL of the document you read.',
    schema: {
      type: 'object',
      properties: {
        decision_date: { type: 'string', description: 'YYYY-MM-DD' },
        repo_rate_before: { type: 'number', description: 'percent, e.g. 5.50' },
        repo_rate_after: { type: 'number', description: 'percent, e.g. 5.75' },
        direction: { type: 'string', enum: ['raised', 'cut', 'held'] },
        source_url: { type: 'string' },
      },
      required: ['decision_date', 'repo_rate_after', 'direction', 'source_url'],
    },
    check(r) {
      if (!['raised', 'cut', 'held'].includes(r.direction)) return null
      const before = Number(r.repo_rate_before)
      const after = Number(r.repo_rate_after)
      if (!Number.isFinite(after) || after <= 0 || after > 20) return null
      const bp = Number.isFinite(before) ? Math.round(Math.abs(after - before) * 100) : NaN
      // the stated direction and the two rates must agree, or neither is trusted
      if (Number.isFinite(bp)) {
        const implied = after > before ? 'raised' : after < before ? 'cut' : 'held'
        if (implied !== r.direction) return null
      }
      return { direction: r.direction, bp, rateAfter: after, date: r.decision_date }
    },
  },
  {
    id: 'infra-approvals',
    feeds: ['infra-spend-harvested'],
    url: 'https://www.pib.gov.in/allRel.aspx',
    hosts: ['pib.gov.in'],
    stealth: true, // turns plain bots away
    goal:
      'Find the most recent Cabinet decisions (Ministry: Cabinet, or Cabinet Committee on Economic Affairs) ' +
      'from the last 60 days that approve highway, road, port, railway or other infrastructure projects. ' +
      'For each approval, report its date and the total outlay in crore rupees as a plain number. ' +
      'Use only what the release says. Give the URL of each release you read.',
    schema: {
      type: 'object',
      properties: {
        approvals: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', description: 'YYYY-MM-DD' },
              outlay_crore: { type: 'number', description: 'total outlay in crore rupees, e.g. 18500' },
              source_url: { type: 'string' },
            },
            required: ['date', 'outlay_crore', 'source_url'],
          },
        },
      },
      required: ['approvals'],
    },
    check(r, onHost) {
      const ok = (r.approvals ?? []).filter(
        (a) => Number.isFinite(Number(a.outlay_crore)) && a.outlay_crore > 0 && onHost(a.source_url),
      )
      if (!ok.length) return null
      // the game prints one figure: the largest single approval, not a sum
      // that no single headline would ever carry
      const top = ok.reduce((m, a) => (a.outlay_crore > m.outlay_crore ? a : m))
      return {
        crore: Math.round(top.outlay_crore),
        date: top.date,
        approvals: ok.length,
        sources: ok.map((a) => a.source_url),
      }
    },
  },
]

function hostCheck(hosts) {
  return (url) => {
    try {
      const h = new URL(url).hostname.toLowerCase()
      return hosts.some((x) => h === x || h.endsWith('.' + x))
    } catch {
      return false
    }
  }
}

/* ---------------- run ---------------- */

if (dry) {
  for (const r of READINGS) console.log(`\n[${r.id}] → ${r.feeds.join(', ')}\n  ${r.url}\n  goal: ${r.goal}`)
  process.exit(0)
}

const key = requireKey()
const figures = {}
const runs = []

for (const r of READINGS) {
  process.stdout.write(`· ${r.id} … `)
  let out
  try {
    out = await runAgent(key, { url: r.url, goal: r.goal, schema: r.schema, stealth: r.stealth, maxSeconds: 420 })
  } catch (e) {
    console.log('failed:', e.message)
    runs.push({ reading: r.id, ok: false, error: e.message })
    continue
  }
  const raw = out.result.result ?? out.result
  const onHost = hostCheck(r.hosts)
  if (raw.source_url && !onHost(raw.source_url)) {
    console.log(`discarded: source ${raw.source_url} is not on ${r.hosts.join('/')}`)
    runs.push({ reading: r.id, ok: false, runId: out.runId, error: 'source off-site' })
    continue
  }
  const checked = r.check(raw, onHost)
  if (!checked) {
    console.log('discarded: the reading did not hold together')
    runs.push({ reading: r.id, ok: false, runId: out.runId, error: 'failed check', raw })
    continue
  }
  figures[r.id] = { ...checked, feeds: r.feeds, source: raw.source_url ?? null }
  runs.push({ reading: r.id, ok: true, runId: out.runId, steps: out.steps })
  console.log(JSON.stringify(checked))
}

mkdirSync(OUT_DIR, { recursive: true })
const stamp = new Date().toISOString().slice(0, 10)
const file = `${OUT_DIR}/official-${stamp}.json`
writeFileSync(
  file,
  JSON.stringify(
    {
      readAt: new Date().toISOString(),
      readBy: 'TinyFish Agent API',
      note: 'Economy-wide figures only. harvest-events.mjs prefers these over numbers guessed from headlines.',
      figures,
      runs,
    },
    null,
    2,
  ) + '\n',
)
console.log(`\n${Object.keys(figures).length}/${READINGS.length} figures read · written to ${file.replace(root + '/', '')}`)
