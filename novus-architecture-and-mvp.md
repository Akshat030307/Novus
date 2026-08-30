# Novus — Architecture and MVP Plan

A pixel-art RPG where the player walks around a city, takes finance jobs, and learns by living with the results.

Decisions already locked in:

- Single player. Files you run on your own machine.
- Rules and money maths in plain code. AI only rewrites wording.
- Free sprite packs for art.
- Slow real-time clock. The day ends when the market closes.
- Indian flavour (₹, UPI, a market regulator) with fictional company names.
- Supabase login and cloud save.
- Cases at student level: real ratios, a bit of maths.

---

## 1. The three layers

Everything in the game belongs to one of three layers. Keeping them apart is the single most important rule in this project.

**The brain (`sim/`)**
Plain TypeScript. No React, no Phaser, no network calls, no `Math.random()`. It holds the clock, the market, the cases, XP, money, reputation. Given the same starting state and the same actions, it always produces the same result. This is what makes the game fair, testable, and easy to fix.

**The world (`world/`)**
Phaser. A tile map of the city, a character who walks, doors you can enter, NPCs standing around. It only draws things and reports events like "player walked into the Bank door". It never decides anything about money.

**The panels (`ui/`)**
React and Tailwind. The HUD, portfolio screen, case screen, dialogue box, quest list. It reads from the store and sends actions back. It never does money maths itself — if a screen needs a profit number, the brain calculates it.

The store in the middle is what they all talk to. Nothing else crosses between layers.

Why bother: when the market feels wrong later, there is exactly one folder to look in, and you can test it without opening a browser.

---

## 2. Folder layout

```
src/
  main.tsx              app entry
  app/                  screen routing, top-level layout
  ui/
    hud/                top bar: cash, XP, reputation, clock
    panels/             quests, portfolio, notifications, market
    case/               the loan/investment case screen
    dialogue/           NPC talk box
    components/         buttons, panels, pixel-styled bits
  world/
    scenes/             BootScene, CityScene, UIBridgeScene
    map/                tilemap files, collision setup
    entities/           player, npc sprite logic
    bridge.ts           the only file where Phaser talks to the store
  sim/
    clock.ts            time, day start/end
    rng.ts              seeded random numbers
    market/             stocks, price movement, events
    cases/              case definitions, scoring, outcomes
    portfolio.ts        buy, sell, holdings, profit/loss
    progression.ts      XP, levels, skills, reputation
    quests.ts           quest state machine
    economy.ts          interest rates, inflation, world mood
    types.ts            shared shapes
  data/
    stocks.ts           the ~12 fictional listed companies
    cases/              case content, one file per case
    quests/             quest content
    npcs.ts             NPC personalities and lines
    events.ts           market and city events
  state/
    store.ts            the single game store
    save.ts             turn state into a save blob and back
    migrate.ts          upgrade old saves when the shape changes
  ai/
    flavour.ts          the only file that calls an AI model
    cache.ts            remember what it already wrote
    fallback.ts         plain written text used when AI is off or fails
  lib/
    supabase.ts         client and auth
public/
  assets/               sprites, tiles, fonts (with a LICENCES.md)
```

Use a small state library called Zustand for `store.ts`. It is a few lines of setup and both React and Phaser can read from it, which is exactly what we need.

---

## 3. Game state and saving

One object holds everything the game needs to continue:

```ts
type GameState = {
  version: number          // for migrating old saves
  seed: string             // makes randomness repeatable
  clock: { day: number; minute: number; phase: 'pre-open' | 'open' | 'closed' }
  player: {
    name: string
    role: 'intern'
    level: number
    xp: number
    cash: number
    reputation: number
    skills: Record<SkillName, number>
    position: { x: number; y: number; scene: string }
  }
  market: { stocks: StockState[]; activeEvents: MarketEvent[]; history: PricePoint[] }
  portfolio: { holdings: Holding[]; realisedPnL: number; trades: Trade[] }
  quests: { active: QuestState[]; completed: string[] }
  cases: { openCaseId: string | null; resolved: ResolvedCase[] }
  flags: Record<string, boolean>   // "met the bank manager", etc.
}
```

Two rules that save you pain later:

**Store the seed, not the random numbers.** Every random choice goes through `rng.ts`, which is seeded from `seed` plus the day number. Load a save and the world carries on exactly as it would have.

**Keep price history short.** Save the last 200 price points per stock, not every tick. Otherwise the save file grows all day.

**Saving:** auto-save at the end of each in-game day, and on window close. Write to browser storage first, then push to Supabase. If the network is down the game keeps working and syncs later. One table is enough:

```
saves ( user_id uuid, slot int, state jsonb, updated_at timestamptz )
```

