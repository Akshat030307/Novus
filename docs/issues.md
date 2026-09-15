# Issues

What to build next, after the 16 build steps and the A/B/C redesign pass.
`docs/build-steps.md` is the history; this is the queue.

Same working rule as everywhere else in this project: **one issue at a time,
each ending with something that runs.** Tick it off here when it lands.

Three tracks:

- **A — Credibility.** Things that are currently fake, stubbed, or a visible
  lie. Cheap, and each one removes a "wait, that's not real" moment from a demo.
- **B — Utility.** What turns a finished game into a product an institution
  would pay for. The engine exists; this is the wrapper around it.
- **C — Reach and polish.** Who can use it, and whether they stay.

Effort is **S** (a sitting), **M** (a few days), **L** (a real project).

Any issue marked **`sim/types.ts`** must have that change proposed and agreed
before code is written, per `CLAUDE.md`.

---

## A — Credibility

### A1 — The day-end report has fake numbers ✅ S

`buildDayEndReport` in `sim/clock.ts` hardcodes `realisedPnL: 0`,
`reputationChange: 0` and `questsCompleted: []`. The day-end screen is the
emotional payoff of the whole loop and the most-seen screen in the game, and
three of its figures are invented.

**What:** take a snapshot at the day boundary (cash, holdings value, reputation,
completed quest ids) so the close can diff against the open. `startNextDay` is
the natural place to write it.

**Files:** `sim/clock.ts`, `state/newGame.ts`, `state/migrate.ts`,
`ui/screens/DayEndScreen.tsx`

**`sim/types.ts`:** yes — a `dayOpen` snapshot on `GameState`, plus a migration
step. Propose the shape first.

**Done when:** booked P&L, reputation change and finished-today are real, and a
v4 save migrates cleanly.

**Landed.** `DayOpen` snapshot on `GameState`, written by `newGame` and
`startNextDay`, diffed by `buildDayEndReport`. It was *four* fake figures, not
three — `cashOpen` was set to `player.cash`, the same value as `cashClose`, so
the cash-change row always read zero. The day headline is now `netChange`
(cash + open positions, close against open) instead of realised + unrealised,
which mixed a daily delta with a standing position. Migration v4 → v5.

---

### A2 — Energy is a gauge that never moves ✅ S

`ui/hud/Hud.tsx` renders `const energy = ENERGY_MAX` with a TODO. A
permanently-full bar is worse than no bar — it reads as broken.

**What:** either build the rule (rushing a case or trading impulsively drains
it, the Cafeteria restores it — which also gives the Cafeteria interior a
reason to exist, see C6) **or** delete the gauge. Do not leave it as is.

**Files:** `sim/types.ts`, `state/newGame.ts`, `state/migrate.ts`,
`ui/hud/Hud.tsx`, `sim/cases/index.ts`, `sim/portfolio.ts`

**`sim/types.ts`:** yes — `Player.energy: number`. The change was already
drafted at the end of step B; re-propose before writing.

**Done when:** the bar moves for a reason the player can name, or it's gone.

**Landed.** Built, not deleted. `sim/energy.ts` holds the rules: a case read in
under 20 game-minutes costs 8, an unhurried one 3; a trade costs 2, with 5 more
once it is the third inside an hour. The Cafeteria returns 25 once a day and a
night returns 40. Below 30 the skill hints stop appearing on a credit file and
the panel says why — the gauge changes what you can see, which is the only way
it earns HUD space. Gives the Cafeteria its reason to exist (C6).

---

### A3 — Red/green is the only signal for up and down ✅ S

40 usages of `text-jade` / `text-coral` across `ui/`, including the day-end P&L
headline and every price change. Red-green is the worst possible pairing —
roughly 8% of men cannot read it. For something sold as an education product
this is a real gap, and it is cheap to close.

**What:** never carry meaning in hue alone. Add a `+` / `−` glyph (or ▲ / ▼) to
every gain/loss figure, and a settings toggle for an alternate palette that
doesn't rely on the jade/coral pair.

**Files:** `ui/screens/DayEndScreen.tsx`, `ui/panels/MarketPanel.tsx`,
`ui/panels/PortfolioPanel.tsx`, `state/settings.ts`, `styles/index.css`

**Done when:** the day-end screen is readable in greyscale.

**Landed.** `signedRupees()` in `lib/format.ts`; the Portfolio "Open profit"
figure was the one carrying no sign at all — colour was its only signal. A
`colourSafe` setting mirrors onto `<html>` like `reducedMotion` and redefines
`--color-jade` / `--color-coral` as blue/amber, which survives protan, deutan
and tritan vision. Redefining the two tokens covers all 40 usages with no
component changes.

---

### A4 — The player teleports to the plaza on every load ✅ S

