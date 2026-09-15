import type { FinancialCase, ResolvedCase } from '@/sim/types'
import { getCached, setCached, hash } from '@/ai/cache'
import { fallbackCaseIntro, fallbackCaseExplanation } from '@/ai/fallback'
import { caseRisk } from '@/sim/cases'

/**
 * Step 15. The only file allowed to call a model. It takes numbers the sim has
 * already decided and asks for wording — never the other way round.
 *
 *   1. a value the model returns is never read back into the game; it is
 *      display text and only display text
 *   2. every path has written fallback text, so the whole game plays with AI off
 *   3. cache by content hash — a case is not paid for twice
 *
 * Called when a panel opens, never on the clock tick.
 *
 * SECURITY: VITE_AI_KEY here ends up in the client bundle. Fine for local play
 * with your own key; a deploy must point VITE_AI_BASE_URL at a proxy (e.g. a
 * Supabase Edge Function) that holds the key server-side.
 */

const AI_ENV_ON = import.meta.env.VITE_AI_ENABLED === 'true'
const AI_BASE = import.meta.env.VITE_AI_BASE_URL
const AI_KEY = import.meta.env.VITE_AI_KEY
const AI_MODEL = import.meta.env.VITE_AI_MODEL || 'gpt-4o-mini'

/** true only when an endpoint is actually configured; the Settings toggle
 *  matters only then */
export const aiConfigured = AI_ENV_ON && Boolean(AI_BASE && AI_KEY)

const MAX_CHARS = 600

async function callModel(prompt: string): Promise<string> {
  const res = await fetch(`${AI_BASE.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AI_KEY}` },
    body: JSON.stringify({
      model: AI_MODEL,
      temperature: 0.7,
      max_tokens: 220,
      messages: [
        {
          role: 'system',
          content:
            'You rewrite finance-game copy in plain, warm British English. Use only the ' +
            'facts given. Invent no names, numbers, dates or companies. Two or three ' +
            'sentences, no markdown, no headings.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  })
  if (!res.ok) throw new Error(`ai ${res.status}`)
  const data = await res.json()
  const text = String(data?.choices?.[0]?.message?.content ?? '').trim()
  if (!text) throw new Error('ai empty')
  return text.slice(0, MAX_CHARS)
}

/** cache -> model -> fallback. Never throws. */
async function resolve(
  enabled: boolean,
  key: string,
  prompt: string,
  fallback: string,
): Promise<string> {
  if (!aiConfigured || !enabled) return fallback
  const hit = getCached(key)
  if (hit) return hit
  try {
    const text = await callModel(prompt)
    setCached(key, text)
    return text
  } catch {
    return fallback
  }
}

const INTRO_TASK: Record<FinancialCase['kind'], string> = {
  loan: 'Retell this loan application as a short human story — who runs it, why they need the money.',
  allocation: 'Set the scene for this portfolio review in a line or two — whose money it is and what they need from it.',
  pattern: 'Set the scene for this compliance referral in a line or two — who is asking, and what they are uneasy about.',
}

/** the evidence the player actually read, in the words that kind uses */
function evidenceFor(fc: FinancialCase): string {
  switch (fc.kind) {
    case 'loan': {
      const f = fc.figures
      return (
        `Figures (paise): revenue ${f.revenue}, expenses ${f.expenses}, existing debt ` +
        `${f.existingDebt}, interest paid ${f.interestPaid}, operating cash flow ${f.cashFlow}, ` +
        `credit score ${f.creditScore}, collateral ${f.collateralValue}, sector ${f.sector}.`
      )
    }
    case 'allocation':
      return (
        'Book (paise): ' +
        fc.book.map((b) => `${b.name} ${b.sector} ${b.value}`).join('; ') +
        `.\nMandate: ${fc.mandate.join(' ')}`
      )
    case 'pattern':
      return (
        'Accounts: ' +
        fc.accounts.map((a) => `${a.label} ${a.value}`).join('; ') +
        `.\nThe lines that really did not hold: ${fc.truth.realFlags.join(', ')}.`
      )
  }
}

export function getCaseIntro(fc: FinancialCase, enabled: boolean): Promise<string> {
  const prompt = `${INTRO_TASK[fc.kind]} Do not restate the figures.\n\nFile: ${fc.brief}`
  return resolve(enabled, hash(`intro|${fc.id}`), prompt, fallbackCaseIntro({ fc }))
}

export function getCaseExplanation(
  fc: FinancialCase,
  r: ResolvedCase,
  drivers: string[],
  enabled: boolean,
): Promise<string> {
  const prompt =
    'Explain plainly what happened with this decision and why, pointing at what was ' +
    'on screen. Reward the reasoning, not the dice: a sound call that still went bad ' +
    'is still a sound call.\n\n' +
    `${evidenceFor(fc)}\n` +
    `Real risk: ${Math.round(caseRisk(fc) * 100)}%. ` +
    `Drivers: ${drivers.join('; ') || 'none'}.\n` +
    `Decision: ${r.choice}. Outcome: ${r.outcome}. Judgement: ${r.judgement}.`
  return resolve(
    enabled,
    hash(`explain|${fc.id}|${r.choice}|${r.outcome}|${r.judgement}`),
    prompt,
    fallbackCaseExplanation({ fc, r, drivers }),
  )
}
