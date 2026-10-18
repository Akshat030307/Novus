/**
 * Novus — hackathon pitch deck.
 *
 * Design follows "Novus_Fintech_RPG_Pitch (1).pptx" in the repo root: a
 * 20 x 11.25in canvas, the landing page's plum palette, Arial for reading and
 * Courier New for labels and figures, dark and light slides alternating, an
 * eyebrow of "NN  SECTION NAME" on every content slide.
 */
const path = require('path')
const pptxgen = require('pptxgenjs')
const { applyTheme } = require(
  '/home/gingersnaps/.claude/skills/synced/e3c6b935-3dea-4e2b-8151-d987b598cba3_d7a11fbe-84b3-4a06-aa39-8b3dd6815ab0/pptx/scripts/apply_theme.js',
)

const SHOTS = '/home/gingersnaps/Documents/rpgs/novus/docs/screenshots/'
const OUT = path.join(__dirname, 'Novus_TinyFish_Pitch.pptx')

const THEME = {
  name: 'Novus',
  headFontFace: 'Arial',
  bodyFontFace: 'Arial',
  colors: {
    dk1: '16091C', // plum ground
    lt1: 'F7EEF3', // blush
    dk2: '241430', // raised plum
    lt2: 'E9DCE4', // blush, shaded
    accent1: 'FF2D78', // magenta
    accent2: 'F2A73B', // marigold
    accent3: 'FF7AB0', // soft magenta
    accent4: 'C9B6CF', // muted, on dark
    accent5: '5C4A63', // muted, on light
    accent6: '43C08A', // jade
    hlink: 'FF7AB0',
    folHlink: 'C9B6CF',
  },
}

const PLUM = '16091C'
const PLUM2 = '241430'
const BLUSH = 'F7EEF3'
const MUTED_D = 'C9B6CF'
const MUTED_L = '5C4A63'
const MAGENTA = 'FF2D78'
const MARIGOLD = 'F2A73B'
const JADE = '43C08A'
const MONO = 'Courier New'
const SANS = 'Arial'

const W = 20
const H = 11.25
const M = 1.0 // side margin

const pres = new pptxgen()
pres.defineLayout({ name: 'NOVUS', width: W, height: H })
pres.layout = 'NOVUS'
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace }
pres.author = 'Akshat Chowdhary'
pres.title = 'Novus — finance, played'
pres.subject = 'Hackathon pitch'

/* ---------- layouts ---------- */

const eyebrowOpts = (color) => ({
  x: M, y: 0.62, w: 14, h: 0.5,
  fontFace: MONO, fontSize: 19, bold: true, charSpacing: 3, color, valign: 'middle',
})
const titleOpts = (color) => ({
  x: M, y: 1.1, w: W - 2 * M, h: 1.2,
  fontFace: SANS, fontSize: 50, bold: true, color, valign: 'top', align: 'left',
})

pres.defineSlideMaster({
  title: 'DARK',
  background: { color: PLUM },
  slideNumber: { x: W - 1.1, y: H - 0.72, w: 0.6, h: 0.35, fontFace: MONO, fontSize: 13, color: '4A3A52', align: 'right' },
  objects: [
    { placeholder: { options: { name: 'eyebrow', type: 'body', ...eyebrowOpts(MUTED_D) }, text: ' ' } },
    { placeholder: { options: { name: 'title', type: 'title', ...titleOpts(BLUSH) }, text: ' ' } },
  ],
})

pres.defineSlideMaster({
  title: 'LIGHT',
  background: { color: BLUSH },
  slideNumber: { x: W - 1.1, y: H - 0.72, w: 0.6, h: 0.35, fontFace: MONO, fontSize: 13, color: 'C9B6CF', align: 'right' },
  objects: [
    { placeholder: { options: { name: 'eyebrow', type: 'body', ...eyebrowOpts(MUTED_L) }, text: ' ' } },
    { placeholder: { options: { name: 'title', type: 'title', ...titleOpts(PLUM) }, text: ' ' } },
  ],
})

