/**
 * Re-shoots every reference frame in ../screenshots by playing the script in a
 * real browser, and checks each beat lands (the badges, the verdicts, the
 * lesson line). Needs the dev server running and a throwaway puppeteer:
 *
 *   npm run dev          # in one terminal
 *   npm i --no-save puppeteer-core && node demo-kit/tools/scenes.mjs
 */
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const { default: puppeteer } = await import(root + '/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js')
const OUT = root + '/demo-kit/screenshots/'
const BASE = 'http://localhost:5173'
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome-stable', headless: true,
  args: ['--no-sandbox', '--use-gl=swiftshader', '--window-size=1920,1080'] })
const page = await browser.newPage()
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const text = () => page.evaluate(() => document.body.innerText)
const shot = async (name) => { await page.screenshot({ path: OUT + name + '.png' }); console.log('  shot', name) }
// a real trusted click on the last visible button whose text contains `needle`
async function click(needle, exact = false) {
  const handle = await page.evaluateHandle((needle, exact) => {
    const n = needle.toLowerCase()
    const all = [...document.querySelectorAll('button, a')].filter((e) => e.offsetParent !== null)
    const hit = all.filter((e) => { const t = e.innerText.trim().toLowerCase(); return exact ? t === n : t.includes(n) })
    return hit[hit.length - 1] || null
  }, needle, exact)
  const el = handle.asElement()
  if (!el) throw new Error('no button: ' + needle)
  await el.click()
  await sleep(350)
}
// level-ups queue after XP lands; clear any that are showing and say so
async function clearLevelUps(where) {
  for (let i = 0; i < 4; i++) {
    const up = await page.evaluate(() => window.__m.useUiStore.getState().levelUpQueue.map((l) => l.newLevel))
    if (up.length === 0) return
    console.log(`   level-up after ${where}: level ${up[0]}`)
    await click('Back to it'); await sleep(400)
  }
}
async function grab() {
  await page.evaluate(() => {
    window.__m = null
    import('/src/state/store.ts').then((st) => { window.__m = st })
  })
  await page.waitForFunction('window.__m !== null')
}
const ui = (fn) => page.evaluate((fn) => new Function('ui', 'game', fn)(window.__m.useUiStore.getState(), window.__m.useGameStore.getState()), fn)
async function loadSave(letter) {
  await page.goto(BASE + '/demo-kit/load.html', { waitUntil: 'networkidle2' })
  await click(letter + ' ·')
  await page.waitForFunction(() => location.pathname === '/', { timeout: 10000 })
  await sleep(1500)
  await click('Continue', true)
  await sleep(2500)
  await grab()
}

console.log('A — morning')
await loadSave('A')
await shot('02-city-walk')

await ui("ui.setOpenBuilding('bank')"); await sleep(600)
await click('Vector Trading')
await click('High >40%'); await click('Reject', true)
await shot('03a-vector-decide')
await click('Submit decision'); await sleep(900)
await clearLevelUps('Vector Trading')
await shot('03b-vector-outcome')
const t3 = await text()
console.log('   vector:', ['WOULD HAVE DEFAULTED', 'SOUND CALL', 'READ RIGHT'].map((w) => w + '=' + t3.toUpperCase().includes(w)).join(' '))

await click('Done', true)
await click('Anand Dairy')
await click('Low <20%'); await click('Approve in full', true)
await click('Submit decision'); await sleep(900)
await clearLevelUps('Anand Dairy')
await shot('04-dairy-sound-but-defaulted')
const t4 = (await text()).toUpperCase()
console.log('   dairy:', ['DEFAULTED', 'SOUND CALL'].map((w) => w + '=' + t4.includes(w)).join(' '))
await click('Done', true)
await ui("ui.setOpenBuilding(null)"); await sleep(400)

await ui("ui.setOpenBuilding('risk')"); await sleep(600)
await click('Sahyadri Software')
for (const f of ['A very large cash balance', 'Profit the operating cash flow', 'Margins well above', 'A promoter stake falling']) await click(f)
await click('Escalate for a full review')
await shot('06a-sahyadri-decide')
await click('Submit decision'); await sleep(900)
await clearLevelUps('Sahyadri')
await shot('06b-sahyadri-outcome')
const t6 = (await text()).toUpperCase()
console.log('   sahyadri:', ['4/5 TELLS', 'YOU HAVE SEEN THIS BEFORE', 'SATYAM'].map((w) => w + '=' + t6.includes(w)).join(' '))
await click('Done', true)
await ui("ui.setOpenBuilding(null)"); await sleep(400)

await ui("ui.setOpenBuilding('academy')"); await sleep(600)
await click('Drills', true)
await click('Replay: IL&FS')
await click('Cap the exposure and stop adding')
await click('Commit and see what happened'); await sleep(600)
await shot('07-replay-ilfs')
console.log('   replay:', (await text()).toUpperCase().includes('DEFENSIBLE AT THE TIME'))

console.log('B — market')
await loadSave('B')
await ui("ui.setBottomTab('market')"); await sleep(800)
await click('Why did it move today'); await sleep(800)
await page.evaluate(() => {
  const why = [...document.querySelectorAll('button')].find((b) => b.innerText.toLowerCase().includes('why did it move'))
  why.scrollIntoView({ block: 'start' })
})
await sleep(400)
await shot('05a-sethu-news')
const t5a = await text()
await page.evaluate(() => [...document.querySelectorAll('tr')].find((r) => r.innerText.includes('Tarang Payments')).click())
await sleep(900)
await shot('05b-tarang-noise')
const t5b = await text()
console.log('   sethu:', /Today was driven by more than noise/.test(t5a), '| tarang:', /Most of today was noise/.test(t5b))

console.log('C — closing')
await loadSave('C')
await page.waitForFunction(() => document.body.innerText.toUpperCase().includes('DAY 2') && /tomorrow|start day|next day/i.test(document.body.innerText), { timeout: 20000 }).catch(() => {})
await sleep(1500)
await shot('08-day-end')
console.log('   day-end has the lesson:', (await text()).includes('One bad headline there is a bad day'))

console.log('D — a week in')
await loadSave('D')
await ui("ui.setOpenBuilding('academy')"); await sleep(600)
await click('Report', true); await sleep(600)
await shot('09a-report-card')
await click('Awards', true); await sleep(600)
await shot('09b-awards')
console.log('   awards:', (await text()).toUpperCase().includes('READY'))
await ui("ui.setOpenBuilding(null)")

await page.goto(BASE + '/', { waitUntil: 'networkidle2' }); await sleep(1500)
await shot('00-landing-page')
await page.goto(BASE + '/teach/sample', { waitUntil: 'networkidle2' }); await sleep(1500)
await shot('10-teach-sample')
console.log('   teach next:', (await text()).includes('Trading the noise'))

console.log(errors.length ? 'PAGE ERRORS: ' + errors.join(' | ') : 'no page errors')
await browser.close()
