import { useMemo } from 'react'
import {
  HABITS,
  resultOf,
  weakAreas,
  type Assignment,
  type NewAssignment,
  type Row,
} from '@/sim/cohort'
import { readingBuiltAt, recommendFor } from '@/sim/recommend'
import { percent, progressOn, type Attempt } from '@/sim/attempts'
import { board, type BoardMember } from '@/sim/leaderboard'

/**
 * One student, on a page of their own.
 *
 * This replaced a drawer. A drawer is right for a glance and wrong for the
 * conversation this page is actually for — a teacher reading one person
 * properly, deciding what to do about them, and often printing it. The
 * picker is at the top for the same reason: going through a class one student
 * at a time is the normal way to use it, not an exception.
 *
 * Every claim here carries its evidence. "Weak on collateral cover" is an
 * accusation; "four of her six wrong calls were collateral cover, the last on
 * Tuesday" is something the student can argue with, which is the only kind of
 * feedback worth giving.
 */
export function StudentReport({
  rows,
  selected,
  onSelect,
  assignments,
  attempts,
  onAssign,
}: {
  rows: Row[]
  selected: string | null
  onSelect: (userId: string | null) => void
  assignments: Assignment[]
  attempts: (Attempt & { userId: string })[]
  /** present where this board may be written to */
  onAssign?: (a: NewAssignment) => void
}) {
  const row = rows.find((r) => r.member.userId === selected) ?? rows[0] ?? null
  const index = row ? rows.findIndex((r) => r.member.userId === row.member.userId) : -1

  const mine = useMemo(
    () =>
      row
        ? attempts
            .filter((a) => a.userId === row.member.userId)
            .sort((a, b) => (a.at < b.at ? 1 : -1))
        : [],
    [attempts, row],
  )
  const weak = useMemo(
    () => (row ? weakAreas(row, assignments, attempts) : []),
    [row, assignments, attempts],
  )

  // where they stand on the two boards their classmates can see
  const standing = useMemo(() => {
    const members: BoardMember[] = rows
      .filter((r) => r.member.summary)
      .map((r) => ({
        userId: r.member.userId,
        displayName: r.member.displayName,
        workPassed: r.member.summary!.workPassed ?? r.passed,
        accuracy: r.member.summary!.accuracy ?? null,
        improvement: r.member.summary!.improvement ?? null,
        returnPct: r.member.summary!.returnPct ?? null,
        day: r.member.summary!.day,
      }))
    const place = (kind: 'learning' | 'trading') => {
      const list = board(kind, members)
      const at = list.findIndex((b) => b.member.userId === row?.member.userId)
      return at === -1 ? null : { rank: list[at].rank, of: list.length }
    }
    return { learning: place('learning'), trading: place('trading') }
  }, [rows, row])

  if (!row) {
    return <p className="text-muted">Nobody has joined this class yet.</p>
  }

  const pick = recommendFor(weak, assignments, row.member.userId)

  const s = row.member.summary
  const step = (by: -1 | 1) => {
    const next = rows[(index + by + rows.length) % rows.length]
    onSelect(next.member.userId)
  }

  return (
    <section className="flex flex-col gap-4 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
      {/* the picker. A select rather than a list: a class of sixty is normal
          and sixty names down the side of a page is not. */}
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <label className="flex items-center gap-2 text-sm text-muted">
          Student
          <select
            value={row.member.userId}
            onChange={(e) => onSelect(e.target.value)}
            className="rounded-md border border-line bg-panel px-3 py-2 text-[15px] text-ink focus:border-marigold focus:outline-none"
          >
            {rows.map((r) => (
              <option key={r.member.userId} value={r.member.userId}>
                {r.member.displayName}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-1">
          <Step onClick={() => step(-1)} label="Previous student">
            Previous
          </Step>
          <Step onClick={() => step(1)} label="Next student">
            Next
          </Step>
        </div>
        <span className="font-num text-sm text-muted">
          {index + 1} of {rows.length}
        </span>
        <button
          onClick={() => window.print()}
          className="ml-auto rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:text-ink"
        >
          Print this page
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-ink">{row.member.displayName}</h2>
            <p className="mt-1 text-[15px] text-muted">
              {s
                ? `Day ${s.day} in the game · Level ${s.level} · joined ${new Date(
                    row.member.joinedAt,
                  ).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                : 'Has not shared any progress yet. They joined, but have not opened the Class tab since.'}
            </p>
            {(standing.learning || standing.trading) && (
              <p className="mt-1 text-[14px] text-muted">
                On the boards their class can see:{' '}
                {standing.learning && (
                  <span className="text-ink">
                    <span className="font-num text-marigold">
                      {standing.learning.rank}
                    </span>{' '}
                    of {standing.learning.of} on learning
                  </span>
                )}
                {standing.learning && standing.trading && ' · '}
                {standing.trading && (
                  <span className="text-ink">
                    <span className="font-num text-marigold">{standing.trading.rank}</span> of{' '}
                    {standing.trading.of} on trading
                  </span>
                )}
                . The two disagreeing is normal, and usually worth a word.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Figure label="Work passed" value={`${row.passed}/${assignments.length}`} />
            <Figure label="Attempted" value={`${row.done}/${assignments.length}`} />
            {s && <Figure label="Sound calls" value={String(s.soundCalls)} tone="text-jade" />}
            {s && <Figure label="Unsound calls" value={String(s.unsoundCalls)} tone="text-coral" />}
          </div>

          <Card title="What to work on with them" accent="text-amethyst">
            {weak.length === 0 ? (
              <p className="text-sm text-muted">
                Nothing is going wrong that the game has logged. Everything attempted has been
                passed and no habit has come up: worth setting something harder.
              </p>
            ) : (
              <ol className="space-y-3">
                {weak.map((w) => (
                  <li key={w.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold text-ink">{w.label}</span>
                      <span className="shrink-0 font-num text-[13px] text-amethyst">×{w.seen}</span>
                    </div>
                    {/* the why, always */}
                    <p className="mt-0.5 text-[13px] leading-snug text-muted">{w.why}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {pick && (
            <Card title="What to set them next" accent="text-marigold">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <span className="text-[17px] font-semibold text-ink">{pick.title}</span>
                {onAssign ? (
                  <button
                    onClick={() =>
                      onAssign({
                        kind: 'drill',
                        refId: pick.refId,
                        title: pick.title,
                        dueAt: null,
                        forUser: row.member.userId,
                      })
                    }
                    className="rounded-md border border-marigold bg-marigold px-3 py-1.5 text-sm font-semibold text-night hover:bg-marigold/90"
                  >
                    Set it for {row.member.displayName.split(' ')[0]}
                  </button>
                ) : (
                  <span className="text-sm text-muted">Set it from the Work set tab.</span>
                )}
              </div>

              {/* the why. A recommendation nobody can argue with is an order. */}
              <p className="mt-2 text-[14px] leading-relaxed text-muted">
                <span className="text-amethyst">Why: </span>
                {pick.why}
              </p>

              {pick.reading.length > 0 && (
                <div className="mt-3 border-t border-line pt-3">
                  <div className="text-[12px] font-semibold tracking-wide text-muted uppercase">
                    The same mistake, in the news
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {pick.reading.map((r) => (
                      <li key={r.url} className="text-[14px]">
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-amethyst underline hover:text-marigold"
                        >
                          {r.title}
                        </a>
                        <span className="text-muted">
                          {' '}
                          · {r.site}
                          {r.at && ` · ${r.at}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[12px] text-muted">
                    Found by TinyFish{readingBuiltAt() ? ` on ${readingBuiltAt()!.slice(0, 10)}` : ''},
                    for you rather than for the game: the market your students trade stays
                    invented. The exercise above was chosen by the rule, not by a model.
                  </p>
                </div>
              )}
            </Card>
          )}

          <Card title="Set work" accent="text-jade">
            {assignments.length === 0 ? (
              <p className="text-sm text-muted">No work set for this class yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {assignments.map((a, i) => {
                  const cell = row.cells[i]
                  const kind = resultOf(cell)
                  const prog = progressOn(mine, a.refId)
                  return (
                    <li key={a.id} className="flex items-baseline justify-between gap-3 py-2">
                      <span className="min-w-0">
                        <span className="text-ink">{a.title}</span>
                        {a.optional && <span className="ml-2 text-xs text-muted">optional</span>}
                        {prog && (
                          <span className="ml-2 text-[13px] text-muted">
                            {prog.gained > 0
                              ? `up ${prog.gained} points across ${prog.tries} tries`
                              : prog.gained < 0
                                ? `down ${Math.abs(prog.gained)} points across ${prog.tries} tries`
                                : `no change across ${prog.tries} tries`}
                          </span>
                        )}
                      </span>
                      <span
                        className={`shrink-0 text-right text-sm ${
                          kind === 'passed'
                            ? 'text-jade'
                            : kind === 'notYet'
                              ? 'text-coral'
                              : 'text-muted'
                        }`}
                      >
                        {kind === 'passed'
                          ? 'Passed'
                          : kind === 'notYet'
                            ? 'Not yet'
                            : kind === 'notTheirs'
                              ? 'Not set for them'
                              : 'Not started'}
                        {cell.best && (
                          <span className="font-num">
                            {' '}
                            {cell.best.score}/{cell.best.outOf}
                          </span>
                        )}
                        {cell.late && <span className="block text-xs text-marigold">late</span>}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card title="Habits the game logged" accent="text-amethyst">
            {!s ? (
              <p className="text-sm text-muted">Nothing shared.</p>
            ) : HABITS.every((h) => !(s.mistakes[h.kind] ?? 0)) ? (
              <p className="text-sm text-muted">Nothing logged against them.</p>
            ) : (
              <ul className="space-y-2">
                {HABITS.filter((h) => (s.mistakes[h.kind] ?? 0) > 0).map((h) => (
                  <li key={h.kind} className="flex items-baseline justify-between gap-3 text-[15px]">
                    <span className="text-ink">{h.label}</span>
                    <span className="font-num text-amethyst">×{s.mistakes[h.kind]}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title={`Every attempt${mine.length ? ` · ${mine.length}` : ''}`}
            accent="text-ink"
            note="Kept in full, including the ones that went badly: a best score alone cannot show whether somebody improved."
          >
            {mine.length === 0 ? (
              <p className="text-sm text-muted">Nothing attempted yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {mine.map((a) => {
                  const title = assignments.find((x) => x.refId === a.refId)?.title ?? a.refId
                  return (
                    <li key={a.id} className="flex items-baseline justify-between gap-3 py-2">
                      <span className="min-w-0 truncate">
                        <span className="text-ink">{title}</span>
                        <span className="ml-2 text-xs text-muted">
                          {new Date(a.at).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 font-num text-sm ${a.passed ? 'text-jade' : 'text-coral'}`}
                      >
                        {a.score}/{a.outOf} · {percent(a)}%
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </section>
  )
}

function Step({ onClick, label, children }: { onClick: () => void; label: string; children: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:text-ink"
    >
      {children}
    </button>
  )
}

function Figure({ label, value, tone = 'text-ink' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel-2 px-4 py-3">
      <div className="text-sm text-muted">{label}</div>
      <div className={`mt-0.5 font-num text-xl font-semibold ${tone}`}>{value}</div>
    </div>
  )
}

function Card({
  title,
  accent,
  note,
  children,
}: {
  title: string
  accent: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-line bg-panel-2 p-4">
      <h3 className={`text-[13px] font-semibold tracking-wide uppercase ${accent}`}>{title}</h3>
      {note && <p className="mt-0.5 text-[12px] text-muted">{note}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}