`world/scenes/CityScene.ts:78` still spawns at `SPAWN` with a TODO next to it.
`Player.position` already exists on the save and `newGame` writes it, so
nothing new is needed in the sim — it just isn't read or written back.

**What:** spawn from `player.position`, and push the tile back onto the store
periodically (or on pause / save) so it persists.

**Files:** `world/scenes/CityScene.ts`, `world/bridge.ts`

**`sim/types.ts`:** no — the field is already there.

**Done when:** reload drops you where you were standing.

**Landed.** `CityScene.startTile()` reads `player.position` and falls back to
`SPAWN` if it is missing or out of bounds. `bridge.setPosition()` writes the
tile back on change only — a shallow `tick`, never a deep clone, since this
runs while walking.

---

### A5 — The Casebook is unverified draft content ✅ M — banner stays

`data/casebook.ts` carries six real, named companies and is marked DRAFT in the
file header. It is the one place the project departs from "no real company
names, ever", and it currently ships figures nobody has checked against the
cited sources.

**What:** verify every date and number against the source already cited on each
card. Correct or cut anything that doesn't hold. Drop the DRAFT banner only
once a human has actually done this.

**Files:** `data/casebook.ts`, `ui/panels/CasebookPanel.tsx`

**Done when:** every figure traces to a source, and the banner is gone.

**Landed, with the banner deliberately left on.** A sourced pass corrected four
real errors: Satyam conflated the ₹7,136 crore revenue/profit inflation with the
fabricated cash balance (₹5,004 crore missing of ₹5,361 crore reported); IL&FS
said ratings fell "within days" when AAA held to end-August 2018 and default came
mid-September; PNB now names the revised ~₹14,350 crore figure; Kingfisher had
the licence suspension and the permit lapse both in October 2012, when the
suspension was 20 October 2012 and the lapse 1 January 2013. Everything else
held — the 1992 diversion, the index run, ACC, Kingfisher's 17 lenders and
₹7,000 crore, Lehman's ~$600bn, the Bear Stearns and Lehman dates.

**The UI banner stays until a person signs it off.** These are real, named
companies; a machine-checked pass is not the same as a human taking
responsibility for them.

---

## B — Utility

### B1 — The transcript is a clipboard string, not an artifact ✅ M

`ui/panels/TranscriptPanel.tsx` assembles a plain-text blob and offers a
**Copy** button. That is a demo. Nobody can assess a student from it, submit
it, or trust it.

This is the highest-leverage issue in the file: it is what converts "I played a
game" into "here is my coursework."

**What:** persist each completed run as a row, render it as an exportable
document (PDF or a shareable read-only page), and give it a verification code
an instructor can check.

**Files:** `ui/panels/TranscriptPanel.tsx`, `state/save.ts`, new Supabase table
(`transcripts`), new RLS policy

**Done when:** a finished run produces a link or file someone else can open and
confirm is genuine.

**Landed.** `sim/transcript.ts` builds the report card as a *document* rather
than a string — resolved labels and sentences, never content ids, so a
transcript issued today still reads correctly after the module list has been
rewritten and half the cases retired. One renderer
(`ui/components/TranscriptView.tsx`) draws it in both places, because if what
an instructor opens doesn't match what the player saw when they issued it, the
code is worth nothing.

`/t/<CODE>` is the public page — no sign-in, no game, no save. The code and the
timestamp are both minted by Postgres, and the `transcripts` table has no
UPDATE and no DELETE policy at all. That absence is the feature.

**What the code proves, stated in those words on both sides of it:** that the
document came out of Novus, under that account, at the time the database
recorded, and that nobody has edited it since. **Not** how the run was played —
nothing client-side can prove that, and claiming otherwise would be worse than
claiming nothing.

Verification goes through a `security definer` function rather than a public
read policy, so one code reads one transcript and gives no way to list or
enumerate the rest.

---

### B2 — One save slot, no attempt history ✅ M

`state/save.ts` pins `const SLOT = 1`. You cannot retake anything and show
improvement — which is the entire pedagogy of the scenario drills.

**What:** record each drill and module attempt as its own row with a score and
a timestamp. Keep the single *world* save; this is a separate attempts log.

**Files:** `state/save.ts`, `sim/modules.ts`, `ui/scenarios/*`, new Supabase
table (`attempts`)

**Done when:** a player can see "credit desk: 3/5, then 5/5 two days later".

**Depends on:** nothing. Feeds B1 and B3.

**Landed, and the slot stayed at 1.** The temptation was to turn saves into
slots; a career run and a record of practice are different things with
different lifetimes, so the log lives in `state/attempts.ts` against its own
append-only table and the world save is untouched.

