import type { BuildingId } from '@/sim/types'

/**
 * The city, as plain data. No Phaser here — CityScene turns this into tiles.
 *
 * Three layers come out of this file:
 *   GROUND   walkable — grass, footpaths, tarmac, the plaza
 *   DECOR    props that sit on the ground and block you — lamps, cars,
 *            benches, hydrants, stalls
 *   OBJECTS  building shells — all solid, doorways cut back out
 *
 * Streets run on a grid: three avenues north–south, three roads east–west,
 * tarmac three tiles wide with a painted centre line, footpaths either side,
 * zebra crossings at every junction. The middle junction opens into a round
 * plaza with a fountain — that is where you start.
 *
 * Tile ids index Kenney's RPG Urban Pack sheet (`tilemap_packed.png`, 16px
 * tiles, 27 columns, ids 0–485). -1 means "no tile". When this moves to Tiled
 * only this file and the loader in CityScene change.
 */

export const TILE = 16
export const MAP_W = 58
export const MAP_H = 44

const EMPTY = -1

/** named tiles, picked off the sheet, so the arrays below read as something */
const T = {
  grass: 28,

  // footpath — light kerbstone, a 9-slice so blocks have clean edges
  path: 37,
  pathN: 9,
  pathS: 64,
  pathW: 36,
  pathE: 42,
  pathNW: 8,
  pathNE: 15,
  pathSW: 62,
  pathSE: 69,

  // tarmac
  road: 441,
  roadDashH: 433,
  roadDashV: 462,
  roadCross: 406,
  zebra: 435,
  manhole: 467,

  // plaza paving — tan, its own 9-slice
  plaza: 109,
  plazaN: 82,
  plazaS: 136,
  plazaW: 108,
  plazaE: 115,
  plazaNW: 81,
  plazaNE: 88,
  plazaSW: 135,
  plazaSE: 142,

  // fountain water
  water: 198,
  waterN: 171,
  waterS: 225,
  waterW: 197,
  waterE: 204,
  waterNW: 170,
  waterNE: 177,
  waterSW: 224,
  waterSE: 231,

  // props
  lampHead: 162,
  lampPost: 189,
  signal: 169,
  signalPost: 196,
  bench: 223,
  hydrant: 251,
  bin: 252,
  mailbox: 305,
  stall: 276,
  stallB: 277,
  stallC: 300,
  carRedL: 474,
  carRedR: 475,
  carTaxiL: 420,
  carTaxiR: 421,
  carVanL: 426,
  carVanR: 427,
} as const

/* ---------- buildings and people ---------- */

/**
 * The five venues wired to the game plus the three the reference promotes
 * (risk, payments, cafeteria). The last three carry world-local ids — they
 * become real `BuildingId`s when their interiors get built, one step each.
 */
export type CityBuildingId =
  | BuildingId
  | 'risk'
  | 'payments'
  | 'cafeteria'
  | 'investment'
  | 'businesses'
  | 'government'
  | 'insurance'
  | 'registry'

/** the pack is low-rise: red brick, orange brick, or a glass shopfront */
type BuildKind = 'red' | 'orange' | 'shop'

export interface Building {
  id: CityBuildingId
  name: string
  /** footprint in tiles */
  rect: { x: number; y: number; w: number; h: number }
  kind: BuildKind
  /** present = you can walk in. The doorway is cut into the south wall. */
  door?: { x: number; y: number }
  /** where the name floats above the roof (tile coords, centred) */
  label: { x: number; y: number }
}

export interface NpcSpec {
  id: string
  name: string
  x: number
  y: number
  /** frame index in the tilesheet — a down-facing character */
  frame: number
}

