import { useMemo } from 'react'
import { useGameStore } from '@/state/store'
import { bookSummary } from '@/sim/portfolio'
import { rupees, signedRupees } from '@/lib/format'
import { Panel } from '@/ui/components/Panel'

/**
 * Your money, on the left, without opening anything.
 *
 * The sidebar used to be two lines of quest text and a thousand pixels of
 * black. The figure that actually drives a day — what you are worth, and
 * whether today has gone well — was three clicks away in the Portfolio tab.
 *
 * All the arithmetic is `bookSummary` in sim/portfolio.ts. This file only
 * decides what to show and what colour it is.
 */
export function MoneyPanel() {
  // select the state, then derive: a selector that returns a fresh object
  // every call makes the store think something changed, forever
  const state = useGameStore((s) => s.state)
  const book = useMemo(() => bookSummary(state), [state])
  const up = book.dayChange >= 0
  const concentrated = book.biggest && book.biggest.share >= 0.4

  return (
    <Panel title="Your money" icon="₹" accent="jade" className="flex-1" bodyClassName="p-4">
      <div className="space-y-4">
        <div>
          <div className="text-[13px] text-muted">Worth today</div>
          <div className="font-num text-[26px] leading-tight font-semibold text-ink">
            {rupees(book.net)}
          </div>
          <div className={`text-[14px] font-medium ${up ? 'text-jade' : 'text-coral'}`}>
            {signedRupees(book.dayChange)} since the open
          </div>
        </div>

        <dl className="space-y-2 border-t border-line pt-3 text-[14px]">
          <Row label="Cash" value={rupees(book.cash)} />
          <Row
            label={book.positions === 1 ? 'In 1 holding' : `In ${book.positions} holdings`}
            value={rupees(book.holdingsValue)}
          />
          {book.positions > 0 && (
            <Row
              label="On paper"
              value={signedRupees(book.unrealised)}
              tone={book.unrealised >= 0 ? 'text-jade' : 'text-coral'}
            />
          )}
        </dl>

        {book.biggest && (
          <div className="border-t border-line pt-3">
            <div className="flex items-baseline justify-between gap-2 text-[14px]">
              <span className="text-muted">Biggest</span>
              <span className="truncate text-ink">{book.biggest.name}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-panel-3">
              <div
                className={`h-full rounded-full ${concentrated ? 'bg-coral' : 'bg-amethyst'}`}
                style={{ width: `${Math.round(book.biggest.share * 100)}%` }}
              />
            </div>
            <p className={`mt-1.5 text-[13px] ${concentrated ? 'text-coral' : 'text-muted'}`}>
              {Math.round(book.biggest.share * 100)}% of everything you have
              {concentrated ? '. One headline there is a bad day.' : '.'}
            </p>
          </div>
        )}

        {book.positions === 0 && (
          <p className="border-t border-line pt-3 text-[13px] text-muted">
            Nothing held yet. The Exchange opens at 9:15.
          </p>
        )}
      </div>
    </Panel>
  )
}

function Row({ label, value, tone = 'text-ink' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={`font-num ${tone}`}>{value}</dd>
    </div>
  )
}
