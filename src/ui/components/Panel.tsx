import type { ReactNode } from 'react'

/**
 * The one panel shape used everywhere. A chunky 2px edge and a hard corner —
 * pixel games do not have rounded cards. What gives it life: a raised header
 * strip, an accent rule under the title that says which part of the game this
 * panel belongs to, and a lighter top edge so it sits up off the background.
 */
type Accent = 'marigold' | 'amethyst' | 'jade' | 'coral' | 'muted'

const ACCENT_RULE: Record<Accent, string> = {
  marigold: 'border-b-marigold',
  amethyst: 'border-b-amethyst',
  jade: 'border-b-jade',
  coral: 'border-b-coral',
  muted: 'border-b-line',
}

const ACCENT_TEXT: Record<Accent, string> = {
  marigold: 'text-marigold',
  amethyst: 'text-amethyst',
  jade: 'text-jade',
  coral: 'text-coral',
  muted: 'text-muted',
}

export function Panel({
  title,
  right,
  icon,
  accent = 'muted',
  children,
  className = '',
  bodyClassName = '',
}: {
  title?: string
  right?: ReactNode
  /** a short glyph before the title — an emoji or a single character */
  icon?: ReactNode
  accent?: Accent
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-lg shadow-black/40 ${className}`}
    >
      {title && (
        <header
          className={`flex shrink-0 items-center justify-between gap-2 border-b bg-panel-2 px-4 py-2.5 ${ACCENT_RULE[accent]}`}
        >
          <div className="flex items-center gap-1.5">
            {icon && (
              <span className={`text-[14px] leading-none ${ACCENT_TEXT[accent]}`}>{icon}</span>
            )}
            <h2 className="text-[13px] font-semibold tracking-wide text-muted uppercase">{title}</h2>
          </div>
          {right}
        </header>
      )}
      <div className={`min-h-0 flex-1 overflow-y-auto ${bodyClassName}`}>{children}</div>
    </section>
  )
}
