# The look

The brief asked for a modern pixel-art RPG that is dark, has retro terminal
touches, and never reads as a finance dashboard. Everything below follows from
that, plus the Indian setting.

All of it lives in `src/styles/index.css` as tokens. No component holds a hex
value.

## Colour

| Token | Hex | Used for |
|-------|-----|----------|
| `night` | `#0e1020` | page background |
| `panel` | `#171a2e` | panel fill |
| `panel-2` | `#1f2340` | raised panel, hover |
| `line` | `#2b3157` | every border |
| `ink` | `#e6e8f5` | main text |
| `muted` | `#8d93b5` | labels, secondary text |
| `marigold` | `#f2a73b` | money, XP, focus, the sun |
| `amethyst` | `#8a6be8` | reputation, levels |
| `jade` | `#43c08a` | up, gain, approve |
| `coral` | `#e4574c` | down, loss, reject |

The background is deep indigo rather than black. Pure black with one bright
accent is the default look for anything calling itself retro, and it makes
pixel art sit flat on the page. Indigo gives the sprites something to sit
against and leaves room for a real dark tone below panels.

The accent is marigold — the colour of a flower stall, and close to how rupee
figures already read on Indian exchanges. It is warm without being the
terracotta that every AI-generated site currently uses.

Jade and coral for up and down are deliberately slightly dull. Neon green and
red on a trading screen make every tiny wobble feel like an emergency, which
is the exact instinct this game is trying to teach out of the player.

## Type

Three faces, three jobs:

- **Silkscreen** — display. Titles, labels, buttons. Pixel type is unreadable
  in paragraphs, so it is capped at short strings and small sizes.
- **IBM Plex Sans** — body. Case briefs, dialogue, anything a player reads for
  meaning. It also ships a Devanagari cut, which matters if Hindi is ever added.
- **IBM Plex Mono** — every number. Money, prices, times, quantities. Numbers
  in a proportional face jitter as they change, and in a game where prices tick
  every second that jitter is maddening.

Rule of thumb: if the player reads it, Plex Sans. If they compare it, Plex Mono.
If it names a thing, Silkscreen.

## Shape and motion

Hard corners everywhere. No rounded cards, no drop shadows, no gradients. Two
pixel borders. Bars fill in blocky steps rather than smoothly, so they read as
pixels rather than as a progress bar borrowed from a web app.

A very faint scanline wash sits on the page background at about 1.4% opacity —
enough to feel like a screen, not enough to fight the text.

Motion is used in one place at a time. Reduced motion is respected globally.

## The signature

`ui/components/DayArc.tsx`. The trading day drawn as an arc with a pixel sun
crossing it, from 9:15 to 3:30.

A clock reading 11:04 tells the player nothing they feel. The arc makes "half
the day is gone" something you see at a glance, and time running out is the
pressure the whole game runs on. It is the one decorative thing in the HUD,
and it earns that by encoding something real.

## Writing in the interface

Plain verbs, sentence case, no filler. Buttons say what happens: "Start", not
"Begin your journey". Empty states point at what to do instead of apologising —
the case panel with nothing in it says cases come from people, then tells the
player where to find one.

The game never lectures in the interface. Explanations come after an outcome,
and they point at numbers the player was already shown.
