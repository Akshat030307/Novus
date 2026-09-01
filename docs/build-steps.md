# Build steps

UI first, then the world, then the brain behind it. Each step ends with
something that runs. Do one step, stop, look at it.

Tick these off as you go.

---

### Step 1 — Skeleton and look ✅ done

Vite, React, TypeScript, Tailwind, Phaser installed. Tokens in
`styles/index.css`. Base pieces: `Panel`, `PixelButton`, `StatBar`, `DayArc`.
`sim/types.ts` written before any screen.

### Step 2 — Home screen ✅ done

Title, New game with name entry, Continue (disabled until there is a save),
and a shortcut into the UI demo. The skyline is drawn in flat blocks so it
matches the pixel city rather than a stock hero image.

**Left to do here:** the name typed on this screen is thrown away. Wire it into
`useGameStore` when step 7 gives us a real new-game function.

### Step 3 — Game screen shell ✅ done

HUD across the top, tasks on the left, world box in the centre, mini-map and
quick actions on the right, tabbed panels along the bottom.

### Step 4 — Every screen, on fake data ✅ done

Every screen renders on mock data: quests, market table with a price chart,
portfolio, notifications, dialogue frame, the case screen (empty state plus a
laid-out fake loan file), day-end summary, level-up popup, and settings.

You can click through the whole game and judge how it feels, with nothing
actually working.

### Step 5 — City in the centre ✅ done

Phaser mounts in `world/WorldCanvas.tsx` (game in a ref, destroyed on unmount
so strict mode does not stack two). `world/scenes/` boots the Kenney RPG Urban
tilesheet (16px, rendered at 2x, `pixelArt`); `world/map/city.ts` is the
hand-authored 40x30 map; `world/entities/player.ts` is the character. Arrow
keys and WASD walk, buildings/water/trees and the map edges stop you, the
camera follows with a small dead zone, and the player freezes while a panel is
open (`bridge.isPaused()`).

The map is arrays for now — moving it to Tiled later touches only `world/map/`
and the loader. Doors and NPCs are step 6.

### Step 6 — Doors ✅ done

Five named buildings in `world/map/city.ts` — Bank, Exchange, FinTech, Academy,
Apartment — each with a doorway cut into its south wall. An overlap zone on the
doorway calls `bridge.enterBuilding()`; `ui/overlays/BuildingOverlay.tsx` shows
the matching panel (Bank → Case, Exchange → Market + Portfolio, the rest are
placeholders until their step). Leaving drops you back on the doorstep.

Four NPCs stand in fixed spots (`NPCS` in `city.ts`). Walk up, a hint shows,
press E or Space, and `bridge.talkTo()` opens the dialogue box. The box still
shows one fixed line — the trees and personalities are step 12.

### Step 7 — Clock ✅ done

`sim/clock.ts` is pure — `advanceClock`, `startNextDay`, `buildDayEndReport`.
The timer lives in `state/useGameClock.ts` (mounted by GameScreen): one real
second per game minute, skipped while `useUiStore.isPaused()`. At 3:30pm it
opens the day-end summary and auto-saves; "Start day N+1" rolls over and saves.
Also saves on `beforeunload`.

`state/save.ts` (already localStorage-backed) now routes loads through
`state/migrate.ts`. `state/newGame.ts` builds a fresh save from the mock
template with the typed name, a new seed, and day one — so New game and
Continue on the home screen both work now.

Not yet: `market.tick()` (step 8 slots into the driver), real day-over-day P&L
(needs the market), restoring the player's tile position on load.

### Step 8 — Market ✅ done

`sim/market/index.ts` — `tickMarket(market, seed, clock)` moves every price each
game minute by drift + noise + shock (shock is wired but dormant until events
exist, step 13). The rng is re-seeded per tick from `seed|day|minute`, so a
loaded save resumes bit-identically. `rollMarketDay` resets `previousClose` at
the day boundary. History is capped at 200 points per stock.

