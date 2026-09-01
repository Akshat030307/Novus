/**
 * Where the money is, as one blocky bar plus a legend. Twenty cells, each
 * coloured by the slice it falls in — the same pixel language as StatBar, so
 * the portfolio reads at a glance without a smooth pie chart breaking the look.
 */
export interface Slice {
  label: string
  value: number
  /** a Tailwind bg-* class from the token set, e.g. 'bg-marigold' */
  cls: string
}

const CELLS = 20

export function AllocationBar({ slices }: { slices: Slice[] }) {
  const total = slices.reduce((t, s) => t + Math.max(0, s.value), 0) || 1

  const cellClass: string[] = []
  let slice = 0
  let filled = 0
  for (let c = 0; c < CELLS; c++) {
    const here = (c + 0.5) / CELLS
    while (slice < slices.length - 1 && here > filled + Math.max(0, slices[slice].value) / total) {
      filled += Math.max(0, slices[slice].value) / total
      slice++
    }
    cellClass.push(slices[slice]?.cls ?? 'bg-line/40')
  }

  return (
    <div>
      <div className="flex h-3 w-full gap-[2px] border border-line bg-night p-[1px]">
        {cellClass.map((cls, i) => (
          <div key={i} className={`flex-1 ${cls}`} />
        ))}
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5">
            <span className={`size-2 shrink-0 ${s.cls}`} />
            <span className="truncate text-muted">{s.label}</span>
            <span className="ml-auto font-num text-ink">
              {Math.round((Math.max(0, s.value) / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
