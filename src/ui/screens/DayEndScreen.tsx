import { useEffect, type ReactNode } from 'react'
import type { DayEndReport } from '@/sim/types'
import { rupees } from '@/lib/format'
import { playSound } from '@/lib/sound'
import { PixelButton } from '@/ui/components/PixelButton'

/**
 * Shown when the market closes at 3:30pm. Reads the day back in the order you
 * care about it: the number on the day first, then where the money went, then
 * what it did to your standing. Sections fade in one after another so it lands
 * as a read, not a data dump. Fed the real report by GameScreen.
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
  const money = (n: number) => `${n < 0 ? '-' : '+'}${rupees(Math.abs(n))}`

  const verdict =
    dayPnL > 0 ? 'Up on the day.' : dayPnL < 0 ? 'Down on the day.' : 'Flat on the day.'

  useEffect(() => {
    playSound('dayEnd')
  }, [])

  return (
    <div className="anim-backdrop fixed inset-0 z-50 flex items-center justify-center bg-night/85 p-6">
      <div className="anim-pop w-full max-w-lg border-2 border-line bg-panel">
        <header className="border-b-2 border-line px-5 py-3">
          <h2 className="font-display text-sm text-ink">Day {report.day} — closed</h2>
          <p className="font-display text-[9px] text-muted uppercase">Market shut at 3:30 pm</p>
        </header>

        <div className="space-y-5 p-5">
          <div className="anim-rise" style={{ animationDelay: '0ms' }}>
            <div className="font-display text-[9px] text-muted uppercase">P&amp;L on the day</div>
            <div className={`font-num text-3xl ${gainLoss(dayPnL)}`}>{money(dayPnL)}</div>
            <p className="mt-1 text-sm text-muted">{verdict}</p>
          </div>

          {report.lesson && (
            <div
              className="anim-rise border-l-2 border-amethyst bg-panel-3 py-2 pl-3 pr-2"
              style={{ animationDelay: '40ms' }}
            >
              <div className="font-display text-[9px] text-amethyst uppercase">Worth noting</div>
              <p className="mt-0.5 text-sm text-ink">{report.lesson}</p>
            </div>
          )}

          <Section title="Money" delay={80}>
            <Figure label="Cash at open" value={rupees(report.cashOpen)} />
            <Figure label="Cash at close" value={rupees(report.cashClose)} />
            <Figure label="Cash change" value={money(net)} tone={gainLoss(net)} />
          </Section>

          <Section title="Trading" delay={160}>
            <Figure
              label="Booked"
              value={money(report.realisedPnL)}
              tone={gainLoss(report.realisedPnL)}
            />
            <Figure
              label="On open positions"
              value={money(report.unrealisedPnL)}
              tone={gainLoss(report.unrealisedPnL)}
            />
            <Figure label="Trades" value={String(report.tradeCount)} />
          </Section>

          <Section title="Standing" delay={240}>
            <Figure label="XP" value={`+${report.xpGained}`} tone="text-marigold" />
            <Figure label="Reputation" value={rep} tone={gainLoss(report.reputationChange)} />
          </Section>

          {report.questsCompleted.length > 0 && (
            <div className="anim-rise border-t-2 border-line pt-4" style={{ animationDelay: '320ms' }}>
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
            <div className="anim-rise border-t-2 border-line pt-4" style={{ animationDelay: '400ms' }}>
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

function Section({
  title,
  delay,
  children,
}: {
  title: string
  delay: number
  children: ReactNode
}) {
  return (
    <div className="anim-rise border-t-2 border-line pt-4" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-2 font-display text-[9px] text-muted uppercase">{title}</div>
      <div className="grid grid-cols-3 gap-3">{children}</div>
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
