import { useState } from 'react'
import { SkillsPanel } from '@/ui/panels/SkillsPanel'
import { LedgerPanel } from '@/ui/panels/LedgerPanel'
import { MistakesPanel } from '@/ui/panels/MistakesPanel'
import { ModulesPanel } from '@/ui/panels/ModulesPanel'
import { TranscriptPanel } from '@/ui/panels/TranscriptPanel'

type Tab = 'skills' | 'ledger' | 'modules' | 'mistakes' | 'report'

/** The Academy body: skills practised, the Ledger, the course modules, the slip log. */
export function AcademyPanel() {
  const [tab, setTab] = useState<Tab>('skills')

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <TabButton active={tab === 'skills'} onClick={() => setTab('skills')}>
          Skills
        </TabButton>
        <TabButton active={tab === 'ledger'} onClick={() => setTab('ledger')}>
          Ledger
        </TabButton>
        <TabButton active={tab === 'modules'} onClick={() => setTab('modules')}>
          Modules
        </TabButton>
        <TabButton active={tab === 'mistakes'} onClick={() => setTab('mistakes')}>
          Mistakes
        </TabButton>
        <TabButton active={tab === 'report'} onClick={() => setTab('report')}>
          Report
        </TabButton>
      </div>
      {tab === 'skills' && <SkillsPanel />}
      {tab === 'ledger' && <LedgerPanel />}
      {tab === 'modules' && <ModulesPanel />}
      {tab === 'mistakes' && <MistakesPanel />}
      {tab === 'report' && <TranscriptPanel />}
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
