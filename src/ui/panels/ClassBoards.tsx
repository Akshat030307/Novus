import { board, BOARD_RULE, myStanding, type BoardKind, type BoardMember, type BoardRow } from '@/sim/leaderboard'

/**
 * Issue B9. Where a student stands among the people in their class.
 *
 * Two boards, side by side and labelled apart, because they are not the same
 * claim. The left one is work: what you passed, how accurately, and how much
 * better you got. The right one is the market, which is partly luck and says
 * so. Keeping them in one ranking would quietly tell a class that a good week
 * in the market is worth as much as learning something, and it isn't.
 *
 * Every figure here was published by the student it belongs to. Nothing on
 * this screen reads anyone's save, cash or transcript — it cannot, the
 * database only returns these six fields (docs/supabase.sql, class_board).
 */

const SHOWN = 5

export function ClassBoards({
  members,
  meId,
  hidden,
  heading = true,
}: {
  members: BoardMember[]
  meId: string
  /** the reader has taken themselves off the board */
  hidden: boolean
  /** off where the surrounding card already carries the title */
  heading?: boolean
}) {
  if (members.length === 0) {
    return (
      <p className="mt-2 text-[14px] text-muted">
        No one in this class has shared any progress yet. The board fills up as people play.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {heading && (
        <div className="text-[12px] text-amethyst font-semibold uppercase tracking-wide">
          Class leaderboard
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Board kind="learning" members={members} meId={meId} />
        <Board kind="trading" members={members} meId={meId} />
      </div>
      {hidden && (
        <p className="mt-2 text-[13px] text-marigold">
          You are hidden from these boards — your classmates cannot see your name or your figures
          on them. You can still see theirs.
        </p>
      )}
    </div>
  )
}

const TITLE: Record<BoardKind, string> = {
  learning: 'Learning',
  trading: 'Trading',
}

function Board({ kind, members, meId }: { kind: BoardKind; members: BoardMember[]; meId: string }) {
  const rows = board(kind, members, meId)
  const top = rows.slice(0, SHOWN)
  const mine = myStanding(rows, SHOWN)

  return (
    <div className="border-2 border-line bg-night p-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="font-display text-[13px] text-ink">{TITLE[kind]}</h4>
        <span className="font-num text-[12px] text-muted">{rows.length} on it</span>
      </div>

      {rows.length === 0 ? (
        <p className="mt-2 text-[13px] text-muted">
          {kind === 'learning'
            ? 'Nobody has finished a drill or a module check yet.'
            : 'Nobody has traded yet.'}
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          {top.map((r) => (
            <Line key={r.member.userId} row={r} kind={kind} />
          ))}
          {mine && (
            <>
              <li className="py-0.5 text-center text-[12px] text-muted/60">· · ·</li>
              <Line row={mine} kind={kind} />
            </>
          )}
        </ul>
      )}

      {/* the why — a student should be able to argue with the ranking */}
      <p className="mt-2 border-t-2 border-line pt-2 text-[12px] leading-relaxed text-muted">
        {BOARD_RULE[kind]}
      </p>
    </div>
  )
}

function Line({ row, kind }: { row: BoardRow; kind: BoardKind }) {
  const m = row.member
  return (
    <li
      className={`flex items-baseline justify-between gap-2 px-1 py-0.5 text-[14px] ${
        row.me ? 'bg-panel-3 text-ink' : 'text-muted'
      }`}
    >
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="w-5 shrink-0 font-num text-right text-marigold">{row.rank}</span>
        <span className={`truncate ${row.me ? 'text-ink' : ''}`}>
          {m.displayName}
          {row.me && <span className="ml-1 text-[12px] text-amethyst">you</span>}
        </span>
      </span>
      <span className="shrink-0 font-num text-[13px]">
        {kind === 'learning' ? <Learning m={m} /> : <Trading m={m} />}
      </span>
    </li>
  )
}

function Learning({ m }: { m: BoardMember }) {
  return (
    <>
      <span className="text-ink">{m.workPassed}</span>
      <span className="text-muted"> passed</span>
      {m.accuracy !== null && <span className="text-muted"> · {m.accuracy}%</span>}
      {m.improvement !== null && m.improvement > 0 && (
        <span className="text-jade"> +{m.improvement}</span>
      )}
    </>
  )
}

function Trading({ m }: { m: BoardMember }) {
  const r = m.returnPct ?? 0
  // the sign is spelled out rather than drawn: the display face has no arrows
  return (
    <span className={r > 0 ? 'text-jade' : r < 0 ? 'text-coral' : 'text-muted'}>
      {r > 0 ? '+' : ''}
      {r}%
    </span>
  )
}
