# Working on Novus

Novus is a pixel-art RPG where the player walks around a city, takes finance
jobs, and learns by living with the results. Single player. Indian setting:
rupees, UPI, a market regulator, all fictional companies.

Read `docs/architecture.md` before changing anything structural.
`docs/build-steps.md` says what to build next.

## The one rule

Three layers, kept apart:

| Folder   | What it may do                          | What it may never do              |
|----------|-----------------------------------------|-----------------------------------|
| `sim/`   | all rules, money, randomness            | import React, Phaser, or fetch    |
| `world/` | draw the city, move the player          | decide anything about money       |
| `ui/`    | show state, send actions                | do money maths itself             |

Everything meets at `state/store.ts`. Phaser touches the rest of the app only
through `world/bridge.ts`.

When this rule gets bent, the market becomes untestable and multiplayer stops
being possible later. It is worth defending.

## Rules that are easy to break by accident

- **No `Math.random()` in `sim/`.** Use `makeRng()` from `sim/rng.ts`, seeded
  from the save's seed plus the day. A loaded save must carry on exactly as it
  would have.
- **Money is paise, stored as whole numbers.** `1_00_000` is one thousand
  rupees. Format with `rupees()` from `lib/format.ts`, never by hand.
- **Indian units.** Lakh and crore, not million and billion.
- **No real company names, ever.** The listing in `data/stocks.ts` is invented
  and stays invented. A real ticker turns a learning game into something that
  looks like advice.
- **Colours and fonts come from `styles/index.css` only.** No hex values in
  components. Tailwind classes like `bg-panel`, `text-marigold`, `font-display`
  come from the tokens there.
- **AI never returns a number the game uses.** See `ai/flavour.ts`.

## Current state

Steps 1 to 4 of the build plan: the UI is being built against mock data.

`state/mock.ts` is a fake `GameState`, typed as the real thing on purpose. If a
screen needs a field the simulation could never produce, TypeScript should
refuse it there rather than three weeks later. Delete that file at step 8.

Nothing is wired to real logic yet. `sim/` is mostly stub files whose comments
explain what belongs in them.

## Commands

```
npm install
npm run dev        # http://localhost:5173
npm run build
npm run typecheck
```

## How to work on this

Build one step at a time and stop at the end of it. Each step in
`docs/build-steps.md` should end with something that runs. Do not skip ahead
to wire up the simulation while the screens are still fake — the whole point
of the order is to see the game before building the engine underneath it.

If a step turns out to need a change to `sim/types.ts`, make that change first,
let TypeScript show every screen that breaks, and fix those. That is the type
file doing its job, not an obstacle.
