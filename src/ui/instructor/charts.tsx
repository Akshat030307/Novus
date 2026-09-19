import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import {
  HABITS,
  activityByDay,
  type AssignmentBreakdown,
  type ResultKind,
  type Row,
} from '@/sim/cohort'
import type { Attempt } from '@/sim/attempts'

/**
 * The performance charts on a class page. Hand-drawn SVG, no chart library:
 * five small charts do not earn a dependency, and drawing them here keeps
 * every colour on the tokens in styles/index.css.
 *
 * Colour does one job per chart and never carries meaning alone:
 *   - results are status — jade passed, coral not yet, grey not started —
 *     and every bar is labelled in words in the legend and tooltip (and the
 *     colour-safe setting swaps the pair for blue/amber, as in the game)
 *   - habit counts are one hue, amethyst, lighter to stronger, with the
 *     count printed in the cell
 *   - progress is a single series, marigold
 *
 * Everything is linked by `focus`: pick a student in any chart or the table
 * and every chart highlights them. Every value is also in the student table,
 * so a tooltip never gates anything.
 */

export interface ChartProps {
  rows: Row[]
  focus: string | null
  onFocus: (userId: string | null) => void
}

/* ---------- plumbing ---------- */

/**
 * Draw at the real pixel size of the card, so 12px text stays 12px on every
 * screen, and the chart fills whatever height the dashboard gives it.
 */
function useBox() {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const read = () => setSize({ width: Math.floor(el.clientWidth), height: Math.floor(el.clientHeight) })
    const ro = new ResizeObserver(read)
    ro.observe(el)
    read()
    return () => ro.disconnect()
  }, [])
  return { ref, ...size }
}

interface Tip {
  x: number
  y: number
  body: ReactNode
}

/** one tooltip per chart, positioned inside the chart's own box and kept on-screen */
function useTip() {
  const [tip, setTip] = useState<Tip | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const at = (e: { clientX: number; clientY: number }, body: ReactNode) => {
    const r = box.current?.getBoundingClientRect()
    if (r) setTip({ x: e.clientX - r.left, y: e.clientY - r.top, body })
  }
  const atPoint = (x: number, y: number, body: ReactNode) => setTip({ x, y, body })
  const hide = () => setTip(null)
  const w = box.current?.clientWidth ?? 400
  const h = box.current?.clientHeight ?? 400
  const view = tip && (
    <div
      className="pointer-events-none absolute z-20 w-max max-w-64 rounded-md border border-line bg-panel-2 px-3 py-2 text-[13px] leading-snug text-ink shadow-lg shadow-black/60"
      style={{
        left: Math.max(0, Math.min(tip.x + 14, w - 240)),
        top: tip.y + 14,
        // in the lower part of a chart, open upwards so it never runs off the card
        transform: tip.y > h * 0.55 ? 'translateY(calc(-100% - 28px))' : undefined,
      }}
    >
      {tip.body}
    </div>
  )
  return { box, at, atPoint, hide, view }
}

/**
 * The chart's own box: fills its card body, scrolls only if a very short
 * screen can't fit it, and holds the tooltip outside the scroller so it is
 * never clipped by it.
 */