pres.defineSlideMaster({
  title: 'COVER',
  background: { color: PLUM },
  objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: M, y: 2.3, w: 8.8, h: 3.6, fontFace: SANS, fontSize: 96, bold: true, color: BLUSH, align: 'left' }, text: ' ' } },
    { placeholder: { options: { name: 'body', type: 'body', x: M, y: 6.4, w: 8.8, h: 2.2, fontFace: SANS, fontSize: 23, color: MUTED_D, align: 'left' }, text: ' ' } },
  ],
})

/* ---------- helpers ---------- */

/** "07  TINYFISH INTEGRATION" — the number in magenta, the label in muted */
const eyebrow = (slide, num, label) =>
  slide.addText(
    [
      { text: num, options: { color: MAGENTA } },
      { text: '   ' + label, options: {} },
    ],
    { placeholder: 'eyebrow' },
  )

/** a labelled block of copy: Courier label, then lines of Arial */
function block(slide, o) {
  const dark = o.dark !== false
  slide.addText(o.label, {
    x: o.x, y: o.y, w: o.w, h: 0.4, margin: 0,
    fontFace: MONO, fontSize: 16, bold: true, charSpacing: 2,
    color: o.labelColor || (dark ? MAGENTA : MUTED_L),
    objectName: o.label + ' label',
  })
  const body = o.lines.map((t, i) => ({
    text: t,
    options: {
      breakLine: i < o.lines.length - 1,
      fontSize: i === 0 ? 21 : 18,
      color: i === 0 ? (dark ? BLUSH : PLUM) : (dark ? MUTED_D : MUTED_L),
      paraSpaceAfter: 8,
    },
  }))
  slide.addText(body, {
    x: o.x, y: o.y + 0.55, w: o.w, h: o.h || 2.6, margin: 0,
    fontFace: SANS, valign: 'top', objectName: o.label + ' body',
  })
}

/** a big figure with its caption, the way the reference deck shows a stat */
function stat(slide, o) {
  const dark = o.dark !== false
  slide.addText(o.value, {
    x: o.x, y: o.y, w: o.w, h: 1.5, margin: 0,
    fontFace: SANS, fontSize: o.size || 80, bold: true, color: o.color || MAGENTA,
    objectName: 'stat ' + o.value,
  })
  slide.addText(o.caption, {
    x: o.x, y: o.y + 1.5, w: o.w, h: 0.5, margin: 0,
    fontFace: SANS, fontSize: 20, color: dark ? BLUSH : PLUM,
  })
  if (o.note) {
    slide.addText(o.note, {
      x: o.x, y: o.y + 2.0, w: o.w, h: 0.9, margin: 0,
      fontFace: SANS, fontSize: 15, color: dark ? MUTED_D : MUTED_L,
    })
  }
}

/** the reference deck's takeaway band: marigold, dark text, one line */
function band(slide, text) {
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: H - 1.15, w: W, h: 1.15, fill: { color: MARIGOLD }, objectName: 'takeaway band',
  })
  slide.addShape(pres.ShapeType.rect, { x: M, y: H - 0.72, w: 0.22, h: 0.22, fill: { color: PLUM } })
  slide.addText(text, {
    x: M + 0.5, y: H - 1.1, w: W - 2 * M - 0.5, h: 1.05, margin: 0,
    fontFace: SANS, fontSize: 21, bold: true, color: PLUM, valign: 'middle', objectName: 'takeaway',
  })
}

/** a screenshot, with the magenta edge the reference uses on its captures */
function shot(slide, file, o) {
  slide.addShape(pres.ShapeType.rect, {
    x: o.x, y: o.y, w: 0.07, h: o.h, fill: { color: MAGENTA }, objectName: 'shot edge',
  })
  slide.addImage({
    path: SHOTS + file, x: o.x + 0.07, y: o.y, w: o.w, h: o.h,
    objectName: file.replace('.png', ''),
  })
}

/** a thin vertical rule between two columns, as on reference slide 3 */
const divider = (slide, x, y, h) =>
  slide.addShape(pres.ShapeType.rect, { x, y, w: 0.03, h, fill: { color: MAGENTA }, objectName: 'divider' })

const chip = (slide, o) =>
  slide.addText(o.text, {
    x: o.x, y: o.y, w: o.w, h: 0.62, margin: 0, align: 'center', valign: 'middle',
    fontFace: MONO, fontSize: 15, bold: true, charSpacing: 2,
    color: o.ink, fill: o.fill ? { color: o.fill } : undefined,
    line: o.line ? { color: o.line, width: 1.5 } : undefined,
    objectName: 'chip ' + o.text,
  })

