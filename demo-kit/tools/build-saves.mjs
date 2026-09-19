import { writeFileSync } from 'node:fs'
import { fresh, runTo, endDay, jiti, R } from './driver.mjs'
const { resolveCase } = await jiti.import(R + '/src/sim/cases/index.ts')
const { getCase } = await jiti.import(R + '/src/data/cases/index.ts')
const { applyTrade } = await jiti.import(R + '/src/sim/portfolio.ts')
const { checkQuests } = await jiti.import(R + '/src/sim/quests.ts')
const { checkConcepts } = await jiti.import(R + '/src/sim/concepts.ts')
const { recordAttempt } = await jiti.import(R + '/src/sim/modules.ts')
const { assess, CERTIFICATES } = await jiti.import(R + '/src/sim/certificates.ts')
const { buildDayEndReport } = await jiti.import(R + '/src/sim/clock.ts')
const { applyDialogueEffect } = await jiti.import(R + '/src/sim/quests.ts')
const { analyseDay } = await jiti.import(R + '/src/sim/analysis.ts')

/**
 * Builds the four demo saves in ../saves from the real game code.
 *
 *   node demo-kit/tools/build-saves.mjs
 *   NOVUS_DEMO_NAME="Your Name" node demo-kit/tools/build-saves.mjs
 *
 * The seed is not arbitrary. It was searched for (see SHOT-LIST.md) so that on
 * day 2: the infrastructure headline fires at 9:46, rejecting Vector Trading is
 * vindicated, approving Anand Dairy in full is sound and still defaults, and
 * escalating Sahyadri is vindicated. Change the seed and the script breaks.
 * The player's name can be changed freely — nothing depends on it.
 */
const SEED = 'novus-trailer-17483'
const NAME = process.env.NOVUS_DEMO_NAME || 'Asha Iyer'
const OUT = R + '/demo-kit/saves/'
const hm = (h, m) => h * 60 + m

// every player action goes through the same follow-ups the UI runs
const settle = (s) => checkConcepts(checkQuests(s).state).state
const decide = (s, id, choice, extra = {}) => settle(resolveCase(s, getCase(id), { choice, ...extra }).state)
const trade = (s, stockId, side, quantity) => {
  const r = applyTrade(s, { stockId, side, quantity })
  if (!r.ok) throw new Error(`${side} ${quantity} ${stockId}: ${r.reason}`)
  return settle(r.state)
}
const passModule = (s, id, score) => settle(recordAttempt(s, id, score))
// what world/bridge.ts records when the player walks through a door or talks to someone
const mark = (s, ...keys) => settle({ ...s, flags: { ...s.flags, ...Object.fromEntries(keys.map((k) => [k, true])) } })
// the effect a conversation choice applies in DialogueBox (data/npcs.ts)
const given = (s, quest) => settle(applyDialogueEffect(s, { giveQuest: quest }))
const stock = (s, name) => s.market.stocks.find((x) => x.name === name).id
const write = (file, description, save, attempts) => {
  writeFileSync(OUT + file, JSON.stringify({ description, save, ...(attempts && { attempts }) }))
  const c = save.clock
  console.log(`${file.padEnd(18)} day ${c.day} ${Math.floor(c.minute / 60)}:${String(c.minute % 60).padStart(2, '0')}  ${description}`)
}

/* ---------- A: day 2, 9:05 — the files are on the desk, nothing decided ---------- */
// day 1: what a real first day is — walk into the Bank, meet Rao, go home
let s = runTo(fresh(NAME, SEED), hm(9, 20))
s = mark(s, 'entered:bank', 'talked:bank-manager')
s = given(s, 'the-bad-loan') // Rao, on the first day
s = endDay(s)
s = runTo(s, hm(9, 5))
const A = s
console.log('   desk on day 2:', A.quests.active.map((q) => `${q.title} ${q.steps.filter((x) => x.done).length}/${q.steps.length}`).join(' | ') || '(nothing active)')
write('a-morning.json', 'Day 2, 9:05. All files unopened. Scenes 2, 3, 4, 6.', A)

/* ---------- B: the same morning played the way the script plays it, to 11:14 ---------- */
s = runTo(A, hm(9, 20))
s = mark(s, 'entered:risk')
s = decide(s, 'loan-vector-trading', 'reject', { prediction: { risk: 'high' } })
s = decide(s, 'loan-anand-dairy', 'approve_full', { prediction: { risk: 'low' } })
s = decide(s, 'pattern-sahyadri-software', 'escalate', {
  flags: ['idle-cash', 'profit-no-cash', 'margin-outlier', 'promoter-exit'],
})
s = runTo(s, hm(10, 5))
s = mark(s, 'entered:exchange', 'talked:trader')
s = given(s, 'opening-bell') // Vikram: "how do I actually trade?"
s = trade(s, stock(s, 'Sethu Infra'), 'buy', 150)
s = runTo(s, hm(11, 14))
const B = s
write('b-market.json', 'Day 2, 11:14, after the infra headline. Sethu Infra vs Tarang Payments. Scene 5.', B)

/* ---------- C: the same day, five minutes before the close ---------- */
s = runTo(B, hm(13, 40))
s = trade(s, stock(s, 'Sethu Infra'), 'sell', 50)
s = runTo(s, hm(15, 25))
const C = s
write('c-closing.json', 'Day 2, 15:25. The close is five seconds away. Scene 8.', C)
{
  const closed = runTo(C, 24 * 60)
  const r = buildDayEndReport(closed)
  console.log(`   day-end: net ${r.netChange} paise, booked ${r.realisedPnL}, trades ${r.tradeCount}, lesson: ${r.lesson ?? analyseDay(closed)}`)
}