Turn on row level security so a player can only read and write their own row. Build against browser storage until you have your Supabase keys — `save.ts` hides which one is being used, so switching is a one-file change.

---

## 4. The clock

One real second = one in-game minute. Trading runs 9:15am to 3:30pm, so a full day is about six real minutes. That is short enough to play several days in a sitting and long enough that a crash mid-morning feels like something is happening.

The clock ticks in a single loop. Every tick it moves the minute forward, asks the market to update prices, and checks whether any timed event should fire. When any modal panel is open — a case, a dialogue, the portfolio — the loop pauses. Reading is not a time cost.

At 3:30pm the day closes: positions are valued, day-end results are shown, quests tick over, tomorrow's events are rolled, and the game saves.

---

## 5. The market

Twelve fictional listed companies is plenty for the MVP, spread across sectors that react differently: a bank, a cement maker, a steel maker, a road builder, an IT services firm, a payments company, a pharma firm, a consumer goods firm, and a few others.

Each stock carries a price, a hidden fair value, a sector, volatility, and the usual figures the player can look up: revenue, earnings, P/E, growth, debt.

Prices move on three forces added together each tick:

1. **Drift** — a slow pull towards the hidden fair value. Cheap things tend to get less cheap, eventually.
2. **Noise** — small random wobble, scaled by that stock's volatility. This is the part that punishes people who read meaning into every tick.
3. **Event push** — an event assigns a shock per sector, which fades over a few in-game hours.

An event is just data:

```ts
{
  id: 'infra-spend',
  headline: 'Government announces major infrastructure spending',
  sectorShocks: { construction: +0.06, steel: +0.05, cement: +0.04, it: -0.01 },
  decayHours: 4
}
```

The player is never told which stocks are affected. They read the headline, work out who benefits, and act. That is the whole lesson.

Important: keep the shock smaller than a day's noise for weak links. If infrastructure news moved construction stocks reliably every single time, the player would learn to press a button, not to think.

---

## 6. Cases

A case is a small file: some numbers, a set of choices, and a hidden truth.

```ts
{
  id: 'loan-sharma-textiles',
  building: 'bank',
  brief: { business: 'Sharma Textiles', ask: 1_000_000, purpose: 'new looms' },
  figures: {
    revenue: 4_200_000, expenses: 3_600_000,
    existingDebt: 1_800_000, interestPaid: 210_000,
    cashFlow: 320_000, creditScore: 690,
    collateralValue: 700_000, sector: 'textiles'
  },
  choices: ['approve_full', 'approve_reduced', 'reject', 'approve_with_collateral'],
  truth: { defaultRisk: 0.42, drivers: ['debt-service-cover', 'thin-cash-flow'] },
  teaches: ['debt service coverage ratio', 'collateral cover']
}
```

The player sees `brief` and `figures`. They never see `truth`.

When they choose, the brain samples the outcome using the seeded random generator, weighted by `defaultRisk` and adjusted by the choice — approving a smaller amount against collateral genuinely lowers the loss if it goes bad. Then it applies cash, XP and reputation, and shows what happened.

Only after the outcome does the explanation appear, and it points at the numbers that were on screen the whole time: this business earned ₹3.2 lakh of cash a year and already owed ₹2.1 lakh of interest, so a new loan left almost nothing spare.

The crucial detail: **a good decision can still go bad.** If the player rejects a 42% risk and the business would have repaid, tell them they were right to reject anyway. Reward the reasoning, not the dice roll. This is the difference between teaching finance and teaching superstition.

Five cases for the MVP, each teaching one thing: debt coverage, spotting a stretched balance sheet, diversification, reacting to a crash, and finding a fraud pattern in transactions.

---

## 7. Quests, NPCs and dialogue

A quest is a small state machine: steps, what completes each step, what it gives you. "The Bad Loan" is talk to the bank manager, then resolve the loan case, then report back. Quest state lives in the save, so quests survive a reload mid-step.

NPCs are written as personalities with a bias, not as neutral help. The trader is confident and often wrong about the short term. The risk officer is cautious and slows you down, sometimes wastefully. The journalist knows things early but exaggerates. Each NPC has a trust level the player discovers by watching how their advice turns out.

Dialogue is a simple tree in `data/npcs.ts`: a node, some options, a next node. No engine needed for the MVP.

---

## 8. The AI flavour layer

`ai/flavour.ts` is the only file allowed to call a model. It takes numbers the brain already decided and asks for wording:

- The story around a loan case — who runs the business, why they need the money
- What an NPC says about something that just happened
- Headline wording for an event that already has its sector effects fixed

Three hard rules:

1. The AI never returns a number the game uses. If it invents a revenue figure, the game ignores it.
2. Every call has plain written fallback text in `fallback.ts`. Play the whole game with AI switched off and nothing breaks — it just reads a little flatter.
3. Cache by content hash. The same case should not cost a fresh call every time it appears.

