import type { Paise } from '@/sim/types'

/**
 * Indian money formatting: lakh and crore, not million and billion.
 * Everything is stored in paise, so divide before showing.
 */
export function rupees(paise: Paise, opts: { short?: boolean } = {}): string {
  const r = paise / 100
  if (opts.short) {
    if (Math.abs(r) >= 1e7) return `₹${(r / 1e7).toFixed(2)} Cr`
    if (Math.abs(r) >= 1e5) return `₹${(r / 1e5).toFixed(2)} L`
    if (Math.abs(r) >= 1e3) return `₹${(r / 1e3).toFixed(1)}k`
  }
  return `₹${r.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

export function signed(pct: number): string {
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
}

/** game minutes since midnight -> "10:42 am" */
export function clockTime(minute: number): string {
  const h24 = Math.floor(minute / 60)
  const m = minute % 60
  const suffix = h24 >= 12 ? 'pm' : 'am'
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h}:${String(m).padStart(2, '0')} ${suffix}`
}

export const MARKET_OPEN = 9 * 60 + 15   // 9:15 am
export const MARKET_CLOSE = 15 * 60 + 30 // 3:30 pm
