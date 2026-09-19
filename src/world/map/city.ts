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
  // Every 9-slice on this sheet is a 3x3 block: NW N NE / W C E / SW S SE, with
  // the three rows 27 ids apart. Right next to most of them sits a narrower
  // piece of the same material (a 1-wide pool, a 1-wide strip) — and taking
  // the east column from *that* is what split the fountain in two. Check a new
  // slice by writing out all nine ids and confirming they are three runs of
  // three consecutive numbers.

  // lawn — its own 9-slice, plus 1-wide strips for the gaps between blocks
  grass: 28,
  grassN: 1,
  grassS: 55,
  grassW: 27,
  grassE: 29,
  grassNW: 0,
  grassNE: 2,
  grassSW: 54,
  grassSE: 56,
  grassColN: 7, // a 1-wide vertical strip: top, middle, bottom
  grassCol: 34,
  grassColS: 61,
  grassRowW: 57, // a 1-tall horizontal strip: left, middle, right
  grassRow: 58,
  grassRowE: 59,
  grassDot: 60, // a single isolated tile

  // footpath. `path` is the fill everywhere and is deliberately 37, not the
  // plain centre tile: it carries a light stripe on its east side that repeats
  // into the paving-slab look. The edge pieces are the true 9-slice.
  path: 37,
  pathN: 9,
  pathS: 63,
  pathW: 35,
  pathE: 37,
  pathNW: 8,
  pathNE: 10,
  pathSW: 62,
  pathSE: 64,

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
  plazaE: 110,
  plazaNW: 81,
  plazaNE: 83,
  plazaSW: 135,
  plazaSE: 137,

  // fountain water
  water: 198,
  waterN: 171,
  waterS: 225,
  waterW: 197,
  waterE: 199,
  waterNW: 170,
  waterNE: 172,
  waterSW: 224,
  waterSE: 226,

  // props. Anything two tiles tall is a head over a post, and both halves must
  // be written or you get a floating top or a headless pole.
  lantern: 169, // the green street lantern, head
  lanternPost: 196,
  tree: 232,
  treeTrunk: 259,
  bench: 223,
  hydrant: 251,
  bin: 252,
  mailbox: 305,
  stall: 276,
  stallB: 277,
  stallC: 300,
  // cars are 1 wide x 2 tall and face down the road, so they sit in a single
  // lane. (The 2-wide ones on the sheet are 2x2 and cover two of three lanes.)
  carOrange: 395,
  carOrangeB: 422,
  carRed: 449,
  carRedB: 476,
  carYellow: 398,
  carYellowB: 425,
  carMaroon: 452,
  carMaroonB: 479,
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
  // the block between the avenue-28 and avenue-44 footpaths is x 32..40, the
  // mirror of the Bank's 16..24. It used to start at 33 and run over the
  // footpath at x 41, burying a lantern and half a parked car.
  { id: 'exchange', name: 'Novus Exchange', kind: 'orange', rect: { x: 32, y: 13, w: 9, h: 5 }, door: { x: 36, y: 17 }, label: { x: 36, y: 13 } },
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

/* --- the plaza: a rectangle of tan paving over the centre junction ---
 * It was an ellipse, and an ellipse on a square grid is a staircase: every step
 * left a stray kerb inside the paving and two single tiles poked out into the
 * road at either end. A rectangle 9-slices cleanly.
 *
 * It spans the junction from footpath row to footpath row (y 18..24) and stops
 * short of the Bank and the Cafeteria (x 22..34), so both roads now end at its
 * edge — a pedestrian square, which is what it is.
 */

const PX = AVENUES[1]
const PY = STREETS[1]
const PLAZA = { x: PX - 6, y: PY - 3, w: 13, h: 7 }

function nineSlice(
  map: number[][],
  r: { x: number; y: number; w: number; h: number },
  t: { c: number; n: number; s: number; w: number; e: number; nw: number; ne: number; sw: number; se: number },
) {
  for (let j = 0; j < r.h; j++) {
    for (let i = 0; i < r.w; i++) {
      const top = j === 0
      const bottom = j === r.h - 1
      const left = i === 0
      const right = i === r.w - 1
      const tile =
        top && left ? t.nw : top && right ? t.ne : bottom && left ? t.sw : bottom && right ? t.se
          : top ? t.n : bottom ? t.s : left ? t.w : right ? t.e : t.c
      put(map, r.x + i, r.y + j, tile)
    }
  }
}