/* ================= slides =================
 *
 * Nine slides, one per heading, titled with the heading itself. The line that
 * used to be the title now sits under it as the statement, so each slide still
 * says something rather than only naming a section.
 */

/** the eyebrow carries the branding and the number, since there is no cover slide */
function head(s, num, statement, dark = true) {
  s.addText(
    [
      { text: num, options: { color: MAGENTA } },
      { text: '   NOVUS  ·  FINANCE, PLAYED', options: {} },
    ],
    { placeholder: 'eyebrow' },
  )
  s.addText(statement, {
    x: M, y: 2.35, w: W - 2 * M, h: 0.8, margin: 0,
    fontFace: SANS, fontSize: 28, color: dark ? MUTED_D : MUTED_L,
    objectName: 'statement',
  })
}

/* 1 — problem statement */
pres.addSection({ title: 'Problem statement' })
{
  const s = pres.addSlide({ masterName: 'LIGHT', sectionTitle: 'Problem statement' })
  s.addText('Problem statement', { placeholder: 'title' })
  head(s, '01', 'India opened 26 crore trading accounts. Nobody opened a practice account.', false)
  stat(s, {
    dark: false, x: M, y: 3.9, w: 7.5, value: '26 cr', size: 92,
    caption: 'trading accounts on the NSE, June 2026',
    note: 'The last crore was added in under four months. Demat accounts stand at 23.4 crore.',
  })
  divider(s, 9.6, 3.8, 4.1)
  stat(s, {
    dark: false, x: 10.4, y: 3.9, w: 8.6, value: '27%', size: 92, color: PLUM,
    caption: 'of adults are financially literate',
    note: '33% urban, 24% rural. NCFE Financial Literacy and Inclusion Survey, 2019.',
  })
  s.addText(
    [
      { text: 'The gap is not information. It is practice', options: { bold: true } },
      { text: ' — and one habit nobody corrects: judging a decision by how it turned out instead of by what was knowable when it was made. A lucky bet is filed as skill, a sound call that lost money is filed as a mistake, and the lesson lands upside down. Institutional trading simulators teach the difference; they are priced far past any student.', options: {} },
    ],
    { x: M, y: 8.3, w: W - 2 * M, h: 2.0, margin: 0, fontFace: SANS, fontSize: 24, color: PLUM, valign: 'top', objectName: 'problem statement' },
  )
  s.addNotes('26 crore accounts, 27% literacy. The missing piece is practice with consequences, and the outcome bias nobody trains out.')
}

/* 2 — proposed solution */
pres.addSection({ title: 'Proposed solution' })
{
  const s = pres.addSlide({ masterName: 'DARK', sectionTitle: 'Proposed solution' })
  s.addText('Proposed solution', { placeholder: 'title' })
  head(s, '02', 'A trading floor you can open in a browser tab — graded on reasoning, never on luck.')
  const rows = [
    ['THE BANK', 'Judge loan files on real figures', 'Revenue, cash flow, debt, collateral, a credit score. Commit a risk read, then approve, cut, lend against collateral, or reject.'],
    ['THE EXCHANGE', 'Trade a market that ticks every second', 'Twelve invented companies. Every move splits into drift, noise and news, so you can see what was signal.'],
    ['RISK & COMPLIANCE', 'Find the tells in a set of accounts', 'Real warning signs among decoys that only look odd. Each file echoes a collapse the game names afterwards.'],
    ['THE ACADEMY', 'Practise, and keep the record', 'Modules, drills, replays of Satyam and IL&FS, and a transcript anyone can verify with a code.'],
  ]
  rows.forEach(([label, h2, body], i) => {
    block(s, { x: M, y: 3.6 + i * 1.8, w: 8.3, h: 1.3, label, lines: [h2, body] })
  })
  shot(s, '04-sound-call.png', { x: 10.3, y: 3.5, w: 6.8, h: 6.18 })
  s.addText(
    [
      { text: 'Anand Dairy: an 8% risk file, correctly approved, that defaulted anyway. ', options: { bold: true, color: BLUSH } },
      { text: 'Every file has a hidden risk and the outcome is a roll against it — the call is scored against the risk, never the roll. Seeded, so a class can replay the same day and argue about the same decision.', options: {} },
    ],
    { x: 10.3, y: 9.85, w: 8.6, h: 1.3, margin: 0, fontFace: SANS, fontSize: 15, color: MUTED_D, objectName: 'claim note' },
  )
  s.addNotes('Four desks, one city — and the single claim the product rests on: a sound call that defaulted is still sound.')
}