Call it when a case opens, not during the market loop. Nothing on the tick path should ever wait on a network request.

---

## 9. Art

Kenney's asset packs are the easiest starting point — they are public domain, consistently styled, and include top-down tiles and characters. OpenGameArt has more variety but licences differ per file, so check each one.

Practical advice: pick one pack and stay in it. Mixing packs is the fastest way to make a game look amateur, because pixel size and palette rarely match. Keep a `public/assets/LICENCES.md` listing every asset and its licence from day one. Backfilling that later is miserable.

For the city, a 40×30 tile map at 32px is enough for five buildings with room to walk. Build it in Tiled and export JSON.

---

## 10. Build order

Each step should end with something you can actually play.

UI first, then the world, then the brain behind it. Screens get built against fake data that matches the real shapes, so nothing has to be rewritten when the simulation arrives.

**Step 1 — Skeleton and look.** Vite, React, TypeScript, Tailwind, Phaser installed. Pixel font, colour palette, and the basic panel/button pieces everything else is made from. `sim/types.ts` written now, even though the simulation is empty — the fake data must match the real shapes.

**Step 2 — Home screen.** Title art, New Game, Continue, Settings, About. Character name entry on New Game. Continue is greyed out when there is no save. This is the first thing anyone sees, so it is worth getting right early.

**Step 3 — Game screen shell.** The full layout from your brief: top HUD, quest panel on the left, a placeholder box in the centre where the city will go, mini-map and quick actions on the right, tabbed panels along the bottom. All numbers fake for now.

**Step 4 — Every screen, on fake data.** Portfolio, market and chart, the case screen, NPC dialogue box, quest log, notifications, day-end summary, level-up popup. At the end of this step you can click through the whole game and see how it feels. Nothing works, but nothing is missing.

**Step 5 — City in the centre.** Phaser takes over the placeholder box. Tile map, a character, arrow keys, walls that stop you. Get walking feeling nice here — if it is stiff, everything on top feels stiff.

**Step 6 — Doors.** Five buildings you can walk into, each opening the right panel. Now the UI and the world are joined.

**Step 7 — Clock.** Real time starts running, the day opens and closes, the day-end screen fires for real. Save to browser storage.

**Step 8 — Market.** Twelve stocks with real prices ticking behind the market panel. The chart stops being fake.

**Step 9 — Portfolio.** Buy, sell, holdings, profit and loss, cash actually moving. Now you have a game.

**Step 10 — Cases.** Case engine plus the first loan case at the Bank. Outcome and explanation screens wired up.

**Step 11 — Progression.** XP, levels, skills and reputation changing from case results and trades.

**Step 12 — NPCs and quests.** Dialogue trees, five quests wired to the buildings and cases.

**Step 13 — Events.** Random events with sector shocks, headlines, notifications.

**Step 14 — Supabase.** Login on the home screen, cloud save, move the local save up on first login.

**Step 15 — AI flavour.** The wording layer, with fallbacks already written.

**Step 16 — Polish.** Sound, small animations, transitions, a day-end screen that feels good to read.

Steps 1 to 4 give you a clickable game that does nothing. Steps 5 to 9 make it real. Steps 10 to 13 make it the game in your brief. Steps 14 to 16 make it something you can show people.

One warning about building UI first: it is easy to design a screen that the simulation cannot actually feed. Writing `types.ts` in step 1 is the guard against that. Every fake object in the UI should be typed as the real thing, so if the market later cannot supply a field, TypeScript says so immediately instead of three weeks later.

---

## 11. Deliberately not in the MVP

Multiplayer, extra careers, the FinTech company management sim, options and futures, mobile layout, leaderboards, more than five buildings.

They are all in the brief and they all fit later — the layer split above is what keeps that door open. Multiplayer in particular is possible because the brain is pure and seeded: the same starting state and the same actions give the same world on every machine, which is the hard part of syncing players.

---

## 12. Risks worth naming now

**Scope.** The brief describes several games. The MVP list is the game. Anything not in steps 1 to 16 goes on a "later" list, not into this build.

**The market feeling fake.** If prices only wobble, the player gets bored. If events are too strong, the player stops thinking. Tune this by playing, not by reasoning about it — plan a session where all you do is watch prices and adjust the noise and shock numbers.

**Pixel art time.** Making sprites takes far longer than people expect. Sticking to one free pack is what keeps this project finishable.

**The dashboard trap.** The failure mode in your brief is real and it creeps in quietly: a panel gets added, then another, and soon the player never walks anywhere. A useful test — if a new feature can be reached without walking to a building, ask whether it should exist.