nineSlice(ground, PLAZA, {
  c: T.plaza, n: T.plazaN, s: T.plazaS, w: T.plazaW, e: T.plazaE,
  nw: T.plazaNW, ne: T.plazaNE, sw: T.plazaSW, se: T.plazaSE,
})
// the fountain, centred — a stone-rimmed pool, 3x3
nineSlice(objects, { x: PX - 1, y: PY - 1, w: 3, h: 3 }, {
  c: T.water, n: T.waterN, s: T.waterS, w: T.waterW, e: T.waterE,
  nw: T.waterNW, ne: T.waterNE, sw: T.waterSW, se: T.waterSE,
})

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
  // 331 is a separate 1-wide awning, not the right end of 328-330
  shop: { roof: [328, 329, 330], wall: [359, 360, 361], base: [386, 387, 388], window: 360, door: 283 },
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

/* --- street furniture ---
 * Everything here is solid, so `place` refuses any tile that is not open
 * footpath (or open lawn, for trees) and not already taken. Before it existed
 * the lamp loop and the signal loop wrote to the *same* coordinates on every
 * avenue: the lantern overwrote the lamp's pole, the lamp's arm floated above
 * it, and on three rows that arm hung over the tarmac.
 */

function isFree(x: number, y: number) {
  return (
    x >= 0 && x < MAP_W && y >= 0 && y < MAP_H &&
    objects[y][x] === EMPTY && decor[y][x] === EMPTY
  )
}

/** a two-tile prop, head over base, only where both tiles are open */
function placeTall(x: number, y: number, head: number, base: number, on: (t: number) => boolean) {
  if (!isFree(x, y - 1) || !isFree(x, y)) return false
  if (!on(ground[y - 1][x]) || !on(ground[y][x])) return false
  put(decor, x, y - 1, head)
  put(decor, x, y, base)
  return true
}

const onPath = (t: number) => t === T.path
const PLAZA_TILES = new Set<number>([
  T.plaza, T.plazaN, T.plazaS, T.plazaW, T.plazaE,
  T.plazaNW, T.plazaNE, T.plazaSW, T.plazaSE,
])
const onPlaza = (t: number) => PLAZA_TILES.has(t)
const inPlaza = (x: number, y: number) =>
  x >= PLAZA.x && x < PLAZA.x + PLAZA.w && y >= PLAZA.y && y < PLAZA.y + PLAZA.h

// lanterns on the corners of every junction — except the one the plaza has
// replaced, which gets its own four below
for (const x of AVENUES) {
  for (const y of STREETS) {
    if (x === PX && y === PY) continue
    for (const dx of [-3, 3]) {
      for (const dy of [-3, 3]) placeTall(x + dx, y + dy, T.lantern, T.lanternPost, onPath)
    }
  }
}

// the plaza: a lantern at each corner of the fountain's square, benches
// facing it east and west
for (const dx of [-3, 3]) {
  for (const dy of [-1, 2]) placeTall(PX + dx, PY + dy, T.lantern, T.lanternPost, onPlaza)
}
for (const dx of [-5, 5]) put(decor, PX + dx, PY, T.bench)

// parked cars, one lane each, in the kerbside lane of the outer avenues and
// well clear of the zebra crossings
const PARKED: [number, number, [number, number]][] = [
  [AVENUES[0] - 1, 15, [T.carOrange, T.carOrangeB]],
  [AVENUES[0] + 1, 27, [T.carRed, T.carRedB]],
  [AVENUES[0] - 1, 39, [T.carYellow, T.carYellowB]],
  [AVENUES[2] + 1, 15, [T.carMaroon, T.carMaroonB]],
  [AVENUES[2] - 1, 27, [T.carOrange, T.carOrangeB]],
  [AVENUES[2] + 1, 39, [T.carRed, T.carRedB]],
]
for (const [x, y, [head, base]] of PARKED) {
  placeTall(x, y, head, base, (t) => t === T.road || t === T.roadDashV)
}

// market stalls lining the footpath by the cafeteria
for (const [x, y, t] of [
  [26, 26, T.stall],
  [26, 27, T.stallB],
  [26, 28, T.stallC],
] as const) {
  if (isFree(x, y)) put(decor, x, y, t)
}