/* 3 — target users or use case */
pres.addSection({ title: 'Target users or use case' })
{
  const s = pres.addSlide({ masterName: 'LIGHT', sectionTitle: 'Target users or use case' })
  s.addText('Target users or use case', { placeholder: 'title' })
  head(s, '03', 'Three people, one record.', false)
  const cols = [
    ['STUDENTS', 'Commerce and finance undergraduates', 'They have the vocabulary and no reps. Novus gives them decisions with consequences before the first salary arrives.'],
    ['TEACHERS AND COLLEGES', 'A class, set work, and a habit report', 'Create a class, share a join code, set drills with due dates, and open one screen that says what the class is getting wrong.'],
    ['FIRST-TIME INVESTORS', 'Practice before real money', 'A market that moves for reasons you can inspect, and a day-end debrief that names the mistake.'],
  ]
  cols.forEach(([label, h2, body], i) => {
    block(s, { dark: false, x: M + i * 6.2, y: 3.7, w: 5.5, h: 2.8, label, lines: [h2, body] })
  })
  divider(s, 6.85, 3.6, 3.2)
  divider(s, 13.05, 3.6, 3.2)
  shot(s, '12-teacher-dashboard.png', { x: M, y: 6.5, w: 8.0, h: 4.5 })
  block(s, {
    dark: false, x: 10.4, y: 6.6, w: 8.5, h: 4.3, label: 'THE USE CASE', labelColor: MAGENTA,
    lines: [
      'One term, one class, one artifact',
      'A student plays through a week of decisions. The teacher sees the habits the game logged, not a quiz score — who is late, who has not started, and what at least a quarter of the class keeps getting wrong.',
      'At the end the student issues a transcript, and anyone — a recruiter, a parent, the college — can verify it with a code, in a browser, with no sign-in.',
    ],
  })
  s.addNotes('Students practise, teachers see habits, and the transcript is the thing that leaves the classroom.')
}

/* 4 — role of machine learning or AI */
pres.addSection({ title: 'Role of Machine Learning or AI' })
{
  const s = pres.addSlide({ masterName: 'DARK', sectionTitle: 'Role of Machine Learning or AI' })
  s.addText('Role of Machine Learning or AI', { placeholder: 'title' })
  head(s, '04', 'The grade stays deterministic. The AI reads and writes.')
  block(s, {
    x: M, y: 3.7, w: 8.3, h: 4.6, label: 'WHAT STAYS RULES-BASED', labelColor: MARIGOLD,
    lines: [
      'Everything that produces a number',
      'Risk, scoring, market ticks and the day-end report are plain, seeded TypeScript. No model touches them.',
      'An assessment you cannot reproduce is not an assessment: a transcript has to mean the same thing twice, and a class has to be able to replay the same day and get the same result.',
    ],
  })
  divider(s, 9.6, 3.6, 6.6)
  block(s, {
    x: 10.4, y: 3.7, w: 8.5, h: 1.6, label: 'LIVE TODAY  ·  WORDING ONLY', labelColor: JADE,
    lines: [
      'A model may rephrase a write-up, never produce a figure',
      'It gets numbers the simulation already computed, invents nothing, and every path has written fallback text if the model is off or slow.',
    ],
  })
  const next = [
    ['PROPOSED  ·  GRADE THE REASON', 'Players already type one line of why before they decide. It is stored and ungraded. A model can score that sentence against the drivers the file actually had.'],
    ['PROPOSED  ·  PREDICT THE NEXT SLIP', 'The attempt log keeps every try, not just the best. A model over that log can tell a teacher which concept a student is about to fail.'],
    ['PROPOSED  ·  AGENTS THAT SOURCE FACTS', 'TinyFish agents gather and verify the real-case material the Casebook is built on — the next slide.'],
  ]
  next.forEach(([label, body], i) => {
    block(s, { x: 10.4, y: 6.0 + i * 1.75, w: 8.5, h: 1.3, label, lines: [body] })
  })
  s.addNotes('Deterministic where a number is produced, AI where language is read or written.')
}

