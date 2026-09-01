import { useState } from 'react'
import { SkillsPanel } from '@/ui/panels/SkillsPanel'
import { LedgerPanel } from '@/ui/panels/LedgerPanel'

type Tab = 'skills' | 'ledger'

/** The Academy body: what you've practised, and the Ledger of what you know. */
export function AcademyPanel() {
  const [tab, setTab] = useState<Tab>('skills')

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <TabButton active={tab === 'skills'} onClick={() => setTab('skills')}>
          Skills
        </TabButton>
        <TabButton active={tab === 'ledger'} onClick={() => setTab('ledger')}>
          Ledger
        </TabButton>
      </div>
      {tab === 'skills' ? <SkillsPanel /> : <LedgerPanel />}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      onClick={onClick}
      className={`border-2 px-3 py-1.5 font-display text-[10px] uppercase transition-colors ${
        active ? 'border-marigold text-marigold' : 'border-line text-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}