function Frame({
  box,
  tip,
  children,
}: {
  box: ReturnType<typeof useBox>
  tip: ReturnType<typeof useTip>
  children: ReactNode
}) {
  return (
    <div ref={tip.box} className="absolute inset-0" onPointerLeave={tip.hide}>
      <div ref={box.ref} className="absolute inset-0 overflow-x-hidden overflow-y-auto">
        {box.width > 0 && children}
      </div>
      {tip.view}
    </div>
  )
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export function ChartCard({
  title,
  accent,
  note,
  legend,
  children,
  className = '',
  bodyHeight = 'h-80',
}: {
  title: string
  /** a text-* token class for the title */
  accent: string
  note?: ReactNode
  legend?: ReactNode
  children: ReactNode
  className?: string
  /** the body's height when the page is stacked (narrow screens); on a
   *  landscape dashboard the grid decides it */
  bodyHeight?: string
}) {
  return (
    <section className={`flex min-h-0 flex-col rounded-xl border border-line bg-panel-2 p-4 ${className}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h3 className={`text-[15px] font-semibold ${accent}`}>{title}</h3>
          {note && <p className="text-[13px] leading-snug text-muted">{note}</p>}
        </div>
        {legend && <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted">{legend}</div>}
      </div>
      <div className={`relative min-h-0 ${bodyHeight} xl:h-auto xl:flex-1`}>{children}</div>
    </section>
  )
}

export function Key({ swatch, children }: { swatch: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-sm ${swatch}`} />
      {children}
    </span>
  )
}

const RESULT: Record<ResultKind, { label: string; fill: string; swatch: string }> = {
  passed: { label: 'Passed', fill: 'fill-jade', swatch: 'bg-jade' },
  notYet: { label: 'Not yet', fill: 'fill-coral', swatch: 'bg-coral' },
  notStarted: { label: 'Not started', fill: 'fill-muted/30', swatch: 'bg-muted/30' },
}

export const ResultLegend = ({ kinds = ['passed', 'notYet', 'notStarted'] }: { kinds?: ResultKind[] }) => (
  <>
    {kinds.map((k) => (
      <Key key={k} swatch={RESULT[k].swatch}>
        {RESULT[k].label}
      </Key>
    ))}
  </>
)

const nameOf = (rows: Row[], id: string) => rows.find((r) => r.member.userId === id)?.member.displayName ?? ''

/** a mark that answers to the keyboard exactly as it does to the pointer */
const keyActivate = (fn: () => void) => (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    fn()
  }
}

/* ---------- 1 · results by assignment ---------- */

export interface ResultFilter {
  assignmentId: string
  kind: ResultKind
}

export function AssignmentResults({
  rows,
  breakdowns,
  focus,
  filter,
  onFilter,
}: {
  rows: Row[]
  breakdowns: AssignmentBreakdown[]
  focus: string | null
  filter: ResultFilter | null
  onFilter: (f: ResultFilter | null) => void
}) {
  const box = useBox()
  const tip = useTip()
  const { width } = box
  const n = rows.length
  const GAP = 2
  // bars share the height the card has, within reason
  const BAR = clamp(Math.floor(box.height / Math.max(1, breakdowns.length)) - 34, 18, 30)

  return (
    <Frame box={box} tip={tip}>
      <div className="space-y-3">
        {breakdowns.map((b) => {
            let x = 0
            const segs = (['passed', 'notYet', 'notStarted'] as ResultKind[])
              .map((kind) => ({ kind, ids: b[kind] }))
              .filter((s) => s.ids.length > 0)
            const room = width - GAP * (segs.length - 1)
            return (
              <div key={b.assignment.id}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="font-medium text-ink">{b.assignment.title}</span>
                  <span className="text-muted">
                    <span className="font-num text-jade">{b.passed.length}</span> of {n} passed
                  </span>
                </div>
                <svg width={width} height={BAR} role="group" aria-label={`${b.assignment.title} results`}>
                  {segs.map((s) => {
                    const w = Math.max(4, (s.ids.length / n) * room)
                    const sx = x
                    x += w + GAP
                    const on = filter?.assignmentId === b.assignment.id && filter.kind === s.kind
                    const dim =
                      (filter && !on) || (focus !== null && !s.ids.includes(focus))
                    const toggle = () => onFilter(on ? null : { assignmentId: b.assignment.id, kind: s.kind })
                    const body = (
                      <>
                        <div className="font-num text-base font-semibold">
                          {s.ids.length} of {n}
                        </div>
                        <div className="text-muted">
                          {RESULT[s.kind].label} · {b.assignment.title}
                        </div>
                        <div className="mt-1 text-[12px] text-muted">
                          {s.ids.map((id) => nameOf(rows, id)).join(', ')}
                        </div>
                        <div className="mt-1 text-[12px] text-marigold">
                          {on ? 'Click to show everyone' : 'Click to list them below'}
                        </div>
                      </>
                    )
                    return (
                      <g
                        key={s.kind}
                        tabIndex={0}
                        role="button"
                        aria-label={`${RESULT[s.kind].label}: ${s.ids.length} of ${n}`}
                        aria-pressed={on}
                        className="cursor-pointer outline-none"
                        onPointerMove={(e) => tip.at(e, body)}
                        onFocus={() => tip.atPoint(sx + w / 2, BAR + 20, body)}
                        onBlur={tip.hide}
                        onClick={toggle}
                        onKeyDown={keyActivate(toggle)}
                      >
                        <rect
                          x={sx}
                          y={0}
                          width={w}
                          height={BAR}
                          rx={4}
                          className={`${RESULT[s.kind].fill} transition-opacity ${dim ? 'opacity-30' : 'hover:opacity-85'}`}
                        />
                        {on && (
                          <rect
                            x={sx + 1}
                            y={1}
                            width={w - 2}
                            height={BAR - 2}
                            rx={3}
                            className="fill-none stroke-ink"
                            strokeWidth={2}
                          />
                        )}
                        {w > 34 && (
                          <text
                            x={sx + 10}
                            y={BAR / 2 + 5}
                            className={`pointer-events-none font-num text-[13px] font-semibold ${s.kind === 'notStarted' ? 'fill-ink' : 'fill-night'}`}
                          >
                            {s.ids.length}
                          </text>
                        )}
                      </g>
                    )
                  })}
                </svg>
              </div>
            )
          })}
      </div>
    </Frame>
  )
}

