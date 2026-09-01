// casebook-ingest — SKELETON. See README.md.
//
// Build-time only. Reads from the source allowlist, writes drafts/*.json for a
// human to check and hand-merge into src/data/casebook.ts. It must never write
// to src/, and the app must never import it.
//
// Run:  node tools/casebook-ingest/ingest.mjs <event-id>

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const DRAFTS = join(HERE, 'drafts')

/** the only hosts this tool is allowed to touch */
const ALLOWLIST = [
  'en.wikipedia.org',
  'www.sebi.gov.in',
  'www.rbi.org.in',
  'indiankanoon.org',
]

const SEEDS = {
  satyam: ['https://en.wikipedia.org/wiki/Satyam_scandal'],
  ilfs: ['https://en.wikipedia.org/wiki/IL%26FS'],
  'pnb-lou': ['https://en.wikipedia.org/wiki/Punjab_National_Bank_Scam'],
  'harshad-mehta': ['https://en.wikipedia.org/wiki/1992_Indian_stock_market_scam'],
  kingfisher: ['https://en.wikipedia.org/wiki/Kingfisher_Airlines'],
  'gfc-2008': ['https://en.wikipedia.org/wiki/2007%E2%80%932008_financial_crisis'],
}

function assertAllowed(url) {
  const host = new URL(url).host
  if (!ALLOWLIST.includes(host)) {
    throw new Error(`refusing ${host} — not on the allowlist`)
  }
}

async function fetchSource(_url) {
  // STUB. Fetch, strip to readable text, keep the licence/attribution.
  // Wikipedia: use the REST summary/extract endpoint and record CC BY-SA.
  throw new Error('fetchSource is a stub — implement against the allowlist before use')
}

async function main() {
  const id = process.argv[2]
  const seeds = SEEDS[id]
  if (!seeds) {
    console.error(`unknown event "${id}". known: ${Object.keys(SEEDS).join(', ')}`)
    process.exit(1)
  }

  for (const url of seeds) assertAllowed(url)
  const raw = await Promise.all(seeds.map(fetchSource))

  const draft = {
    id,
    title: '',
    year: '',
    oneLine: '',
    timeline: [],
    numbers: [],
    redFlags: [],
    teaches: [],
    pairsWith: '',
    questions: [],
    sources: seeds.map((url) => ({ label: '', url })),
    _rawForReview: raw,
  }

  await mkdir(DRAFTS, { recursive: true })
  await writeFile(join(DRAFTS, `${id}.json`), JSON.stringify(draft, null, 2))
  console.log(`wrote drafts/${id}.json — now a person checks it`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
