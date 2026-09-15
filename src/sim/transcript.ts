import type { GameState } from '@/sim/types'
import type { Attempt } from '@/sim/attempts'
import { attemptsFor, bestAttempt, progressOn } from '@/sim/attempts'
import { CONCEPTS, getConcept } from '@/data/concepts'
import { MODULES } from '@/data/modules'
import { SCENARIOS } from '@/data/scenarios'
import { getCase } from '@/data/cases'
import { moduleProgress } from '@/sim/modules'
import { assess, type Certificate } from '@/sim/certificates'

/**
 * Issue B1. The report card, as a document rather than a string.
 *
 * Everything here is resolved: labels, titles and sentences, never ids. A
 * transcript issued today has to still read correctly in two years, after the
 * module list has been rewritten and half the cases replaced. If the document
 * pointed at content it would quietly rot, and a verification code on a
 * document that rots is worse than no code at all.
 *
 * That is also why `v` is stamped on every one. A reader must be able to tell
 * which version of this shape it is looking at without guessing.
 */
export const TRANSCRIPT_VERSION = 1

/**
 * Pull a verification code out of an address. `/t/<code>` is the shareable
 * form; `?t=<code>` is the fallback for a host with no SPA rewrite. Pure
 * string work on purpose — this decides whether the whole app renders as a
 * public document instead of a game, and that is worth being able to test.
 */
export function codeFromLocation(search: string, pathname: string): string | null {
  const fromQuery = new URLSearchParams(search).get('t')
  if (fromQuery) return fromQuery.trim().toUpperCase() || null
  const match = pathname.match(/^\/t\/([^/]+)\/?$/)
  if (!match) return null
  try {
    return decodeURIComponent(match[1]).trim().toUpperCase() || null
  } catch {
    return null // a malformed escape in the URL is just not a code
  }
}

export interface TranscriptLine {
  label: string
  /** the figure as it should be read, already formatted */
  value: string
  /** true where the thing was cleared, false where it was not, absent where neither applies */
  passed?: boolean
  /** a second line under it, for context */
  note?: string
}

export interface TranscriptSection {
  title: string
  /** one sentence a reader who has never seen the game can understand */
  summary: string
  lines: TranscriptLine[]
}

export type DocKind = 'transcript' | 'certificate'

export interface TranscriptDoc {
  v: number
  /**
   * What this document claims. A transcript is "here is everything this player
   * did"; a certificate is the narrower "this player cleared a named,
   * published bar" (issue B8). Absent on documents issued before B8, which are
   * all transcripts.
   */
  docKind?: DocKind
  /** certificates only: what was awarded, and what it does and does not mean */
  award?: { title: string; blurb: string; scope: string }
  player: string
  level: number
  /** days played in the career run */
  day: number
  /** the headline figures, for the top of the page */
  headline: TranscriptLine[]
  sections: TranscriptSection[]
}

const pct = (n: number) => `${Math.round(n * 100)}%`

export function buildTranscript(state: GameState, attempts: Attempt[]): TranscriptDoc {
  const resolved = state.cases.resolved
  const sound = resolved.filter((r) => r.judgement === 'sound').length
  const withPrediction = resolved.filter((r) => r.prediction)
  const readsRight = withPrediction.filter((r) => r.predictionRight).length
  const modulesPassed = MODULES.filter((m) => moduleProgress(state, m.id).passed).length

  return {
    v: TRANSCRIPT_VERSION,
    player: state.player.name,
    level: state.player.level,
    day: state.clock.day,
    headline: [
      { label: 'Days on the desk', value: String(state.clock.day) },
      { label: 'Concepts learned', value: `${state.learned.length}/${CONCEPTS.length}` },
      { label: 'Modules passed', value: `${modulesPassed}/${MODULES.length}` },
      { label: 'Practice attempts', value: String(attempts.length) },
    ],
    sections: [
      conceptSection(state),
      caseSection(state, resolved.length, sound, readsRight, withPrediction.length),
      moduleSection(state, attempts),
      drillSection(attempts),
      mistakeSection(state),
    ],
  }
}