/* ---------- 2 · habits heatmap ---------- */

const HABIT_SHORT: Record<string, string> = {
  unsound_call: 'Judged by|outcome',
  concentration: 'One name,|whole book',
  noise_trade: 'Trading|the noise',
  missed_flags: 'Reading|too fast',
}

export function HabitHeatmap({ rows, focus, onFocus }: ChartProps) {
  const box = useBox()
  const tip = useTip()
  const { width } = box
  const shown = rows.filter((r) => r.member.summary)
  const max = Math.max(1, ...shown.flatMap((r) => HABITS.map((h) => r.member.summary!.mistakes[h.kind] ?? 0)))
  const NAME = Math.min(140, width * 0.3)
  const HEAD = 38
  const GAP = 2
  const CELL_H = clamp(Math.floor((box.height - HEAD) / Math.max(1, shown.length)) - GAP, 16, 30)
  const cellW = (width - NAME - GAP * (HABITS.length - 1)) / HABITS.length

  return (
    <Frame box={box} tip={tip}>
          <svg width={width} height={HEAD + shown.length * (CELL_H + GAP)} role="grid" aria-label="Habits by student">
            {HABITS.map((h, j) => (
              <text
                key={h.kind}
                x={NAME + j * (cellW + GAP) + cellW / 2}
                y={HEAD - 22}
                textAnchor="middle"
                className="fill-muted text-[11px]"
              >
                {HABIT_SHORT[h.kind].split('|').map((line, k) => (
                  <tspan key={k} x={NAME + j * (cellW + GAP) + cellW / 2} dy={k ? 14 : 0}>
                    {line}
                  </tspan>
                ))}
              </text>
            ))}
            {shown.map((r, i) => {
              const y = HEAD + i * (CELL_H + GAP)
              const id = r.member.userId
              const dim = focus !== null && focus !== id
              const pick = () => onFocus(focus === id ? null : id)
              return (
                <g
                  key={id}
                  role="row"
                  tabIndex={0}
                  aria-label={r.member.displayName}
                  className={`cursor-pointer outline-none transition-opacity ${dim ? 'opacity-30' : ''}`}
                  onClick={pick}
                  onKeyDown={keyActivate(pick)}
                >
                  <text x={0} y={y + CELL_H / 2 + 5} className={`text-[13px] ${focus === id ? 'fill-marigold font-semibold' : 'fill-ink'}`}>
                    {r.member.displayName}
                  </text>
                  {HABITS.map((h, j) => {
                    const count = r.member.summary!.mistakes[h.kind] ?? 0
                    const x = NAME + j * (cellW + GAP)
                    const body = (
                      <>
                        <div className="font-num text-base font-semibold">
                          {count} {count === 1 ? 'time' : 'times'}
                        </div>
                        <div className="text-muted">
                          {r.member.displayName} · {h.label}
                        </div>
                      </>
                    )
                    return (
                      <g key={h.kind} onPointerMove={(e) => tip.at(e, body)}>
                        <rect
                          x={x}
                          y={y}
                          width={cellW}
                          height={CELL_H}
                          rx={4}
                          className={count ? 'fill-amethyst' : 'fill-panel-3'}
                          fillOpacity={count ? 0.28 + 0.72 * (count / max) : 1}
                        />
                        <text
                          x={x + cellW / 2}
                          y={y + CELL_H / 2 + 5}
                          textAnchor="middle"
                          className={`pointer-events-none font-num text-[13px] ${count ? 'fill-ink font-semibold' : 'fill-muted/50'}`}
                        >
                          {count || '·'}
                        </text>
                      </g>
                    )
                  })}
                </g>
              )
            })}
          </svg>
    </Frame>
  )
}