export const BUILDINGS: Building[] = [
  // --- north row, between the top edge and the middle road ---
  { id: 'bank', name: 'Meridian Bank', kind: 'red', rect: { x: 16, y: 13, w: 9, h: 5 }, door: { x: 20, y: 17 }, label: { x: 20, y: 13 } },
  { id: 'exchange', name: 'Novus Exchange', kind: 'orange', rect: { x: 33, y: 13, w: 9, h: 5 }, door: { x: 37, y: 17 }, label: { x: 37, y: 13 } },
  { id: 'fintech', name: 'The FinTech Floor', kind: 'shop', rect: { x: 48, y: 13, w: 8, h: 5 }, door: { x: 52, y: 17 }, label: { x: 52, y: 13 } },

  // --- middle row, either side of the plaza ---
  { id: 'cafeteria', name: 'The Cafeteria', kind: 'shop', rect: { x: 16, y: 25, w: 9, h: 5 }, door: { x: 20, y: 29 }, label: { x: 20, y: 25 } },
  { id: 'risk', name: 'Risk & Compliance', kind: 'orange', rect: { x: 48, y: 25, w: 8, h: 5 }, door: { x: 52, y: 29 }, label: { x: 52, y: 25 } },

  // --- south row ---
  { id: 'payments', name: 'Payment Centre', kind: 'shop', rect: { x: 16, y: 37, w: 9, h: 4 }, door: { x: 20, y: 40 }, label: { x: 20, y: 37 } },
  { id: 'academy', name: 'The Academy', kind: 'red', rect: { x: 33, y: 37, w: 8, h: 4 }, door: { x: 37, y: 40 }, label: { x: 37, y: 37 } },
  { id: 'apartment', name: 'Your Apartment', kind: 'orange', rect: { x: 3, y: 37, w: 6, h: 4 }, door: { x: 6, y: 40 }, label: { x: 6, y: 37 } },

  // --- scenery: the reference's other buildings, no way in ---
  { id: 'insurance', name: 'Novus Insurance', kind: 'red', rect: { x: 16, y: 1, w: 9, h: 5 }, label: { x: 20, y: 1 } },
  { id: 'businesses', name: 'Businesses', kind: 'orange', rect: { x: 33, y: 1, w: 8, h: 5 }, label: { x: 37, y: 1 } },
  { id: 'investment', name: 'Investment Firm', kind: 'red', rect: { x: 2, y: 1, w: 6, h: 5 }, label: { x: 5, y: 1 } },
  { id: 'government', name: 'Government Office', kind: 'orange', rect: { x: 48, y: 37, w: 8, h: 5 }, label: { x: 52, y: 37 } },
  { id: 'registry', name: 'The Registry', kind: 'red', rect: { x: 3, y: 13, w: 6, h: 5 }, label: { x: 6, y: 13 } },
]

export type EnterableBuilding = Building & { door: { x: number; y: number } }

/** just the ones you can enter — CityScene builds a door zone per entry */
export const ENTERABLE: EnterableBuilding[] = BUILDINGS.filter(
  (b): b is EnterableBuilding => b.door !== undefined,
)

export const NPCS: NpcSpec[] = [
  { id: 'bank-manager', name: 'Rao — Branch Manager', x: 22, y: 19, frame: 105 },
  { id: 'trader', name: 'Vikram — Trader', x: 35, y: 19, frame: 186 },
  { id: 'risk-officer', name: 'Sunil — Risk Officer', x: 50, y: 31, frame: 348 },
  { id: 'journalist', name: 'Meera — Reporter', x: 32, y: 25, frame: 429 },
]

/* ---------- build the three tile layers ---------- */

function grid(fill: number): number[][] {
  return Array.from({ length: MAP_H }, () => Array.from({ length: MAP_W }, () => fill))
}

function put(map: number[][], x: number, y: number, t: number) {
  if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) map[y][x] = t
}

function rect(map: number[][], x: number, y: number, w: number, h: number, t: number) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) put(map, i, j, t)
}

const ground = grid(T.grass)
const decor = grid(EMPTY)
const objects = grid(EMPTY)

/* --- footpaths: laid first, roads and plaza are painted over the middle --- */

const AVENUES = [12, 28, 44] // north–south, centre column of a 3-wide road
const STREETS = [9, 21, 33] // east–west, centre row