/* 5 — proposed technical approach */
pres.addSection({ title: 'Proposed technical approach' })
{
  const s = pres.addSlide({ masterName: 'LIGHT', sectionTitle: 'Proposed technical approach' })
  s.addText('Proposed technical approach', { placeholder: 'title' })
  head(s, '05', 'Three layers that cannot reach into each other.', false)
  const layers = [
    ['sim/', 'All rules, money and randomness', 'May never import React, Phaser or fetch, and may never call Math.random — the seeded generator only.', MAGENTA],
    ['world/', 'Draws the city and moves the player', 'May never decide anything about money.', MARIGOLD],
    ['ui/', 'Shows state and sends actions', 'May never do money maths itself.', JADE],
  ]
  layers.forEach(([name, what, never, colour], i) => {
    const y = 3.7 + i * 1.75
    s.addShape(pres.ShapeType.rect, { x: M, y, w: 11.4, h: 1.45, fill: { color: 'E9DCE4' }, objectName: 'layer ' + name })
    s.addText(name, {
      x: M + 0.35, y, w: 2.1, h: 1.45, margin: 0, fontFace: MONO, fontSize: 28, bold: true,
      color: colour, valign: 'middle',
    })
    s.addText(
      [
        { text: what, options: { bold: true, fontSize: 20, color: PLUM, breakLine: true } },
        { text: never, options: { fontSize: 16, color: MUTED_L } },
      ],
      { x: M + 2.6, y, w: 8.5, h: 1.45, margin: 0, fontFace: SANS, valign: 'middle' },
    )
  })
  s.addText('They meet in one store. Phaser reaches the rest of the app through a single bridge file, and privacy between a teacher and a student is enforced in Postgres row-level security, not in the client. Money is stored as whole paise and formatted in one place, so no screen can round it differently.', {
    x: M, y: 9.2, w: 11.4, h: 1.6, margin: 0, fontFace: SANS, fontSize: 18, color: MUTED_L, objectName: 'layer note',
  })
  block(s, {
    dark: false, x: 13.2, y: 3.7, w: 5.8, h: 2.6, label: 'THE STACK', labelColor: MAGENTA,
    lines: ['Vite · React 19 · TypeScript (strict) · Tailwind v4 · Phaser 4 · Zustand · Supabase with row-level security. Deployed as one container behind Caddy on a small VPS.'],
  })
  const facts = [
    ['2.0 MB', 'bundle, 554 KB gzipped'],
    ['1 second', 'of real time per game minute'],
    ['paise', 'money stored as whole integers'],
    ['v6', 'save migrations, old saves still load'],
  ]
  facts.forEach(([v, c], i) => {
    const y = 6.4 + i * 1.15
    s.addText(v, { x: 13.2, y, w: 2.4, h: 0.6, margin: 0, fontFace: MONO, fontSize: 24, bold: true, color: PLUM })
    s.addText(c, { x: 15.6, y: y + 0.06, w: 3.6, h: 0.6, margin: 0, fontFace: SANS, fontSize: 16, color: MUTED_L })
  })
  s.addNotes('The layer rule is why the market is testable and why a save replays exactly.')
}