export const HabitLegend = () => (
  <span className="inline-flex items-center gap-2">
    fewer
    <span className="inline-flex gap-0.5">
      {[0.3, 0.5, 0.75, 1].map((o) => (
        <span key={o} className="inline-block h-2.5 w-4 rounded-sm bg-amethyst" style={{ opacity: o }} />
      ))}
    </span>
    more
  </span>
)

/* ---------- 3 · sound vs unsound calls ---------- */

export function CallsChart({ rows, focus, onFocus }: ChartProps) {
  const box = useBox()
  const { width } = box
  const tip = useTip()
  const shown = rows
    .filter((r) => r.member.summary)
    .sort((a, b) => b.member.summary!.soundCalls - a.member.summary!.soundCalls)
  const NAME = Math.min(140, width * 0.3)
  const ROW = clamp(Math.floor((box.height - 24) / Math.max(1, shown.length)), 16, 26)
  const mid = NAME + (width - NAME) / 2
  const half = (width - NAME) / 2 - 26
  const max = Math.max(1, ...shown.flatMap((r) => [r.member.summary!.soundCalls, r.member.summary!.unsoundCalls]))

  return (
    <Frame box={box} tip={tip}>
          <svg width={width} height={24 + shown.length * ROW} role="list" aria-label="Sound and unsound calls">
            <text x={mid - 8} y={12} textAnchor="end" className="fill-coral text-[12px] font-medium">
              ← unsound
            </text>
            <text x={mid + 8} y={12} className="fill-jade text-[12px] font-medium">
              sound →
            </text>
            <line x1={mid} x2={mid} y1={20} y2={24 + shown.length * ROW} className="stroke-line" strokeWidth={1} />
            {shown.map((r, i) => {
              const s = r.member.summary!
              const y = 24 + i * ROW
              const id = r.member.userId
              const dim = focus !== null && focus !== id
              const pick = () => onFocus(focus === id ? null : id)
              const wS = (s.soundCalls / max) * half
              const wU = (s.unsoundCalls / max) * half
              const body = (
                <>
                  <div className="font-semibold">{r.member.displayName}</div>
                  <div>
                    <span className="font-num text-jade">{s.soundCalls}</span> sound ·{' '}
                    <span className="font-num text-coral">{s.unsoundCalls}</span> unsound
                  </div>
                  <div className="mt-1 text-[12px] text-muted">Judged on the reasoning at the time, not how it turned out.</div>
                </>
              )
              return (
                <g
                  key={id}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`${r.member.displayName}: ${s.soundCalls} sound, ${s.unsoundCalls} unsound`}
                  className={`cursor-pointer outline-none transition-opacity ${dim ? 'opacity-30' : ''}`}
                  onPointerMove={(e) => tip.at(e, body)}
                  onFocus={() => tip.atPoint(mid, y + ROW, body)}
                  onBlur={tip.hide}
                  onClick={pick}
                  onKeyDown={keyActivate(pick)}
                >
                  {/* the whole row is the hit target, not the 16px bar */}
                  <rect x={0} y={y} width={width} height={ROW} className="fill-transparent" />
                  <text x={0} y={y + ROW / 2 + 5} className={`text-[13px] ${focus === id ? 'fill-marigold font-semibold' : 'fill-ink'}`}>
                    {r.member.displayName}
                  </text>
                  {wU > 0 && <rect x={mid - 1 - wU} y={y + 5} width={wU} height={ROW - 10} rx={3} className="fill-coral" />}
                  {wS > 0 && <rect x={mid + 1} y={y + 5} width={wS} height={ROW - 10} rx={3} className="fill-jade" />}
                  <text x={mid - 6 - wU} y={y + ROW / 2 + 5} textAnchor="end" className="fill-muted font-num text-[12px]">
                    {s.unsoundCalls || ''}
                  </text>
                  <text x={mid + 6 + wS} y={y + ROW / 2 + 5} className="fill-muted font-num text-[12px]">
                    {s.soundCalls}
                  </text>
                </g>
              )
            })}
          </svg>
    </Frame>
  )
}

