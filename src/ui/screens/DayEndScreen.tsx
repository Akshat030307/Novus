import type { DayEndReport } from '@/sim/types'
import { rupees } from '@/lib/format'
import { PixelButton } from '@/ui/components/PixelButton'

/**
 * Shown when the market closes at 3:30pm. Fed a fake report for now; step 7
 * wires the real one from sim/clock.ts and fires this for real.
 */
export function DayEndScreen({
  report,
  onClose,
}: {
  report: DayEndReport
  onClose: () => void
}) {
  const net = report.cashClose - report.cashOpen
  const dayPnL = report.realisedPnL + report.unrealisedPnL
  const rep = `${report.reputationChange >= 0 ? '+' : ''}${report.reputationChange}`
  const gainLoss = (n: number) => (n >= 0 ? 'text-jade' : 'text-coral')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/85 p-6">
      <div className="w-full max-w-lg border-2 border-line bg-panel">
        <header className="border-b-2 border-line px-5 py-3">
          <h2 className="font-display text-sm text-ink">Day {report.day} — closed</h2>
          <p className="font-display text-[9px] text-muted uppercase">Market shut at 3:30 pm</p>
        </header>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <Figure label="Cash at open" value={rupees(report.cashOpen)} />
            <Figure label="Cash at close" value={rupees(report.cashClose)} />
            <Figure label="Cash change" value={rupees(net)} tone={gainLoss(net)} />
            <Figure label="P&L on the day" value={rupees(dayPnL)} tone={gainLoss(dayPnL)} />
          </div>

          <div className="grid grid-cols-2 gap-3 border-t-2 border-line pt-4">
            <Figure label="Booked" value={rupees(report.realisedPnL)} tone={gainLoss(report.realisedPnL)} />
            <Figure
              label="On open positions"
              value={rupees(report.unrealisedPnL)}
              tone={gainLoss(report.unrealisedPnL)}
            />
            <Figure label="Trades" value={String(report.tradeCount)} />
            <Figure label="XP" value={`+${report.xpGained}`} tone="text-marigold" />
            <Figure label="Reputation" value={rep} tone={gainLoss(report.reputationChange)} />
          </div>

          {report.questsCompleted.length > 0 && (
            <div className="border-t-2 border-line pt-4">
              <div className="mb-1 font-display text-[9px] text-muted uppercase">Finished today</div>
              <ul className="space-y-1 text-sm text-ink">
                {report.questsCompleted.map((q) => (
                  <li key={q} className="flex gap-2">
                    <span className="text-jade">▪</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.tomorrowHeadline && (
            <div className="border-t-2 border-line pt-4">
              <div className="mb-1 font-display text-[9px] text-muted uppercase">Tomorrow</div>
              <p className="text-sm text-ink">{report.tomorrowHeadline}</p>
            </div>
          )}
        </div>

        <footer className="flex justify-end border-t-2 border-line px-5 py-3">
          <PixelButton tone="primary" onClick={onClose}>
            Start day {report.day + 1}
          </PixelButton>
        </footer>
      </div>
    </div>
  )
}

function Figure({
  label,
  value,
  tone = 'text-ink',
}: {
  label: string
  value: string
  tone?: string
}) {
  return (
    <div className="border-2 border-line bg-night px-3 py-2">
      <div className="font-display text-[9px] text-muted uppercase">{label}</div>
      <div className={`font-num text-sm ${tone}`}>{value}</div>
    </div>
  )
}
