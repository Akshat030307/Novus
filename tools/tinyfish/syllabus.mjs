/**
 * Read one syllabus with the TinyFish Agent, at build time.
 *
 * The live version of this runs in a Supabase function when a teacher pastes a
 * link (supabase/functions/syllabus-plan). This script exists for the sample
 * class: the demo at /teach/sample shows a syllabus that was read once, here,
 * and shipped, so a visitor sees the feature working without spending credits.
 *
 *   node tools/tinyfish/syllabus.mjs <url>                 # print what it read
 *   node tools/tinyfish/syllabus.mjs <url> --out <file>    # and save it
 *   node tools/tinyfish/syllabus.mjs <url> --dry           # no API call
 *   node tools/tinyfish/syllabus.mjs <url> --run <id>      # wait on a run already started
 */
import { writeFileSync } from 'node:fs'
import { requireKey, runAgent } from './agent.mjs'
import { SYLLABUS_GOAL, SYLLABUS_SCHEMA, SYLLABUS_MAX_SECONDS, cleanSyllabus } from '../../supabase/functions/_shared/syllabus-spec.js'

const url = process.argv[2]
const outAt = process.argv.indexOf('--out')
const out = outAt > -1 ? process.argv[outAt + 1] : null
const runAt = process.argv.indexOf('--run')
const resume = runAt > -1 ? process.argv[runAt + 1] : null
if (!url || !/^https?:\/\//.test(url)) {
  console.error('usage: node tools/tinyfish/syllabus.mjs <syllabus url> [--out file] [--dry]')
  process.exit(1)
}
if (process.argv.includes('--dry')) {
  console.log(`would read ${url}\ngoal: ${SYLLABUS_GOAL}`)
  process.exit(0)
}

const key = requireKey()
const started = Date.now()
console.log(`reading ${url} …`)
const run = await runAgent(key, {
  url, goal: SYLLABUS_GOAL, schema: SYLLABUS_SCHEMA, maxSeconds: SYLLABUS_MAX_SECONDS, runId: resume,
  onStart: (id) => console.log(`run ${id} ${resume ? 'resumed' : 'started'} (resume with --run ${id})`),
})
const clean = cleanSyllabus(run.result)
const secs = Math.round((Date.now() - started) / 1000)

console.log(`done in ${secs}s, ${run.steps ?? '?'} steps · ${clean.institution || 'institution not stated'} · ${clean.programme || ''}`)
for (const c of clean.courses) {
  console.log(`\n  ${c.title}${c.semester ? `  (${c.semester})` : ''}`)
  for (const u of c.units) console.log(`    · ${u.title}${u.hours ? ` [${u.hours}h]` : ''}${u.weeks ? ` [${u.weeks} wk]` : ''}  ${u.topics.slice(0, 4).join('; ')}`)
}
if (out) {
  writeFileSync(out, JSON.stringify({ url, readAt: new Date().toISOString(), readBy: 'TinyFish Agent API', runId: run.runId, seconds: secs, ...clean }, null, 2) + '\n')
  console.log(`\nwritten to ${out}`)
}
