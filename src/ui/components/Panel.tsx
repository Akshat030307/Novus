import type { ReactNode } from 'react'

/**
 * The one panel shape used everywhere. A chunky 2px edge and a hard corner —
 * pixel games do not have rounded cards.
 */
export function Panel({
  title,
  right,
  children,
  className = '',
  bodyClassName = '',
}: {
  title?: string
  right?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={`flex min-h-0 flex-col border-2 border-line bg-panel ${className}`}>
      {title && (
        <header className="flex shrink-0 items-center justify-between border-b-2 border-line px-3 py-2">
          <h2 className="font-display text-[10px] tracking-wide text-muted uppercase">{title}</h2>
          {right}
        </header>
      )}
      <div className={`min-h-0 flex-1 overflow-y-auto ${bodyClassName}`}>{children}</div>
    </section>
  )
}