function conceptSection(state: GameState): TranscriptSection {
  return {
    title: 'Concepts',
    summary:
      'Ideas unlocked by meeting them in play — each one was explained at the moment it first mattered, not in advance.',
    lines:
      state.learned.length === 0
        ? [{ label: 'Nothing unlocked yet', value: '—' }]
        : state.learned.map((id) => ({
            label: getConcept(id)?.label ?? 'A concept no longer in the Ledger',
            value: 'learned',
          })),
  }
}

function caseSection(
  state: GameState,
  total: number,
  sound: number,
  readsRight: number,
  reads: number,
): TranscriptSection {
  const byRep = [...state.cases.resolved].sort((a, b) => b.reputationChange - a.reputationChange)
  const best = byRep[0]
  const worst = byRep[byRep.length - 1]
  // never fall back to the id. A transcript is read by someone outside the
  // project, and a stored one must survive its case files being renamed or
  // retired — a kebab-case slug on the page would be both unreadable and a
  // dangling pointer
  const title = (id: string) => getCase(id)?.title ?? 'A file no longer in the library'

  const lines: TranscriptLine[] = [
    {
      label: 'Files decided',
      value: String(total),
      note: total ? `${sound} sound, ${total - sound} unsound` : undefined,
    },
  ]
  if (reads > 0) {
    lines.push({
      label: 'Risk reads committed before deciding',
      value: `${readsRight}/${reads} right`,
      // strictly better than a coin toss — half right is not a pass
      passed: readsRight * 2 > reads,
    })
  }
  if (best && best.reputationChange > 0) {
    lines.push({
      label: 'Best call',
      value: title(best.caseId),
      note: `${best.judgement}, ${best.outcome === 'good' ? 'paid off' : 'went bad but was defensible'}`,
    })
  }
  if (worst && worst.reputationChange < 0) {
    lines.push({ label: 'Worst call', value: title(worst.caseId), note: worst.judgement })
  }

  return {
    title: 'Credit decisions',
    summary:
      'Judgement is scored on the reasoning, not the outcome — a sound call that went badly still counts as sound.',
    lines,
  }
}

function moduleSection(state: GameState, attempts: Attempt[]): TranscriptSection {
  return {
    title: 'Course modules',
    summary: 'Each module ends with a short check. 60% clears it, and it can be retaken freely.',
    lines: MODULES.map((m) => {
      const p = moduleProgress(state, m.id)
      const tries = attemptsFor(attempts, m.id).length
      return {
        label: m.title,
        value: p.score !== undefined ? pct(p.score) : p.started ? 'in progress' : 'not started',
        passed: p.started ? p.passed : undefined,
        note: tries > 1 ? `${tries} attempts` : undefined,
      }
    }),
  }
}

/**
 * The part an instructor actually reads. A best score alone cannot tell you
 * whether someone understood the thing or got lucky on the third go, so where
 * there is more than one attempt the transcript prints the first and the
 * latest side by side and lets the reader draw their own conclusion.
 */
function drillSection(attempts: Attempt[]): TranscriptSection {
  const lines: TranscriptLine[] = SCENARIOS.map((s) => {
    const best = bestAttempt(attempts, s.id)
    if (!best) return { label: s.title, value: 'not attempted' }
    const prog = progressOn(attempts, s.id)
    return {
      label: s.title,
      value: `best ${best.score}/${best.outOf}`,
      passed: best.passed,
      note: prog
        ? `${prog.tries} attempts — first ${prog.first.score}/${prog.first.outOf}, latest ${prog.latest.score}/${prog.latest.outOf} (${prog.gained >= 0 ? '+' : ''}${prog.gained} pts)`
        : 'one attempt',
    }
  })

  return {
    title: 'Practice drills',
    summary:
      'Repeatable exercises, taken outside the career run. Every attempt is kept, including the bad ones.',
    lines,
  }
}

