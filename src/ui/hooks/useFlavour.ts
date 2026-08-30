import { useEffect, useState } from 'react'
import type { FinancialCase, ResolvedCase } from '@/sim/types'
import { useSettingsStore } from '@/state/settings'
import { getCaseIntro, getCaseExplanation } from '@/ai/flavour'
import { fallbackCaseIntro, fallbackCaseExplanation } from '@/ai/fallback'

/**
 * Step 15. Show the written text now, swap in the flavoured version if it
 * resolves. Never blocks a render; on any failure you keep reading the
 * fallback. `key` is the only real dependency — it captures the inputs.
 */
function useFlavourText(
  key: string,
  fallback: string,
  run: (enabled: boolean) => Promise<string>,
): string {
  const enabled = useSettingsStore((s) => s.aiWording)
  const [text, setText] = useState(fallback)

  useEffect(() => {
    setText(fallback)
    let live = true
    void run(enabled).then((t) => {
      if (live) setText(t)
    })
    return () => {
      live = false
    }
    // fallback / run are derived from `key`; re-running only on key or enabled is correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled])

  return text
}

export function useCaseIntro(fc: FinancialCase | undefined): string {
  return useFlavourText(
    fc ? `intro:${fc.id}` : 'none',
    fc ? fallbackCaseIntro({ fc }) : '',
    (enabled) => (fc ? getCaseIntro(fc, enabled) : Promise.resolve('')),
  )
}

export function useCaseExplanation(
  fc: FinancialCase,
  r: ResolvedCase,
  drivers: string[],
): string {
  return useFlavourText(
    `explain:${fc.id}:${r.choice}:${r.outcome}:${r.judgement}`,
    fallbackCaseExplanation({ fc, r, drivers }),
    (enabled) => getCaseExplanation(fc, r, drivers, enabled),
  )
}