function paveBand(cx: number, vertical: boolean) {
  // a 2-tile footpath either side of the 3-wide carriageway
  for (const side of [-1, 1]) {
    const near = 2 * side
    const far = 3 * side
    for (let k = 0; k < MAP_W + MAP_H; k++) {
      if (vertical) {
        put(ground, cx + near, k, T.path)
        put(ground, cx + far, k, T.path)
      } else {
        put(ground, k, cx + near, T.path)
        put(ground, k, cx + far, T.path)
      }
    }
  }
}
for (const x of AVENUES) paveBand(x, true)
for (const y of STREETS) paveBand(y, false)

/* --- carriageways --- */

for (const x of AVENUES) {
  for (let y = 0; y < MAP_H; y++) {
    put(ground, x - 1, y, T.road)
    put(ground, x + 1, y, T.road)
    put(ground, x, y, y % 2 === 0 ? T.roadDashV : T.road)
  }
}
for (const y of STREETS) {
  for (let x = 0; x < MAP_W; x++) {
    put(ground, x, y - 1, T.road)
    put(ground, x, y + 1, T.road)
    put(ground, x, y, x % 2 === 0 ? T.roadDashH : T.road)
  }
}
// clean intersections + zebra crossings on every approach
for (const x of AVENUES) {
  for (const y of STREETS) {
    rect(ground, x - 1, y - 1, 3, 3, T.road)
    put(ground, x, y, T.roadCross)
    for (const dy of [-2, 2]) for (let i = -1; i <= 1; i++) put(ground, x + i, y + dy, T.zebra)
    for (const dx of [-2, 2]) for (let j = -1; j <= 1; j++) put(ground, x + dx, y + j, T.zebra)
  }
}
put(ground, 6, STREETS[2], T.manhole)
put(ground, AVENUES[2], 26, T.manhole)

/* --- the plaza: a round of tan paving over the centre junction --- */

const PX = AVENUES[1]
const PY = STREETS[1]
;(function plaza() {
  const r = 6
  for (let j = -r; j <= r; j++) {
    for (let i = -r; i <= r; i++) {
      if (i * i * 1.7 + j * j * 3 > r * r * 1.7) continue
      const edgeX = i * i * 1.7 + (Math.abs(j) + 1) * (Math.abs(j) + 1) * 3 > r * r * 1.7
      const edgeY = (Math.abs(i) + 1) * (Math.abs(i) + 1) * 1.7 + j * j * 3 > r * r * 1.7
      let t: number = T.plaza
      if (edgeY && j < 0) t = T.plazaN
      else if (edgeY && j > 0) t = T.plazaS
      else if (edgeX && i < 0) t = T.plazaW
      else if (edgeX && i > 0) t = T.plazaE
      put(ground, PX + i, PY + j, t)
    }
  }
  // fountain, centred — a stone-rimmed pool
  put(objects, PX - 1, PY - 1, T.waterNW)
  put(objects, PX + 1, PY - 1, T.waterNE)
  put(objects, PX - 1, PY + 1, T.waterSW)
  put(objects, PX + 1, PY + 1, T.waterSE)
  put(objects, PX, PY - 1, T.waterN)
  put(objects, PX, PY + 1, T.waterS)
  put(objects, PX - 1, PY, T.waterW)
  put(objects, PX + 1, PY, T.waterE)
  put(objects, PX, PY, T.water)
})()

/* --- buildings ---
 * The pack is low-rise, so every building is a brick or shopfront box: a roof
 * course, wall rows (brick gets a window grid, a shop is glass all the way),
 * a base course, and a door cut into the south wall.
 */

interface Slice {
  roof: [number, number, number]
  wall: [number, number, number]
  base: [number, number, number]
  window: number
  door: number
}

const SLICE: Record<BuildKind, Slice> = {
  red: { roof: [16, 17, 19], wall: [43, 72, 73], base: [97, 98, 100], window: 336, door: 283 },
  orange: { roof: [124, 125, 127], wall: [178, 181, 184], base: [205, 206, 211], window: 336, door: 283 },
  shop: { roof: [328, 329, 331], wall: [359, 360, 361], base: [386, 387, 388], window: 360, door: 283 },
}