/* 6 — proposed TinyFish integration */
pres.addSection({ title: 'Proposed TinyFish integration' })
{
  const s = pres.addSlide({ masterName: 'DARK', sectionTitle: 'Proposed TinyFish integration' })
  s.addText('Proposed TinyFish integration', { placeholder: 'title' })
  head(s, '06', 'Agents that do the homework the game cannot.')
  const cards = [
    ['FETCH  +  SEARCH', 'Sourced fact packs for the Casebook', 'Filings, regulator orders and news archives pulled as structured JSON, so every figure in a real case lands with its citation attached. The draft banner on that content comes off.'],
    ['MONITOR', 'Watch the pages that make new cases', 'A standing watch on regulator and exchange pages. When a concluded event appears, we are told, and a new drill gets written from it — triggered by the alert, authored by a human.'],
    ['AGENT  +  TINYVAULT', 'Reach the college systems that have no API', 'A goal-driven agent signs in to a department portal and files a class’s results, with credentials held in the vault and never seen by the model.'],
    ['BROWSER', 'Keep the citations honest', 'A nightly pass opens every source link in the Casebook and flags the ones that moved, changed or died, so study material cannot rot quietly.'],
  ]
  cards.forEach(([label, h2, body], i) => {
    const x = M + (i % 2) * 9.3
    const y = 3.6 + Math.floor(i / 2) * 3.1
    s.addShape(pres.ShapeType.rect, { x, y, w: 8.7, h: 2.7, fill: { color: PLUM2 }, objectName: 'tinyfish card ' + i })
    s.addText(label, {
      x: x + 0.45, y: y + 0.3, w: 7.8, h: 0.4, margin: 0, fontFace: MONO, fontSize: 16, bold: true,
      charSpacing: 2, color: MAGENTA,
    })
    s.addText(
      [
        { text: h2, options: { bold: true, fontSize: 21, color: BLUSH, breakLine: true, paraSpaceAfter: 6 } },
        { text: body, options: { fontSize: 17, color: MUTED_D } },
      ],
      { x: x + 0.45, y: y + 0.85, w: 7.8, h: 1.7, margin: 0, fontFace: SANS, valign: 'top' },
    )
  })
  band(s, 'TinyFish never touches the playable market. It feeds the study material and the teacher’s workflow — the companies you trade stay invented, because a learning game with real tickers is advice.')
  s.addNotes('Four uses, two of which fix problems already written down in the repo: unsourced Casebook figures, and getting results into college systems.')
}

/* 7 — expected impact */
pres.addSection({ title: 'Expected impact' })
{
  const s = pres.addSlide({ masterName: 'LIGHT', sectionTitle: 'Expected impact' })
  s.addText('Expected impact', { placeholder: 'title' })
  head(s, '07', 'A record of judgement, not a high score.', false)
  const counts = [['12', 'concepts'], ['9', 'case files'], ['5', 'drills'], ['6', 'real collapses']]
  counts.forEach(([v, c], i) => {
    const x = M + i * 4.6
    s.addText(v, { x, y: 3.6, w: 4.2, h: 1.2, margin: 0, fontFace: SANS, fontSize: 64, bold: true, color: MAGENTA })
    s.addText(c, { x, y: 4.85, w: 4.2, h: 0.5, margin: 0, fontFace: MONO, fontSize: 17, charSpacing: 2, color: MUTED_L })
  })
  const who = [
    ['FOR A STUDENT', 'Something to show for the practice', 'Concepts met, every decision with its risk-read accuracy, modules passed and mistakes logged — issued as a transcript with a code anyone can check in a browser, with no sign-in.'],
    ['FOR A TEACHER', 'Next week’s lesson, written by the class', 'One screen: who has done the work, who is late, and the habits at least a quarter of them share — "trading the noise, 7 of 12 students". Built from how they played, not from a quiz score.'],
    ['FOR A COLLEGE', 'A pilot that costs a browser tab', 'No per-seat licence, no lab to set up, nothing to install. The sample class is open to any teacher who wants to see the dashboard before creating one.'],
  ]
  who.forEach(([label, h2, body], i) => {
    block(s, { dark: false, x: M + i * 6.2, y: 5.9, w: 5.5, h: 3.6, label, labelColor: MAGENTA, lines: [h2, body] })
  })
  divider(s, 6.85, 5.8, 3.5)
  divider(s, 13.05, 5.8, 3.5)
  band(s, 'Free, in a browser, on a phone-grade connection: the cost of trying it is one tab.')
  s.addNotes('Impact is the record and the teacher view, not a user count.')
}

