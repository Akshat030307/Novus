/**
 * Step 15. Cache flavour text by content hash so the same case is not paid for
 * twice. Lives in localStorage, NOT in the save — it is cosmetic, and a save
 * loaded elsewhere just regenerates (or shows the written fallback).
 */
const KEY = 'novus:flavour:v1'

/** small stable string hash — the content key */
export function hash(input: string): string {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}

function read(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function getCached(key: string): string | null {
  return read()[key] ?? null
}

export function setCached(key: string, text: string): void {
  try {
    const all = read()
    all[key] = text
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    // storage full or disabled — flavour just regenerates next time, no harm
  }
}