Scores are whole over whole — 3 of 5, never 0.6 — so nothing rounds on the way
in and the fraction shown is the fraction stored. Spot-the-shock had to change
to fit that: its old +1 / −1 / −0.5 points total was unstorable and arbitrary.
It is now marked out of the stocks the headline actually moves, with picks on
untouched stocks counted separately as stray picks — reading a headline too
widely is a different error from reading it backwards, and one number hid which
you made.

The panels show the sequence, not an average: a mean of 3/5 and 5/5 tells a
teacher nothing about whether the second one was understood.

Local-first like everything else. Signed out, the log still builds up and the
panels still show it. A `pushed` id set means signing in on a shared browser
can't claim somebody else's runs.

One thing this exposed: a failed attempt upload was about to light up the HUD
as if the **world save** had failed. `cloudNote` now separates the two —
nothing is swallowed, but only `save.ts` may touch the save indicator.

---

### B3 — There is no instructor side at all ⬜ L

No cohorts, no assignments, no dashboard. This is the actual B2B product, and
it is the thing that makes a college or a training team pay.

The architecture is already right for it: the drills in `ui/scenarios/` are
deliberately self-contained — no city, no clock, no save — so they are
**already shaped like assignable assessments.** That was the hard part.

**What:** join-by-code cohorts; an instructor assigns a drill or module with a
deadline; a dashboard showing completion and scores. The interesting part is
aggregation — you already log `MistakeRecord` per player with typed kinds
(`unsound_call`, `concentration`, `noise_trade`), so a class-wide view tells a
teacher *what to teach next week*. No competitor does that.

**Files:** new `ui/instructor/`, new Supabase tables (`cohorts`,
`cohort_members`, `assignments`), RLS throughout

**Done when:** a teacher can create a cohort, assign the credit desk, and see
who passed and where the class went wrong.

**Depends on:** B1, B2.

---

### B4 — Every case is a loan; that's the content ceiling ⬜ M

The deferred C-c step. `FinancialCase` only models credit files, so the five in
`data/cases/` are the entire library — roughly thirty minutes of unique
content. You cannot author an allocation case or a fraud-pattern case today.

`docs/education.md` §5 already specs the discriminated union
(`kind: 'loan' | 'allocation' | 'pattern'`). Land it, then the ceiling is
writing rather than engineering.

**What:** generalise the type, keep the five loan files working, then author the
first non-loan case as proof.

**Files:** `sim/types.ts`, `sim/cases/index.ts`, `data/cases/`,
`ui/case/CasePanel.tsx`

**`sim/types.ts`:** yes, and it's the big one. Propose the union first and let
the compiler list every screen that breaks.

**Done when:** a non-loan case plays end to end alongside the loan files.

---

### B5 — The Casebook doesn't connect to gameplay ⬜ M

Six real events sit in the Academy as reading. Nothing asks the player to
*use* them. This is the most obvious untapped idea in the project.

**What:** once B4 lands, author fraud-pattern cases that rhyme with Casebook
entries — read Satyam, then spot the same pattern in a fictional file. The
`pairsWith` field on `CasebookEntry` already anticipates this.

**Files:** `data/cases/`, `data/casebook.ts`, `sim/concepts.ts`

**Depends on:** B4, and A5 for the content to be trustworthy.

---

### B6 — The market is a black box ✅ S

`sim/market/index.ts` already computes `driftTerm`, `noiseTerm` and
`shockTerm` as three separate functions. Nothing surfaces them.

Exposing a "why did this move?" breakdown teaches the single most valuable
lesson in retail investing — *most of what you just saw was noise* — and the
maths is already sitting there in three named pieces.

Best idea-to-effort ratio in this file. Nobody else has it.

**What:** have the tick optionally return its three terms; render a small
decomposition under the chart.

**Files:** `sim/market/index.ts`, `ui/panels/MarketPanel.tsx`

**`sim/types.ts`:** probably not — the breakdown is display-only and must never
be saved.

**Landed.** `moveTerms()` is now the single place the three forces are combined,
so `tickMarket` and the new `explainDay()` cannot drift apart. `explainDay`
replays the day from the seed — nothing stored — and splits every minute's
realised move between drift, noise and shock in proportion to their share of
that minute's total, so the parts always add back to the whole. It reports
`exact: false` if the replay doesn't land on the live price, and the panel then
renders nothing rather than a number it can't stand behind.

`ui/panels/MoveBreakdown.tsx` sits under the chart, collapsed by default.

Two bugs found by verifying rather than trusting the typecheck:

- the replay ran one tick too many. The driver advances to `MARKET_CLOSE` and
  the phase flips to `closed` *before* that minute is ticked, so the last real
  tick is `MARKET_CLOSE - 1`.
