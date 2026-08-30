import type { BuildingId } from '@/sim/types'

/**
 * The city, as plain data. No Phaser here — CityScene turns this into tiles.
 *
 * Step 5 hand-authored the map as arrays; step 6 gave the five buildings
 * identities, doorways, and NPC spots. When it moves to Tiled (a JSON export
 * dropped into this folder) only this file and the loader in CityScene change.
 *
 * Tile ids index Kenney's RPG Urban Pack sheet
 * (`tilemap_packed.png`, 16px tiles, 27 columns). -1 means "no tile".
 */

export const TILE = 16
export const MAP_W = 40
export const MAP_H = 30

const EMPTY = -1

/** named tiles, so the arrays below read as something */
const T = {
  grass: 28,
  pavement: 36,
  road: 441,
  roadDashH: 433,
  roadDashV: 462,
  crossing: 435,
  door: 283,
  redWall: 72,
  redTop: 17,
  redBase: 98,
  orangeWall: 181,
  orangeTop: 125,
  orangeBase: 206,
  water: 198,
  waterTop: 171,
  waterLeft: 197,
  treePine: 265,
  treeRound: 292,
} as const

/* ---------- buildings and people ---------- */

export interface Building {
  id: BuildingId
  name: string
  /** footprint in tiles */
  rect: { x: number; y: number; w: number; h: number }
  /** the walkable doorway tile, cut into the south wall */
  door: { x: number; y: number }
  /** where the name floats above the roof (tile coords, centred) */
  label: { x: number; y: number }
  style: 'red' | 'orange'
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
  { id: 'bank', name: 'Meridian Bank', rect: { x: 24, y: 4, w: 6, h: 5 }, door: { x: 26, y: 8 }, label: { x: 27, y: 4 }, style: 'red' },
  { id: 'exchange', name: 'Novus Exchange', rect: { x: 32, y: 5, w: 6, h: 5 }, door: { x: 34, y: 9 }, label: { x: 35, y: 5 }, style: 'orange' },
  { id: 'academy', name: 'The Academy', rect: { x: 10, y: 4, w: 6, h: 5 }, door: { x: 12, y: 8 }, label: { x: 13, y: 4 }, style: 'red' },
  { id: 'apartment', name: 'Your Apartment', rect: { x: 4, y: 24, w: 5, h: 4 }, door: { x: 6, y: 27 }, label: { x: 6, y: 24 }, style: 'orange' },
  { id: 'fintech', name: 'The FinTech Floor', rect: { x: 26, y: 24, w: 6, h: 4 }, door: { x: 28, y: 27 }, label: { x: 29, y: 24 }, style: 'red' },
]

export const NPCS: NpcSpec[] = [
  { id: 'bank-manager', name: 'Rao — Branch Manager', x: 26, y: 10, frame: 105 },
  { id: 'trader', name: 'Vikram — Trader', x: 34, y: 12, frame: 186 },
  { id: 'risk-officer', name: 'Sunil — Risk Officer', x: 28, y: 22, frame: 348 },
  { id: 'journalist', name: 'Meera — Reporter', x: 16, y: 23, frame: 429 },
]

/* ---------- build the two tile layers ---------- */

function grid(fill: number): number[][] {
  return Array.from({ length: MAP_H }, () => Array.from({ length: MAP_W }, () => fill))
}

function rect(map: number[][], x: number, y: number, w: number, h: number, t: number) {
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) {
      if (i >= 0 && i < MAP_W && j >= 0 && j < MAP_H) map[j][i] = t
    }
  }
}

const ground = grid(T.pavement)
const objects = grid(EMPTY)

// park, top-left
rect(ground, 1, 1, 17, 18, T.grass)

// roads: vertical avenue, horizontal street, and crossings at the junction
rect(ground, 19, 0, 2, MAP_H, T.road)
rect(ground, 0, 20, MAP_W, 2, T.road)
for (let j = 0; j < MAP_H; j++) ground[j][19] = j % 2 === 0 ? T.roadDashV : T.road
for (let i = 0; i < MAP_W; i++) ground[20][i] = i % 2 === 0 ? T.roadDashH : T.road
for (let j = 20; j < 22; j++) {
  ground[j][18] = T.crossing
  ground[j][21] = T.crossing
}
for (let i = 18; i < 22; i++) {
  ground[19][i] = T.crossing
  ground[22][i] = T.crossing
}

// buildings: solid, with a top and base course, and the doorway cut back out
for (const b of BUILDINGS) {
  const wall = b.style === 'red' ? T.redWall : T.orangeWall
  const top = b.style === 'red' ? T.redTop : T.orangeTop
  const base = b.style === 'red' ? T.redBase : T.orangeBase
  const { x, y, w, h } = b.rect
  rect(objects, x, y, w, h, wall)
  for (let i = x; i < x + w; i++) {
    objects[y][i] = top
    objects[y + h - 1][i] = base
  }
  objects[b.door.y][b.door.x] = EMPTY
  ground[b.door.y][b.door.x] = T.door
}

// pond in the park
rect(objects, 2, 12, 4, 3, T.water)
for (let i = 2; i < 6; i++) objects[12][i] = T.waterTop
for (let j = 12; j < 15; j++) objects[j][2] = T.waterLeft

// trees
const trees: [number, number, number][] = [
  [3, 3, T.treePine],
  [6, 2, T.treeRound],
  [8, 6, T.treePine],
  [4, 9, T.treeRound],
  [17, 3, T.treePine],
  [17, 8, T.treeRound],
  [7, 16, T.treePine],
  [3, 17, T.treeRound],
  [15, 16, T.treePine],
  [22, 3, T.treeRound],
  [37, 15, T.treePine],
  [10, 24, T.treeRound],
]
for (const [x, y, t] of trees) objects[y][x] = t

export const GROUND: number[][] = ground
export const OBJECTS: number[][] = objects

/** where the player starts; step 7 restores the real position from the save */
export const SPAWN = { x: 22, y: 16 }