function mistakeSection(state: GameState): TranscriptSection {
  const kinds: Record<string, string> = {
    unsound_call: 'Decisions the figures did not support',
    concentration: 'Too much of the book in one name',
    noise_trade: 'Trading on movement that meant nothing',
  }
  const counts = new Map<string, number>()
  for (const m of state.mistakes) counts.set(m.kind, (counts.get(m.kind) ?? 0) + 1)

  return {
    title: 'Patterns the game noticed',
    summary:
      'Logged automatically at the close of each day. This is the section worth teaching from — it says what to work on, not what went wrong once.',
    lines:
      state.mistakes.length === 0
        ? [{ label: 'Nothing recurring', value: '—' }]
        : [...counts].map(([kind, n]) => ({
            label: kinds[kind] ?? kind,
            value: `${n} time${n === 1 ? '' : 's'}`,
          })),
  }
}

/**
 * Issue B8. The same machinery, narrowed to one award.
 *
 * The requirements go into the document as they stood when it was issued,
 * each with the figure that met it. A certificate that only said "awarded" is
 * worth nothing to the person reading it — what they need is the bar and the
 * evidence against it, on the same page, in words they can check.
 */
export function buildCertificate(
  cert: Certificate,
  state: GameState,
  attempts: Attempt[],
): TranscriptDoc {
  const { requirements } = assess(cert, state, attempts)
  return {
    v: TRANSCRIPT_VERSION,
    docKind: 'certificate',
    award: { title: cert.title, blurb: cert.blurb, scope: cert.scope },
    player: state.player.name,
    level: state.player.level,
    day: state.clock.day,
    headline: [
      { label: 'Awarded to', value: state.player.name },
      { label: 'Requirements met', value: `${requirements.filter((r) => r.met).length}/${requirements.length}` },
      { label: 'Days on the desk', value: String(state.clock.day) },
      { label: 'Practice attempts', value: String(attempts.length) },
    ],
    sections: [
      {
        title: 'What was required',
        summary:
          'Every one of these was published before it was met, and every one was measured rather than awarded.',
        lines: requirements.map((r) => ({
          label: r.label,
          value: `${r.got}/${r.need}`,
          passed: r.met,
        })),
      },
      {
        title: 'What this says, and what it does not',
        summary: cert.scope,
        lines: [{ label: cert.title, value: 'awarded' }],
      },
    ],
  }
}

/** the same document as plain text, for the clipboard */
export function transcriptText(
  doc: TranscriptDoc,
  issued?: { code: string; at: string; url: string },
): string {
  const out: string[] = doc.award
    ? [`NOVUS — ${doc.award.title}`, `Awarded to ${doc.player} · Day ${doc.day}`]
    : ['NOVUS — report card', `${doc.player} · Finance Intern · Level ${doc.level} · Day ${doc.day}`]
  if (issued) {
    out.push(`Verification code: ${issued.code}`)
    out.push(`Issued: ${new Date(issued.at).toUTCString()}`)
  }
  out.push('')

  for (const h of doc.headline) out.push(`${h.label}: ${h.value}`)

  for (const section of doc.sections) {
    out.push('', section.title.toUpperCase(), `  ${section.summary}`)
    for (const line of section.lines) {
      const mark = line.passed === undefined ? ' ' : line.passed ? '+' : '-'
      out.push(`  ${mark} ${line.label}: ${line.value}`)
      if (line.note) out.push(`      ${line.note}`)
    }
  }

  if (issued) {
    out.push(
      '',
      `Anyone can check this at ${issued.url}`,
      'The code proves this report came out of the game and has not been edited',
      'since it was issued. It does not vouch for how the run was played.',
    )
  }
  return out.join('\n')
}
