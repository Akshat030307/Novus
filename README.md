# Novus

A pixel-art RPG where finance is the game mechanic, not the subject of a quiz.
You start as a finance intern in the city of Novus, take on cases, trade a
simulated market, and find out what your decisions were worth.

## Run it

```
npm install
npm run dev
```

Open http://localhost:5173. You will land on the title screen. "Skip to the UI
demo" opens the game screen running on mock data.

## Where things are

```
src/
  app/        screen switch
  ui/         React panels: HUD, quests, market, portfolio, cases, dialogue
  world/      Phaser: the city, the player, the bridge to the rest of the app
  sim/        all game rules and money maths — plain TypeScript, no framework
  data/       content: stocks, cases, quests, NPCs, events
  state/      the store, saving, and the mock data the UI is built against
  ai/         the wording layer, and its written fallbacks
  lib/        formatting and the Supabase client
docs/         architecture, build steps, design tokens
```

## Docs

- `CLAUDE.md` — read first if you are picking this up
- `docs/architecture.md` — how the layers fit together and why
- `docs/build-steps.md` — the ordered build plan
- `docs/design.md` — palette, type, and the rules behind the look

## State of play

Steps 1 to 4: UI built on mock data. The simulation is still stubs.
