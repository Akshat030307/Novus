import type { ReactNode } from 'react'
import { getConcept } from '@/data/concepts'

/**
 * Step C-a. Wraps a label so hovering it opens a two-line card from the
 * Ledger's glossary — the "tap any number to learn it" affordance. Hover-only
 * is fine: the game has no mobile layout (see architecture.md, not in this
 * build). Falls back to the bare label if the concept id is unknown.
 */
export function Explain({ id, children }: { id: string; children: ReactNode }) {
  const concept = getConcept(id)
  if (!concept) return <>{children}</>

  return (
    <span className="group relative inline-block cursor-help border-b border-dotted border-muted">
      {children}
      <span
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 w-56 -translate-x-1/2
          border-2 border-marigold bg-panel p-2 text-left opacity-0 shadow-lg transition-opacity
          group-hover:opacity-100"
      >
        <span className="mb-1 block font-display text-[9px] text-marigold uppercase">{concept.label}</span>
        <span className="block font-body text-xs text-ink">{concept.short}</span>
      </span>
    </span>
  )
}