`state/mock.ts` is deleted. `state/newGame.ts` builds a real starting world from
`data/stocks.ts` — named player, ₹5,00,000, twelve stocks at opening prices,
empty portfolio/quests/notifications. The store initialises from `newGame` and
takes tick updates through a new shallow `tick()` action (no per-second clone).

Tuning still open: `DRIFT_PER_MIN`, `NOISE_SCALE`, `MAX_STEP` in
`sim/market/index.ts` plus each stock's `volatility`. A quick sim shows daily
moves of roughly -3% to +1% and intraday ranges of 1–7% by stock — sane, but
worth a real watch-it-for-ten-minutes pass.

### Step 9 — Portfolio ✅ done

`sim/portfolio.ts` — `applyTrade(state, order)` returns `{ ok, state }` or
`{ ok: false, reason }`. Buy recalculates `averageCost`, sell books
`(price − averageCost) × qty` into `realisedPnL`, cash moves both ways, the
holding is dropped at zero. Pure and deterministic — a mid-session save reloads
exact. No brokerage.

Rejections with a specific message: unaffordable ("This costs ₹X — you have
₹Y"), selling more than held, market closed, non-whole quantity.

The trade strip lives under the chart in `MarketPanel.tsx` (qty + Buy/Sell +
cost preview + inline error), calling `applyTrade` then the store's `load`.
`PortfolioPanel` was already live off the store. Day-end `tradeCount` is now
real; booked-P&L-today still needs a day-open snapshot.

Not done here: XP/skills from trades (step 11), the dashboard-trap (Market/
Portfolio still reachable from the bottom tabs without walking to the Exchange).

### Step 10 — Cases ✅ done

`sim/cases/index.ts` — `judgeChoice(defaultRisk, choice)` scores the reasoning
against the hidden truth (never the dice): full unsecured approve is unsound at
≥30% risk, a flat reject is unsound below it, reduce/collateral are always
defensible. `resolveCase(state, case, choice)` adjusts risk for the choice,
samples with `makeRng(`${seed}|case|${id}|${day}`)` (deterministic), and applies
cash/XP/reputation. The reward table is luck-independent: a sound call that
still defaults costs nothing; an unsound call that pays off earns almost
nothing. `explainCase` rebuilds ratios (debt-service cover, margin, leverage,
collateral cover, score) from the figures, plus the drivers and a verdict line.

Five credit files in `data/cases/` — Sharma Textiles, Anand Dairy (clean, so
rejecting is the mistake), Girish Steel (over-levered), Prakash Cold Storage
(thin collateral), Vector Trading (revenue that throws off no cash). All fit
`LoanFigures`; the non-loan architecture lessons (diversification, crash, fraud
list) would need `FinancialCase` generalised — not done here.

`CasePanel.tsx` rewritten: a file list (unresolved + resolved), a decide view
with Submit, then an outcome + explanation view. XP/reputation are raw deltas
on `player.xp` / `player.reputation` — levels, skills and the XP curve are
step 11.

### Step 11 — Progression ✅ done

`sim/progression.ts` — `awardProgress(player, { xp, reputation, skills })` adds
it all and rolls up level-ups (carry the remainder). `xpForLevel` is a gentle
ramp (50, 80, 110…). Skills are a fractional practice count; the level is
`Math.floor`. Deterministic, no rng.

`resolveCase` and `applyTrade` now route their xp/reputation/skill gains through
`awardProgress` and return `levelUps`. A case feeds analysis/accounting/risk
(more risk on a sound call); a trade feeds trading/data + a little xp.

Three real skill unlocks in the case decide view: Accounting 2 → debt-service
cover shown up front, Risk 2 → a blunt risk read, Analysis 3 → a leverage read.
`SkillsPanel` (the Academy body) shows level, the ten skills, and which
thresholds are open.

Level-up plumbing: `useUiStore.levelUpQueue` + `pushLevelUps` / `dismissLevelUp`,
folded into `isPaused()`. `'level-up'` left the `Overlay` union; the popup now
renders from the queue head on top of any building overlay. Day-end `xpGained`
reports the day's case XP.

### Step 12 — NPCs and quests ✅ done

`sim/quests.ts` — `checkQuests(state)` re-evaluates every active quest's step
conditions (`talked` / `entered` / `caseResolved` / `casesResolvedAtLeast` /
`tradesAtLeast` / `flag`), ticks `done`, and on full completion pays the reward
through `awardProgress` and retires the quest. Auto-starts `autoStart` quests.
Pure, deterministic, idempotent (no double-reward). `applyDialogueEffect` +
`evalCond` back the dialogue options.

Five quests in `data/quests/` — First Day (auto), The Bad Loan (resolve Sharma
then report to Rao via a flag set from dialogue), Opening Bell, Second Opinion,
Off the Record. `checkQuests` is called after `resolveCase`, `applyTrade`, and
in `world/bridge.ts` on talk / enter-building (which set the flags). `newGame`
runs it once so First Day is on the desk from the start.

`data/npcs.ts` — Rao (your boss, hands out files), Vikram (loud, wrong as often
as right short-term), Sunil (cautious to a fault), Meera (early and overblown).
`DialogueBox` is a real node tree: text + options filtered by `showIf`, apply
`effect` then `checkQuests` on click. CityScene now passes the NPC id.

`sim/types.ts` unchanged — quest defs, dialogue trees, conditions and effects
are content types in `sim/quests.ts` and `data/npcs.ts`.

### Step 13 — Events ✅ done

`sim/events.ts` — `rollDayEvent(seed, day)` is a pure function of the seed and
day: ~65% of days draw one event from `data/events.ts` (8 of them) and a
mid-morning fire minute. Day 1 is always quiet. `maybeFireEvent` (called by the
clock driver before `tickMarket`) drops the `MarketEvent` into
`market.activeEvents` and pushes its headline to the feed as a `market`
notification once the clock reaches the fire minute.

The step-8 `shockTerm` was already wired — it now has events to read. A quick
sim: infrastructure news lands construction ~+6%, steel ~+4.5%, IT ~-1.2%
(under a day's noise), untouched sectors flat, all decaying out over ~3-4 game
hours. `rollMarketDay` clears `activeEvents` at the day boundary.
`buildDayEndReport.tomorrowHeadline` recomputes tomorrow's headline as a teaser
— nothing stored. `sectorShocks` is read only by `sim/market`; no panel touches
it.

`sim/types.ts` unchanged — `MarketEvent` / `activeEvents` / `GameNotification`
already fit; `EventDef` is `Omit<MarketEvent, 'firedAt'>`. Shock sizes, decay
windows and the 65% frequency are the playtest dials.

### Step 14 — Supabase ✅ done

`@supabase/supabase-js` installed. `lib/supabase.ts` — `createClient` guarded by
`cloudEnabled = Boolean(url && key)` (null client, pure localStorage, when
`.env` is absent); magic-link auth (`signInWithOtp`), `onAuthChange`,
`currentUser`, `signOut`. `state/auth.ts` holds `{ user, ready }`.
`vite-env.d.ts` types the env vars.

`state/save.ts` keeps the same three signatures. `saveGame` writes localStorage
first (with a `:at` timestamp), then upserts the `saves` row when signed in,
swallowing failures. `loadGame` prefers the cloud row when its `updated_at`
beats the local timestamp. `hasCloudSave` + `syncOnLogin` (push a local save up
on first sign-in) are new. `App.tsx` resolves the session on load and runs
`syncOnLogin` on `SIGNED_IN`; the home screen gains a sign-in block below the
nav and Continue lights up for a cloud-only save.

Verified against the live project: the `saves` table + RLS work — anon reads
return `[]`, anon writes are refused (`42501`), the env is injected into the
client. The magic-link → email → session → cloud round-trip needs a browser and
an inbox. `sim/types.ts` unchanged.

Note: `beforeunload` only completes the local write (async cloud work is cut
off on unload); the cloud catches up at the next day-end save or sign-in.

### Step 15 — AI wording ✅ done

`ai/flavour.ts` — `getCaseIntro` / `getCaseExplanation` run cache → model →
fallback and never throw. `aiConfigured` is true only when `VITE_AI_ENABLED=true`
plus `VITE_AI_BASE_URL` + `VITE_AI_KEY` are set; otherwise (and by default) the
written text carries the game. `ai/fallback.ts` holds that written text — the
case brief verbatim, and a plain-language explanation built from the figures,
drivers and the reward-the-reasoning line. `ai/cache.ts` stores model output by
content hash in localStorage, never in the save.

`ui/hooks/useFlavour.ts` shows the fallback synchronously and swaps in the model
text if it resolves — no blocking, no tick-path calls. Wired into `CasePanel`
only (the brief and the outcome explanation); dialogue trees and event headlines
stay as authored content. The Settings "AI wording" toggle is real, disabled
with a hint when no endpoint is configured.

`callModel` hits an OpenAI-compatible `/chat/completions` endpoint. Shipped
dormant — no key/endpoint here to verify against; the fallback path is tested
and reads well. `sim/types.ts` unchanged; flavour text is display-only, never a
number, never saved.

Note: a `VITE_AI_KEY` in `.env` ships in the client bundle — fine for local
play, but a deploy must proxy (e.g. a Supabase Edge Function). Not built here.

### Step 16 — Polish ✅ done

`lib/sound.ts` synthesises the interface cues with Web Audio — no asset files,
gated on the `sound` setting, a silent no-op if the AudioContext is missing or
unhappy. Eleven cues: tab, building, dialogue, trade ok/fail, case good/bad
(keyed on the *judgement*, not the dice), level-up, day-end, and a feed ping
from `ui/hooks/useSoundCues.ts` for lines that arrive while you are looking
elsewhere. Nothing on the market tick path makes noise.

`styles/index.css` holds the whole motion vocabulary — `fade`, `pop`, `rise`,
`feed`, `level-pop`, one easing, ~130ms, nothing that loops. Both reduced-motion
paths (OS and the settings toggle) now also zero `animation-delay`, so the
day-end stagger collapses too. Applied to the four overlays (backdrop fade +
panel pop), the bottom-tab body, the screen swap, the dialogue box, the feed,
the level number, plus colour transitions on `StatBar` fills and a slide on the
`DayArc` sun.

`DayEndScreen` rebuilt: the P&L on the day is the headline number with a
one-line read, then Money / Trading / Standing as grouped sections that fade in
in sequence. Same `DayEndReport` prop, same `onClose` — no sim change.

`sim/types.ts` unchanged; sound and motion are display-only.

---

## Redesign pass (after the MVP)

The 16 steps above make the game. This pass makes it look and teach like the
thing it wants to be. Three tracks, each its own step, stop after each.

### Step A — The city ✅ done

`world/map/city.ts` rebuilt on a 58×44 grid: three avenues and three roads on a
proper block grid, tarmac with lane markings, footpaths and zebra crossings,
a footpath apron around every building. The centre junction opens into a tan
plaza with a stone-rimmed fountain — the new spawn point.

Thirteen buildings off Kenney's low-rise set (red brick, orange brick, glass
shopfront with a green awning), each a roof/wall/base slice with a window grid
and a door tile in the south wall. Eight are enterable: the five wired venues
plus **Risk & Compliance**, **Payment Centre** and **Cafeteria** — placed with
working doors, interiors are later steps (each shows a nameplate note for now
via `BuildingOverlay`). The rest — Insurance, Businesses, Investment Firm,
Government Office, the Registry — are scenery with labels, no door.

New `DECOR` layer for props (lamp posts, traffic signals, parked cars, benches,
market stalls, hydrants, bins, a postbox) — all solid. `CityScene` gains the
third layer and clears collision on the door tile so you can walk in.

`sim/types.ts` unchanged: the three new venues carry world-local ids
(`CityBuildingId`) until their interiors get built. No new assets — same CC0
Kenney pack. The pack is low-rise, so the look is a brick market-city, not the
glass towers in the reference.

### Step B — Panels with life ✅ done

`Panel` primitive reworked: a raised header strip (`bg-panel-2`), an accent rule
under the title in the panel's colour, an icon slot, and a lighter top edge
(`--color-hi`) so it sits up off the black. Two new tokens — `--color-panel-3`
(inset wells) and `--color-hi`. Hard corners kept.

Per-panel identity: Tasks (marigold, ✎) gets real checkboxes and a progress
bar per quest; the Feed (✦) gets kind tags (MKT / TASK / ₹ / CITY); Portfolio
(jade, ◐) gets an `AllocationBar` — a twenty-cell blocky bar of cash + each
holding, in the StatBar language, no smooth pie; the bottom panel takes the
active tab's colour and glyph. Mini-map redrawn to the eight real doors.

One nav: the right-hand panel is now just **End day** plus a line saying the
day ends itself at 3:30. The duplicate Portfolio/Market buttons and the two
demo buttons are gone. No bottom nav was ever added; the bottom tabs stay.

HUD: a third gauge, **Energy** ("focus"), sits between XP and Reputation. It
renders a placeholder full bar — `player.energy` and the drain/restore rules
are the next step. **Proposed `sim/types.ts` change** (not yet written): add
`energy: number` to `Player`; `newGame` inits it to 100; either a v2 migration
or `?? 100` at the read sites covers old saves. Nothing else in B touched
`sim/`.

### Step C — Educational layer

Spec: **`docs/education.md`**. Built on its own branch, `education-layer`, off
the commit at the end of step B — `main` does not move until this merges.

Eleven pieces planned (Ledger, predict-then-reveal, tap-to-explain, modules,
day-end debrief, mistake log, scenario mode, assist setting, further reading,
transcript, a Casebook of real concluded events).

#### C-a — Ledger + tap-to-explain + further reading ✅ done

`sim/types.ts` — `GameState.learned: string[]`, proposed then approved.
`state/migrate.ts` bumped to version 2 with a step defaulting `learned: []`
for old saves; `newGame` writes `learned: []` on a fresh one.

`data/concepts.ts` — twelve cards (debt-service cover, cash vs revenue,
leverage, collateral cover, credit score, margin, default risk, P/E, D/E,
realised vs unrealised P&L, diversification, drift/noise/shock), each a plain
definition, what good and bad look like, and — where one exists — a Wikipedia
further-reading link (C9, riding along).

`sim/concepts.ts` — `checkConcepts(state)` recomputes the full unlocked set
from the save alone (which cases are resolved, whether a trade has been made,
whether any holding is ≥50% of the book, whether a market notification has
fired) and diffs against `learned`. Pure, idempotent, called after
`resolveCase` and `applyTrade` alongside `checkQuests`.

`ui/panels/LedgerPanel.tsx` — the shelf; locked cards show a placeholder,
unlocked ones show the full card. Lives in the Academy, behind a new
Skills/Ledger tab (`ui/panels/AcademyPanel.tsx` replaces the bare
`SkillsPanel` in `BuildingOverlay`) — walk there, no HUD shortcut.

`ui/components/Explain.tsx` — hover-to-reveal wrapper reading the same
glossary, wired onto the case outcome's ratio labels, the market table's P/E
and D/E headers, and the portfolio's "Open profit" / "Where the money is".

Verified with a scripted run (not just typecheck/build): resolving Sharma
unlocks four cards, Girish unlocks leverage, a first trade unlocks P/E, D/E,
unrealised P&L and diversification (one holding is 100% of the book — the
lesson lands on the very first trade), re-running with no new state changes
nothing. A v1 save migrates to v2 with `learned: []`.

#### C-b — assist setting ✅ done

`settings.assist` (on by default). Shows the case decide-view hints
(debt-service cover, risk read, leverage) up front rather than only behind
skill unlocks; the tag reads "Assist" until the skill level is actually
reached. The three hint blocks folded into one `Aid` helper. No sim change.

#### C-d — predict, then reveal ✅ done

`sim/types.ts` — `CasePrediction` and two optional fields on `ResolvedCase`
(`prediction`, `predictionRight`); optional throughout, no migration. The
decide view gains an optional "Your read" block (low / mid / high band + a
one-line why) that never gates Submit. `gradePrediction` scores the band
against `truth.defaultRisk`; the outcome screen shows a "Read right / off"
badge and echoes it back — graded on the band, never the roll.

Deviation from `education.md` open question 3: the "why" is a shown-back note,
not a graded driver pick — the case `drivers` are prose, not slugs.

#### C-e — day-end debrief + mistake log ✅ done

`sim/analysis.ts` — `analyseDay` picks one teaching sentence about the day
(unsound call → concentrated book → churn, first hit); `spotMistakes` /
`logMistakes` record those at the day boundary in `startNextDay`, idempotent.
`DayEndReport.lesson`, `GameState.mistakes`; migrate → v3. Day-end screen
shows the line under the P&L; a new **Mistakes** Academy tab lists the log
with a pattern line once a kind repeats three times.

#### C-f — Academy modules ✅ done

`data/modules.ts` — five modules (reading a loan file, balance-sheet stress,
cash vs profit, don't bet the book, reading the tape), each a blurb, the
Ledger concepts it covers, an in-game task, and a 4–5 question check.
`sim/modules.ts` scores it — 60% to pass, best score kept, passing sticks,
**failing blocks nothing**. `GameState.modules`; migrate → v4. **Modules**
Academy tab with an inline quiz that marks right/wrong on submit.

#### C-g — transcript ✅ done

`ui/panels/TranscriptPanel.tsx` (**Report** Academy tab): concepts learned,
credit-decision record with risk-read accuracy, best/worst call, modules
passed with scores, mistakes logged — plus a plain-text **Copy**.

#### C-a2 — the Casebook ✅ done (draft content)

`data/casebook.ts` — six real concluded events (Satyam 2009, IL&FS 2018,
PNB letters of undertaking 2018, the 1992 securities scam, Kingfisher 2012,
the 2008 crisis). Each: timeline, the numbers, what was visible beforehand,
the Ledger concepts it reinforces, the fictional case it rhymes with,
self-check Q&A, sources. **Marked DRAFT** — figures and dates need a pass
against the cited sources before this ships publicly. The one place real
companies appear (`education.md` principle 5); every card carries its sources
and a "not investment advice" footer. **Casebook** Academy tab; read-state
via a `flags` key, no type change. `tools/casebook-ingest/` is a documented
skeleton (source allowlist, draft-out-never-commit) — not wired in, not run.

#### C-h — scenario drills ✅ done

`data/scenarios.ts` + `ui/scenarios/` — three self-contained drills off a
**Drills** Academy tab, no city / clock / save (v1 answer to open question 6):
the credit desk (five files back to back), build a book (allocation exercise
on a frozen snapshot), spot the shock (pick who a headline lifts). No sim
change.

#### C-c — `FinancialCase` generalisation — deferred

Not done. It is only a prerequisite for *authoring* non-loan case content
(allocation, fraud-pattern), which this pass did not write — the modules and
drills run against the five existing loan files. Land it when that content is
next.

---

## Not in this build

Multiplayer, extra careers, the FinTech company management sim, options and
futures, mobile layout, leaderboards.

They all fit later. The layer split is what keeps that door open.
