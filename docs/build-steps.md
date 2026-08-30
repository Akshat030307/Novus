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

### Step 16 — Polish ◻

Sound, small animations, transitions, and a day-end screen that feels good to
read.

---

## Not in this build

Multiplayer, extra careers, the FinTech company management sim, options and
futures, mobile layout, leaderboards, more than five buildings.

They all fit later. The layer split is what keeps that door open.