/** door tiles keep their id so CityScene can turn their collision off */
export const DOOR_TILES = [283]

function apron(x: number, y: number) {
  // a paved tile hugging a building, but only where there is bare grass
  if (y >= 0 && y < MAP_H && x >= 0 && x < MAP_W && ground[y][x] === T.grass) {
    ground[y][x] = T.path
  }
}

for (const b of BUILDINGS) {
  const s = SLICE[b.kind]
  const { x, y, w, h } = b.rect
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const edge = i === 0 ? 0 : i === w - 1 ? 2 : 1
      let t: number
      if (j === 0) t = s.roof[edge]
      else if (j === h - 1) t = s.base[edge]
      else if (edge !== 1) t = s.wall[edge]
      else t = b.kind === 'shop' ? s.wall[1] : i % 2 === 0 ? s.window : s.wall[1]
      put(objects, x + i, y + j, t)
    }
  }
  // a footpath apron so the building sits on the block, not on a lawn
  for (let i = x - 1; i <= x + w; i++) {
    apron(i, y - 1)
    apron(i, y + h)
  }
  for (let j = y - 1; j <= y + h; j++) {
    apron(x - 1, j)
    apron(x + w, j)
  }
  if (b.door) {
    put(objects, b.door.x, b.door.y, s.door) // in the wall, collision cleared in CityScene
    put(ground, b.door.x, b.door.y + 1, T.path) // a step onto the footpath
  }
}

/* --- street furniture --- */

// lamp posts marching down every footpath (never on the carriageway)
for (const x of AVENUES) {
  for (let y = 5; y < MAP_H - 4; y += 6) {
    for (const sx of [x - 3, x + 3]) {
      if (ground[y]?.[sx] !== T.path) continue
      put(decor, sx, y, T.lampPost)
      put(decor, sx, y - 1, T.lampHead)
    }
  }
}
// traffic signals on the approach corners of each junction
for (const x of AVENUES) {
  for (const y of STREETS) {
    for (const dx of [-3, 3]) {
      for (const dy of [-3, 3]) {
        put(decor, x + dx, y + dy, T.signalPost)
        put(decor, x + dx, y + dy - 1, T.signal)
      }
    }
  }
}

// parked cars along the outer avenues (two tiles each, at the kerb)
const PARKED: [number, number, 'red' | 'taxi' | 'van'][] = [
  [AVENUES[0] + 2, 14, 'taxi'],
  [AVENUES[0] + 2, 25, 'red'],
  [AVENUES[0] + 2, 38, 'van'],
  [AVENUES[2] - 3, 15, 'red'],
  [AVENUES[2] - 3, 27, 'van'],
  [AVENUES[2] + 2, 39, 'taxi'],
]
for (const [x, y, kind] of PARKED) {
  const [l, r] =
    kind === 'red' ? [T.carRedL, T.carRedR] : kind === 'taxi' ? [T.carTaxiL, T.carTaxiR] : [T.carVanL, T.carVanR]
  put(decor, x, y, l)
  put(decor, x + 1, y, r)
}

// the plaza: benches ringing the fountain
for (const [dx, dy] of [
  [-3, 0],
  [3, 0],
  [0, 3],
] as const) {
  put(decor, PX + dx, PY + dy, T.bench)
}

// market stalls lining the footpath by the cafeteria
for (const [x, y, t] of [
  [26, 26, T.stall],
  [26, 27, T.stallB],
  [26, 28, T.stallC],
] as const) {
  put(decor, x, y, t)
}

// hydrants, bins, a postbox on the footpaths
for (const [x, y, t] of [
  [15, 12, T.hydrant],
  [31, 24, T.bin],
  [46, 24, T.mailbox],
  [15, 30, T.bin],
  [42, 36, T.hydrant],
  [15, 36, T.mailbox],
] as const) {
  put(decor, x, y, t)
}

export const GROUND: number[][] = ground
export const DECOR: number[][] = decor
export const OBJECTS: number[][] = objects

/** where the player starts — on the plaza, just south of the fountain */
export const SPAWN = { x: PX, y: PY + 4 }