/* ---------- D: day 6 — a week of real work behind her, for the report card ---------- */
s = endDay(C)
// day 3: one bad call and a churning afternoon — so the record has habits in it
s = runTo(s, hm(9, 30))
s = decide(s, 'loan-sharma-textiles', 'approve_full', { prediction: { risk: 'low' } })
s = decide(s, 'loan-girish-steel', 'reject', { prediction: { risk: 'high' } })
s = mark(s, 'entered:academy', 'talked:journalist')
s = given(s, 'off-the-record') // Meera
s = passModule(s, 'loan-files', 0.4)
s = passModule(s, 'loan-files', 0.8)
s = runTo(s, hm(10, 30))
const CHURN = [
  ['Tarang Payments', 'buy', 40], ['Tarang Payments', 'sell', 20],
  ['Anvaya Systems', 'buy', 30], ['Anvaya Systems', 'sell', 30],
  ['Chitra Retail', 'buy', 25], ['Chitra Retail', 'sell', 25],
]
for (const [i, [name, side, qty]] of CHURN.entries()) {
  s = runTo(s, hm(10, 40 + i * 12))
  s = trade(s, stock(s, name), side, qty)
}
s = endDay(s)

// day 4: the careful middle of the week
s = runTo(s, hm(9, 30))
s = decide(s, 'loan-prakash-cold-storage', 'approve_with_collateral', { prediction: { risk: 'mid' } })
s = decide(s, 'alloc-trust-book', 'cut_the_theme')
s = passModule(s, 'balance-sheet', 0.8)
s = passModule(s, 'cash-vs-profit', 1)
s = runTo(s, hm(11, 0))
s = trade(s, stock(s, 'Vaidya Pharma'), 'buy', 60)
s = trade(s, stock(s, 'Grihini Foods'), 'buy', 80)
s = endDay(s)

// day 5: compliance work, read properly this time
s = runTo(s, hm(9, 30))
s = mark(s, 'talked:risk-officer', 'entered:cafeteria')
s = given(s, 'second-opinion') // Sunil
s = decide(s, 'pattern-setu-finance', 'require_liquidity', {
  flags: ['tenor-gap', 'rollover', 'thin-lines', 'rating-comfort', 'group-sprawl'],
})
s = decide(s, 'pattern-harbour-trade', 'escalate', {
  flags: ['ledger-gap', 'annual-recon', 'no-rotation', 'local-checker', 'clean-audits'],
})
s = passModule(s, 'diversification', 0.8)
s = passModule(s, 'reading-the-tape', 0.8)
s = endDay(s)

// day 6, first thing
s = runTo(s, hm(9, 10))
const D = s

// the practice log: every go, including the bad ones, spread over the week
const at = (d, h) => new Date(Date.UTC(2026, 8, d, h, 0)).toISOString()
let n = 0
const log = (kind, refId, score, outOf, passed, when, detail) => ({
  // real UUIDs — the attempts table's id column is uuid, so anything else fails
  // the moment a signed-in player's log syncs. Fixed rather than random, so
  // loading D twice into the same account adds nothing the second time.
  id: `d0000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
  kind, refId, score, outOf, passed, at: when, ...(detail && { detail }),
})
const attempts = [
  log('module', 'loan-files', 2, 5, false, at(11, 9)),
  log('drill', 'credit-desk', 2, 5, false, at(11, 10), { readsRight: 2 }),
  log('module', 'loan-files', 4, 5, true, at(12, 9)),
  log('drill', 'spot-the-shock', 2, 4, false, at(12, 11), { strayPicks: 3, headline: 1 }),
  log('drill', 'credit-desk', 4, 5, false, at(13, 10), { readsRight: 3 }),
  log('module', 'balance-sheet', 4, 5, true, at(13, 12)),
  log('module', 'cash-vs-profit', 5, 5, true, at(13, 13)),
  log('drill', 'build-a-book', 1, 2, false, at(14, 9), { holdings: 3, biggestSharePct: 48 }),
  log('drill', 'replay-satyam', 2, 3, false, at(14, 11), { steps: 3 }),
  log('drill', 'spot-the-shock', 4, 4, true, at(15, 10), { strayPicks: 0, headline: 2 }),
  log('module', 'diversification', 4, 5, true, at(15, 12)),
  log('module', 'reading-the-tape', 4, 5, true, at(16, 9)),
  log('drill', 'replay-satyam', 3, 3, true, at(16, 10), { steps: 3 }),
  log('drill', 'credit-desk', 5, 5, true, at(17, 10), { readsRight: 5 }),
].sort((a, b) => (a.at < b.at ? 1 : -1))

console.log('   desk on day 6:', D.quests.active.map((q) => `${q.title} ${q.steps.filter((x) => x.done).length}/${q.steps.length}`).join(' | ') || '(nothing active)', '| done:', D.quests.completed.join(', '))
write('d-record.json', 'Day 6, 9:10. A week of work, a practice log, one award ready. Scene 9.', D, attempts)
console.log('   concepts', D.learned.length, '| resolved', D.cases.resolved.length,
  '| sound', D.cases.resolved.filter((r) => r.judgement === 'sound').length,
  '| mistakes', D.mistakes.map((m) => m.kind).join(','))
for (const c of CERTIFICATES) {
  const a = assess(c, D, attempts)
  console.log(`   ${c.title}: ${a.earned ? 'READY' : 'not yet'} — ${a.requirements.map((r) => `${r.id} ${r.got}/${r.need}`).join(', ')}`)
}