// hydrants, bins, postboxes on the footpaths
for (const [x, y, t] of [
  [15, 12, T.hydrant],
  [30, 26, T.bin],
  [46, 24, T.mailbox],
  [15, 30, T.bin],
  [42, 36, T.hydrant],
  [15, 36, T.mailbox],
] as const) {
  if (isFree(x, y) && onPath(ground[y][x])) put(decor, x, y, t)
}

/* --- lawns ---
 * Every tile nobody paved is grass, and it used to be all the same centre
 * tile — so each empty block read as a flat slab of colour with no edge. This
 * pass gives every lawn its border from the sheet's own 9-slice, with the thin
 * 1-wide strips handled separately, then plants trees in the ones big enough
 * to hold them. Runs last, because it has to see everything else first.
 */

const isGrass = (x: number, y: number) =>
  // off the map counts as lawn, so a lawn at the edge runs on out of view
  x < 0 || x >= MAP_W || y < 0 || y >= MAP_H || ground[y][x] === T.grass

const lawn: number[][] = ground.map((row) => [...row])
for (let y = 0; y < MAP_H; y++) {
  for (let x = 0; x < MAP_W; x++) {
    if (ground[y][x] !== T.grass) continue
    const n = isGrass(x, y - 1)
    const sEdge = isGrass(x, y + 1)
    const w = isGrass(x - 1, y)
    const e = isGrass(x + 1, y)
    let t: number = T.grass
    if (!w && !e && !n && !sEdge) t = T.grassDot
    else if (!w && !e) t = !n ? T.grassColN : !sEdge ? T.grassColS : T.grassCol
    else if (!n && !sEdge) t = !w ? T.grassRowW : !e ? T.grassRowE : T.grassRow
    else if (!n) t = !w ? T.grassNW : !e ? T.grassNE : T.grassN
    else if (!sEdge) t = !w ? T.grassSW : !e ? T.grassSE : T.grassS
    else if (!w) t = T.grassW
    else if (!e) t = T.grassE
    lawn[y][x] = t
  }
}

// Trees, only on inner lawn — never on a border tile, never within a step of
// anyone standing there, and at least three tiles from the last tree so a
// lawn reads as a planted green rather than a forest. Greedy rather than a
// fixed grid: a fixed grid missed any lawn whose interior did not happen to
// line up with it, which was most of them.
const nearNpc = (x: number, y: number) =>
  NPCS.some((p) => Math.abs(p.x - x) <= 1 && Math.abs(p.y - y) <= 2)
const trees: { x: number; y: number }[] = []
const crowded = (x: number, y: number) =>
  trees.some((t) => Math.abs(t.x - x) < 3 && Math.abs(t.y - y) < 3)
for (let y = 1; y < MAP_H; y++) {
  for (let x = 0; x < MAP_W; x++) {
    if (lawn[y][x] !== T.grass || lawn[y - 1][x] !== T.grass) continue
    if (nearNpc(x, y) || inPlaza(x, y) || crowded(x, y)) continue
    if (placeTall(x, y, T.tree, T.treeTrunk, (t) => t === T.grass)) trees.push({ x, y })
  }
}

for (let y = 0; y < MAP_H; y++) ground[y] = lawn[y]

// The lawn's corner and strip-end tiles are rounded, with transparent pixels
// where the curve cuts in — and the ground layer is the bottom of the stack,
// so those pixels showed the black canvas through. A footpath tile goes
// underneath every lawn tile that is not the plain centre.
const under = grid(EMPTY)
for (let y = 0; y < MAP_H; y++) {
  for (let x = 0; x < MAP_W; x++) {
    const t = ground[y][x]
    if (t !== T.grass && t >= 0 && [0, 1, 2, 7, 27, 29, 34, 54, 55, 56, 57, 58, 59, 60, 61].includes(t)) {
      under[y][x] = T.path
    }
  }
}

/** drawn beneath GROUND, only where a ground tile has transparent corners */
export const UNDER: number[][] = under
export const GROUND: number[][] = ground
export const DECOR: number[][] = decor
export const OBJECTS: number[][] = objects

/**
 * Where the player starts — on the plaza, just south of the fountain. It was
 * PY + 4, which was plaza while the plaza was an ellipse and is tarmac now
 * that it is a rectangle; PY + 3 is the plaza's bottom row.
 */
export const SPAWN = { x: PX, y: PY + 3 }
