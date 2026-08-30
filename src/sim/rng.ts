/**
 * Seeded random numbers.
 *
 * Nothing in sim/ may call Math.random(). Every random choice runs through
 * here, seeded from the save's seed plus the day. That is what makes a loaded
 * save carry on exactly as it would have, and what makes multiplayer possible
 * later without sending the whole world over the wire.
 */

/** turns any string into a 32-bit number */
function hashSeed(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export interface Rng {
  /** 0 to 1 */
  next(): number
  /** whole number from min to max, both included */
  int(min: number, max: number): number
  /** true with the given chance, 0 to 1 */
  chance(p: number): boolean
  pick<T>(items: T[]): T
  /** roughly bell-shaped, mean 0, standard deviation 1 */
  normal(): number
}

export function makeRng(seed: string): Rng {
  let s = hashSeed(seed)
  const next = () => {
    // mulberry32
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    chance: (p) => next() < p,
    pick: (items) => items[Math.floor(next() * items.length)],
    normal: () => {
      // Box-Muller
      const u = 1 - next()
      const v = next()
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
    },
  }
}
