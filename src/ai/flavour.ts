import type { FinancialCase, ResolvedCase } from '@/sim/types'
import { getCached, setCached, hash } from '@/ai/cache'
import { fallbackCaseIntro, fallbackCaseExplanation } from '@/ai/fallback'

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

export function getCaseIntro(fc: FinancialCase, enabled: boolean): Promise<string> {
  const prompt =
    'Retell this loan application as a short human story — who runs it, why they ' +
    `need the money. Do not restate the figures.\n\nApplication: ${fc.brief}`
  return resolve(enabled, hash(`intro|${fc.id}`), prompt, fallbackCaseIntro({ fc }))
}

export function getCaseExplanation(
  fc: FinancialCase,
  r: ResolvedCase,
  drivers: string[],
  enabled: boolean,
): Promise<string> {
  const f = fc.figures
  const prompt =
    'Explain plainly what happened with this credit decision and why, pointing at the ' +
    'numbers that were on the file. Reward the reasoning, not the dice: a sound call ' +
    'that still went bad is still a sound call.\n\n' +
    `Figures (paise): revenue ${f.revenue}, expenses ${f.expenses}, existing debt ` +
    `${f.existingDebt}, interest paid ${f.interestPaid}, operating cash flow ${f.cashFlow}, ` +
    `credit score ${f.creditScore}, collateral ${f.collateralValue}, sector ${f.sector}.\n` +
    `Real default risk: ${Math.round(fc.truth.defaultRisk * 100)}%. ` +
    `Drivers: ${drivers.join('; ') || 'none'}.\n` +
    `Decision: ${r.choice}. Outcome: ${r.outcome}. Judgement: ${r.judgement}.`
  return resolve(
    enabled,
    hash(`explain|${fc.id}|${r.choice}|${r.outcome}|${r.judgement}`),
    prompt,
    fallbackCaseExplanation({ fc, r, drivers }),
  )
}