/* 8 — feasibility */
pres.addSection({ title: 'Feasibility' })
{
  const s = pres.addSlide({ masterName: 'DARK', sectionTitle: 'Feasibility' })
  s.addText('Feasibility', { placeholder: 'title' })
  head(s, '08', 'It already runs — at game.akshatchowdhary.online.')
  const live = [
    'Playable now, with no install and no sign-in to start',
    'Cloud saves, verifiable transcripts and named awards, all live',
    'A teacher dashboard with a labelled sample class anyone can open',
    'An 84-second gameplay trailer on the landing page',
    'Hosted as one container behind Caddy on an existing VPS',
  ]
  s.addText('LIVE TODAY', {
    x: M, y: 3.6, w: 8.3, h: 0.4, margin: 0, fontFace: MONO, fontSize: 16, bold: true, charSpacing: 2, color: JADE,
  })
  s.addText(
    live.map((t, i) => ({ text: t, options: { bullet: { code: '25A0' }, breakLine: i < live.length - 1, paraSpaceAfter: 12 } })),
    { x: M, y: 4.2, w: 8.3, h: 2.6, margin: 0, valign: 'top', fontFace: SANS, fontSize: 19, color: BLUSH, objectName: 'live list' },
  )
  shot(s, '01-landing.png', { x: M, y: 6.95, w: 6.4, h: 4.0 })
  divider(s, 9.6, 3.5, 6.4)
  block(s, {
    x: 10.4, y: 3.6, w: 8.5, h: 1.6, label: 'WHAT IT TAKES TO RUN', labelColor: MARIGOLD,
    lines: ['A browser tab, and a container that costs nothing extra', 'The build is one static bundle; Supabase’s free tier covers saves, transcripts and classes for a pilot-sized cohort.'],
  })
  const risks = [
    ['CONTENT ACCURACY', 'The six real cases keep a draft banner until their figures pass a source check. TinyFish is how that check gets done rather than skipped.'],
    ['NO MOBILE LAYOUT YET', 'It is built for a laptop screen. A phone layout is scoped, not written.'],
    ['NO TEST SUITE YET', 'The rules are pure and seeded, which makes them easy to test — the tests are simply not written.'],
  ]
  risks.forEach(([label, body], i) => {
    block(s, { x: 10.4, y: 5.9 + i * 1.8, w: 8.5, h: 1.35, label, labelColor: MUTED_D, lines: [body] })
  })
  s.addNotes('Honest risks: unsourced case figures, no mobile layout, no tests. Everything else is deployed.')
}

/* 9 — future scope */
pres.addSection({ title: 'Future scope' })
{
  const s = pres.addSlide({ masterName: 'LIGHT', sectionTitle: 'Future scope' })
  s.addText('Future scope', { placeholder: 'title' })
  head(s, '09', 'Where it goes next.', false)
  const cols = [
    ['NEXT TERM', MAGENTA, [
      'Reasoning graded by a model, against the drivers the file had',
      'A phone layout, and a first-run tutorial',
      'A test suite over the seeded rules',
      'Casebook figures sourced and the draft banner removed',
    ]],
    ['THE YEAR AFTER', MARIGOLD, [
      'An arc that runs across weeks, not days',
      'The three desks that are still nameplates: insurance, payments, the FinTech floor',
      'A case library that grows from monitored events',
      'Classroom pilots with a college, measured against a control group',
    ]],
    ['IF IT WORKS', MUTED_L, [
      'Novus as a practical paper in a commerce course',
      'Transcripts a recruiter recognises',
      'An open case format, so a teacher can write their own file',
    ]],
  ]
  cols.forEach(([label, colour, items], i) => {
    const x = M + i * 6.2
    s.addText(label, {
      x, y: 3.8, w: 5.5, h: 0.4, margin: 0, fontFace: MONO, fontSize: 16, bold: true, charSpacing: 2, color: colour,
    })
    s.addText(
      items.map((t, j) => ({ text: t, options: { bullet: { code: '25A0' }, breakLine: j < items.length - 1, paraSpaceAfter: 14 } })),
      { x, y: 4.4, w: 5.5, h: 4.6, margin: 0, valign: 'top', fontFace: SANS, fontSize: 19, color: PLUM, objectName: 'future ' + label },
    )
  })
  divider(s, 6.85, 3.7, 5.2)
  divider(s, 13.05, 3.7, 5.2)
  band(s, 'The engine is finished. What is left is content, reach, and proof from a real classroom — play a day of it at game.akshatchowdhary.online')
  s.addNotes('Near-term work is content and polish; the longer bets are the classroom pilot and the growing case library. Close by opening the game.')
}

;(async () => {
  await pres.writeFile({ fileName: OUT })
  await applyTheme(OUT, THEME)
  console.log('written:', OUT)
})()
