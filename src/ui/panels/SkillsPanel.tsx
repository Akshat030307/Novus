import type { SkillName } from '@/sim/types'
import { useGameStore } from '@/state/store'
import { skillLevel, SKILL_UNLOCKS } from '@/sim/progression'
import { StatBar } from '@/ui/components/StatBar'

/**
 * Step 11. The Academy shows where you stand: level, the ten skills with the
 * practice into each one, and which thresholds have opened something up.
 */
const SKILLS: { key: SkillName; label: string }[] = [
  { key: 'analysis', label: 'Analysis' },
  { key: 'risk', label: 'Risk' },
  { key: 'trading', label: 'Trading' },
  { key: 'accounting', label: 'Accounting' },
  { key: 'economics', label: 'Economics' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'fintech', label: 'FinTech' },
  { key: 'leadership', label: 'Leadership' },
  { key: 'data', label: 'Data' },
  { key: 'communication', label: 'Communication' },
]

export function SkillsPanel() {
  const player = useGameStore((s) => s.state.player)

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1 flex justify-between font-display text-[9px] text-muted uppercase">
          <span>Level {player.level}</span>
          <span className="font-num">
            {player.xp} / {player.xpToNext} XP
          </span>
        </div>
        <StatBar value={player.xp} max={player.xpToNext} colorClass="bg-marigold" />
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {SKILLS.map(({ key, label }) => {
          const pts = player.skills[key]
          const lvl = skillLevel(pts)
          return (
            <div key={key}>
              <div className="mb-1 flex justify-between font-display text-[9px] uppercase">
                <span className="text-ink">{label}</span>
                <span className="font-num text-muted">{lvl}</span>
              </div>
              <StatBar value={(pts - lvl) * 100} max={100} colorClass="bg-amethyst" />
            </div>
          )
        })}
      </div>

      <div>
        <div className="mb-1 font-display text-[9px] text-muted uppercase">What skills open up</div>
        <ul className="space-y-1 text-xs">
          {SKILL_UNLOCKS.map((u) => {
            const has = skillLevel(player.skills[u.skill]) >= u.level
            return (
              <li key={u.text} className={`flex gap-2 ${has ? 'text-jade' : 'text-muted'}`}>
                <span>{has ? '▪' : '▫'}</span>
                {u.text}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
