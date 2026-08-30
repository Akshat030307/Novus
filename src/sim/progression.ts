import type { LevelUpReport, Player, ResolvedCase, SkillName } from '@/sim/types'

/**
 * Step 11. XP, levels, ten skills, reputation — all deterministic, no rng.
 *
 * A skill is stored as a fractional practice count; its *level* for display
 * and gating is `Math.floor`. Cases and trades feed a little practice in each
 * time. Crossing a threshold opens a real option (see SKILL_UNLOCKS) and rides
 * along on the next level-up popup; the Academy panel is the full picture.
 */

/** XP to go from `level` to `level + 1` — a gentle ramp */
export function xpForLevel(level: number): number {
  return 50 + 30 * (level - 1)
}

export function skillLevel(points: number): number {
  return Math.max(0, Math.floor(points))
}

/** what each threshold opens, shown in the Academy and the level-up popup */
export const SKILL_UNLOCKS: { skill: SkillName; level: number; text: string }[] = [
  { skill: 'accounting', level: 2, text: 'Accounting 2 — debt-service cover shown before you decide' },
  { skill: 'risk', level: 2, text: 'Risk 2 — a gut-check risk read on every credit file' },
  { skill: 'analysis', level: 3, text: 'Analysis 3 — a leverage read (debt vs annual profit) up front' },
  { skill: 'trading', level: 2, text: 'Trading 2 — groundwork for exchange tools (arrives later)' },
]

export type SkillGains = Partial<Record<SkillName, number>>

export interface ProgressAward {
  xp?: number
  reputation?: number
  skills?: SkillGains
}

function nextUnlockLine(skills: Player['skills']): string | null {
  const next = SKILL_UNLOCKS.find((u) => skillLevel(skills[u.skill]) < u.level)
  if (!next) return null
  return `Next up — ${next.text.split(' — ')[0]} (${skills[next.skill].toFixed(1)} / ${next.level}).`
}

/**
 * Apply an award. Returns the new player plus one report per level crossed
 * (usually zero or one). Skill unlocks crossed in the same award attach to the
 * first report.
 */
export function awardProgress(
  player: Player,
  award: ProgressAward,
): { player: Player; levelUps: LevelUpReport[] } {
  const skills = { ...player.skills }
  const gains = award.skills ?? {}
  const crossed: string[] = []
  for (const name of Object.keys(gains) as SkillName[]) {
    const before = skillLevel(skills[name])
    skills[name] = Math.max(0, skills[name] + (gains[name] ?? 0))
    for (let lvl = before + 1; lvl <= skillLevel(skills[name]); lvl++) {
      const u = SKILL_UNLOCKS.find((x) => x.skill === name && x.level === lvl)
      if (u) crossed.push(u.text)
    }
  }

  let level = player.level
  let xp = player.xp + (award.xp ?? 0)
  let xpToNext = player.xpToNext
  const levelUps: LevelUpReport[] = []
  let attachCrossed = true

  while (xp >= xpToNext) {
    xp -= xpToNext
    level += 1
    xpToNext = xpForLevel(level)
    const lines = attachCrossed && crossed.length ? crossed.slice() : ['Your standing at the firm rises.']
    const next = nextUnlockLine(skills)
    if (next) lines.push(next)
    levelUps.push({ newLevel: level, unlocks: lines })
    attachCrossed = false
  }

  const reputation = Math.max(0, player.reputation + (award.reputation ?? 0))
  return { player: { ...player, level, xp, xpToNext, reputation, skills }, levelUps }
}

/** skill practice a case resolution earns */
export function caseSkillGains(resolved: ResolvedCase): SkillGains {
  return {
    analysis: 0.5,
    accounting: 0.5,
    risk: resolved.judgement === 'sound' ? 0.6 : 0.2,
  }
}

/** skill practice one trade earns */
export function tradeSkillGains(): SkillGains {
  return { trading: 0.15, data: 0.05 }
}

export const XP_PER_TRADE = 6