/* ---------- 4 · days played against concepts learned ---------- */

export function ProgressScatter({ rows, focus, onFocus }: ChartProps) {
  const box = useBox()
  const { width } = box
  const tip = useTip()
  const shown = rows.filter((r) => r.member.summary)
  const H = Math.max(160, box.height)
  const L = 30
  const B = 24
  const T = 12
  const R = 16
  const maxDay = Math.max(5, ...shown.map((r) => r.member.summary!.day)) + 1
  const maxC = Math.max(1, ...shown.map((r) => r.member.summary!.conceptsTotal))
  const sx = (d: number) => L + (d / maxDay) * (width - L - R)
  const sy = (c: number) => T + (1 - c / maxC) * (H - T - B)
  const dayTicks = Array.from({ length: maxDay + 1 }, (_, i) => i).filter((d) => d % 2 === 0)
  const cTicks = [0, Math.round(maxC / 2), maxC]
  // the focused dot is drawn last, so it sits on top of any neighbour
  const ordered = [...shown.filter((r) => r.member.userId !== focus), ...shown.filter((r) => r.member.userId === focus)]

  return (
    <Frame box={box} tip={tip}>
          <svg width={width} height={H} role="list" aria-label="Days played against concepts learned">
            {cTicks.map((c) => (
              <g key={c}>
                <line x1={L} x2={width - R} y1={sy(c)} y2={sy(c)} className="stroke-line" strokeWidth={1} />
                <text x={L - 8} y={sy(c) + 4} textAnchor="end" className="fill-muted font-num text-[12px]">
                  {c}
                </text>
              </g>
            ))}
            {dayTicks.map((d) => (
              <text key={d} x={sx(d)} y={H - B + 18} textAnchor="middle" className="fill-muted font-num text-[12px]">
                {d}
              </text>
            ))}
            {ordered.map((r) => {
              const s = r.member.summary!
              const id = r.member.userId
              const cx = sx(s.day)
              const cy = sy(s.conceptsLearned)
              const on = focus === id
              const dim = focus !== null && !on
              const pick = () => onFocus(on ? null : id)
              const body = (
                <>
                  <div className="font-semibold">{r.member.displayName}</div>
                  <div className="text-muted">
                    Day <span className="font-num text-ink">{s.day}</span> · Level{' '}
                    <span className="font-num text-ink">{s.level}</span>
                  </div>
                  <div className="text-muted">
                    <span className="font-num text-marigold">
                      {s.conceptsLearned} of {s.conceptsTotal}
                    </span>{' '}
                    concepts learned
                  </div>
                </>
              )
              return (
                <g
                  key={id}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`${r.member.displayName}: day ${s.day}, ${s.conceptsLearned} concepts`}
                  className={`cursor-pointer outline-none transition-opacity ${dim ? 'opacity-25' : ''}`}
                  onPointerMove={(e) => tip.at(e, body)}
                  onFocus={() => tip.atPoint(cx, cy, body)}
                  onBlur={tip.hide}
                  onClick={pick}
                  onKeyDown={keyActivate(pick)}
                >
                  {/* a 14px-radius hit area around an 6px dot */}
                  <circle cx={cx} cy={cy} r={14} className="fill-transparent" />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={on ? 8 : 6}
                    className={`fill-marigold stroke-panel-2 ${on ? 'stroke-ink' : ''}`}
                    strokeWidth={2}
                  />
                  {on && (
                    <text x={cx + 12} y={cy - 10} className="fill-ink text-[13px] font-semibold">
                      {r.member.displayName}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
    </Frame>
  )
}

/* ---------- 5 · attempts per day ---------- */

export function ActivityChart({
  rows,
  attempts,
  focus,
  now,
}: {
  rows: Row[]
  attempts: (Attempt & { userId: string })[]
  focus: string | null
  now: number
}) {
  const box = useBox()
  const { width } = box
  const tip = useTip()
  const days = activityByDay(focus ? attempts.filter((a) => a.userId === focus) : attempts, now)
  const H = Math.max(140, box.height)
  const B = 24
  const T = 8
  const L = 26
  const max = Math.max(2, ...days.map((d) => d.passed + d.notYet))
  const step = (width - L - 10) / days.length
  const bw = Math.max(6, step - 6)
  const sy = (v: number) => ((H - T - B) * v) / max
  const label = (k: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(k + 'T12:00:00').toLocaleDateString('en-IN', opts)

  return (
    <Frame box={box} tip={tip}>
          <svg width={width} height={H} role="list" aria-label="Attempts per day">
            {[0, Math.round(max / 2), max].map((v) => (
              <g key={v}>
                <line x1={L} x2={width} y1={H - B - sy(v)} y2={H - B - sy(v)} className="stroke-line" strokeWidth={1} />
                <text x={L - 6} y={H - B - sy(v) + 4} textAnchor="end" className="fill-muted font-num text-[12px]">
                  {v}
                </text>
              </g>
            ))}
            {days.map((d, i) => {
              const x = L + i * step + (step - bw) / 2
              const hp = sy(d.passed)
              const hn = sy(d.notYet)
              const body = (
                <>
                  <div className="font-semibold">{label(d.day, { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                  <div>
                    <span className="font-num text-jade">{d.passed}</span> passed ·{' '}
                    <span className="font-num text-coral">{d.notYet}</span> not yet
                  </div>
                  {focus && <div className="mt-1 text-[12px] text-muted">{nameOf(rows, focus)} only</div>}
                </>
              )
              return (
                <g
                  key={d.day}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`${d.day}: ${d.passed} passed, ${d.notYet} not yet`}
                  className="outline-none"
                  onPointerMove={(e) => tip.at(e, body)}
                  onFocus={() => tip.atPoint(x + bw / 2, H / 2, body)}
                  onBlur={tip.hide}
                >
                  {/* the whole column is the hit target, so an empty day still answers */}
                  <rect x={L + i * step} y={T} width={step} height={H - T - B} className="fill-transparent hover:fill-ink/5" />
                  {hp > 0 && <rect x={x} y={H - B - hp} width={bw} height={hp} rx={3} className="pointer-events-none fill-jade" />}
                  {hn > 0 && (
                    <rect x={x} y={H - B - hp - hn - (hp ? 2 : 0)} width={bw} height={hn} rx={3} className="pointer-events-none fill-coral" />
                  )}
                  {i % 2 === (days.length - 1) % 2 && (
                    <text x={x + bw / 2} y={H - 8} textAnchor="middle" className="pointer-events-none fill-muted font-num text-[11px]">
                      {label(d.day, { day: 'numeric', month: 'short' })}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
    </Frame>
  )
}