- `data/stocks.ts` seeded `price != previousClose`, an overnight gap the game
  never traded and no later day ever reproduces (`rollMarketDay` sets them
  equal). It was the one price move in the whole game nothing could account
  for. `newGame` now opens flat.

Verified over 3 seeds x 4 days x 12 stocks, event days included: every price
replays exactly and every paise is attributed.

**It teaches.** On a day with a steel tariff, construction took a −₹7.53 shock
and still closed **up** ₹4.06, because noise added ₹9.20. On a rate-hike day the
biggest mover fell ₹65, of which ₹45 was noise and ₹15 news.

---

### B7 — Historical replay drills ⬜ L

Principle 5 keeps the playable simulation fictional, and that stays. But
replaying a *real, labelled, past* period as a drill is history, not advice —
the same logic that already permits the Casebook.

Buys real credibility with institutions, who will ask "is this realistic?"

**Files:** new `data/replays/`, `ui/scenarios/`

**Depends on:** B4.

---

### B8 — Certification ⬜ M

Once modules, drills and a verifiable transcript exist, a completion
certificate with a check code is the obvious commercial surface, and it is what
training buyers actually ask for.

**Depends on:** B1, B2.

---

## C — Reach and polish

### C1 — No onboarding ⬜ S

A first-time player lands in a city and is not told that WASD does anything.
"First Day at Meridian" is *narrative* onboarding; there is no *control*
onboarding.

**What:** a dismissible control hint on first spawn (WASD to walk, E to talk,
arrows and Esc for menus), and a guided first case.

**Files:** `ui/overlays/`, `world/scenes/CityScene.ts`, `state/settings.ts`

---

### C2 — No mobile layout ⬜ L

`GameScreen` is a fixed three-column grid with a Phaser canvas in the middle.
For a student-facing product in India this is close to disqualifying — it is
the gap between "a thing I show judges" and "a thing people use."

**Files:** `ui/screens/GameScreen.tsx`, `world/WorldCanvas.tsx`, most of `ui/`

---

### C3 — The dashboard trap ⬜ design call

Market and Portfolio are reachable from the bottom tabs *and* by walking to the
Exchange. Flagged in step 9's own notes and never resolved. If the panels are
always one click away, the city is decoration and the walking-there design does
nothing.

**Decide:** commit to walking (drop the tabs, make the city load-bearing), or
admit the tabs won (and stop pretending location matters). Either is fine;
the current both-at-once is the only bad answer.

---

### C4 — No test suite ⬜ M

The project's strongest technical claim is a deterministic simulation. Nothing
pins it. `sim/` imports no React, Phaser or `fetch`, so it runs headless
already — the tests are cheap to write and prove the claim.

**What:** pin `tickMarket` against a known seed, the `judgeChoice` /
`rewardFor` table, `awardProgress` level-ups, and the v1→v4 migration chain.

**Files:** new `src/sim/**/*.test.ts`, `package.json`, `vite.config.ts`

---

### C5 — No long arc ⬜ M

A trading day is about six real minutes, which is right. But nothing spans
days — no weekly review, no destination, no reason to come back on day nine.
XP and levels exist; a *goal* doesn't.

---

### C6 — Three buildings are nameplates ⬜ M

Risk & Compliance, Payment Centre and the Cafeteria have working doors and
placeholder notes. The Cafeteria in particular is blocked behind A2 — energy
restoration is the reason it exists.

**Files:** `ui/overlays/BuildingOverlay.tsx`, new panels

---

### C7 — AI wording ships dormant ⬜ S

`ai/flavour.ts` is complete and switched off; there is no endpoint to verify
against. Either stand up a proxy (a Supabase Edge Function, so the key stays
server-side) and confirm the path works, or document it as deliberately
inactive so it stops looking unfinished.

**Note:** a `VITE_AI_KEY` in `.env` ships in the client bundle. A deploy must
proxy. Do not shortcut this.

---

## Suggested order

~~1. **A1, A2, A3**~~ — done, along with A4 and A5. Track A is clear.

~~2. **B6**~~ — done.

~~3. **B1, B2**~~ — done. The transcript is an artifact and every attempt is
   kept. Needs `docs/supabase.sql` run once on the Supabase project before the
   cloud half works; the local half works without it.

4. **B4**, then **B5** — lifts the content ceiling and connects the Casebook.
   Next up. B4 needs a `sim/types.ts` proposal first.
5. **B3** — the product bet, once 2–4 make it worth buying. B1 and B2 have
   now built its two tables and its aggregation shape.

`C1` and `C7` are small enough to slot in anywhere.

## Not doing

**Multiplayer.** The layer split leaves the door open and that is enough.
Walking through it now costs months and solves a problem no buyer has raised.
