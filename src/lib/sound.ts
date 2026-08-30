import { useSettingsStore } from '@/state/settings'

/**
 * Step 16. Interface cues, synthesised on the fly with Web Audio — no asset
 * files to ship or license, and the blippy tone suits the pixel look. Every
 * call is gated on the `sound` setting and wrapped so a missing or unhappy
 * AudioContext is a silent no-op, never a crash.
 *
 * This is `lib/`, not `sim/` — it makes noise, it decides nothing. Nothing on
 * the market tick path calls it.
 */

type Part = {
  /** hertz */
  freq: number
  /** seconds from the start of the cue */
  at: number
  /** seconds */
  dur: number
  type?: OscillatorType
  /** peak gain for this part, before the master trim */
  peak?: number
}

export type SoundName =
  | 'click'
  | 'tab'
  | 'enterBuilding'
  | 'dialogue'
  | 'tradeOk'
  | 'tradeFail'
  | 'caseGood'
  | 'caseBad'
  | 'levelUp'
  | 'dayEnd'
  | 'notify'

const MASTER = 0.16

const CUES: Record<SoundName, Part[]> = {
  click: [{ freq: 420, at: 0, dur: 0.05, type: 'square', peak: 0.5 }],
  tab: [{ freq: 640, at: 0, dur: 0.04, type: 'square', peak: 0.45 }],
  enterBuilding: [
    { freq: 320, at: 0, dur: 0.09, type: 'triangle' },
    { freq: 480, at: 0.07, dur: 0.11, type: 'triangle' },
  ],
  dialogue: [{ freq: 520, at: 0, dur: 0.06, type: 'sine', peak: 0.7 }],
  tradeOk: [
    { freq: 587, at: 0, dur: 0.07, type: 'square', peak: 0.45 },
    { freq: 784, at: 0.06, dur: 0.09, type: 'square', peak: 0.45 },
  ],
  tradeFail: [
    { freq: 240, at: 0, dur: 0.1, type: 'sawtooth', peak: 0.4 },
    { freq: 170, at: 0.09, dur: 0.14, type: 'sawtooth', peak: 0.4 },
  ],
  caseGood: [
    { freq: 523, at: 0, dur: 0.08, type: 'triangle' },
    { freq: 659, at: 0.08, dur: 0.08, type: 'triangle' },
    { freq: 784, at: 0.16, dur: 0.12, type: 'triangle' },
  ],
  caseBad: [
    { freq: 330, at: 0, dur: 0.12, type: 'sawtooth', peak: 0.4 },
    { freq: 247, at: 0.12, dur: 0.16, type: 'sawtooth', peak: 0.4 },
  ],
  levelUp: [
    { freq: 523, at: 0, dur: 0.09, type: 'square', peak: 0.4 },
    { freq: 659, at: 0.09, dur: 0.09, type: 'square', peak: 0.4 },
    { freq: 784, at: 0.18, dur: 0.09, type: 'square', peak: 0.4 },
    { freq: 1047, at: 0.27, dur: 0.16, type: 'square', peak: 0.4 },
  ],
  dayEnd: [
    { freq: 392, at: 0, dur: 0.16, type: 'sine', peak: 0.7 },
    { freq: 523, at: 0.14, dur: 0.22, type: 'sine', peak: 0.7 },
  ],
  notify: [
    { freq: 880, at: 0, dur: 0.03, type: 'sine', peak: 0.6 },
    { freq: 880, at: 0.06, dur: 0.03, type: 'sine', peak: 0.6 },
  ],
}

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      ctx = new Ctor()
    }
    // browsers start the context suspended until a user gesture
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

export function playSound(name: SoundName): void {
  if (!useSettingsStore.getState().sound) return
  const ac = audio()
  if (!ac) return
  try {
    const start = ac.currentTime + 0.005
    for (const p of CUES[name]) {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      const peak = (p.peak ?? 0.5) * MASTER
      osc.type = p.type ?? 'square'
      osc.frequency.value = p.freq
      // quick attack, exponential tail — reads as a blip, not a hum
      gain.gain.setValueAtTime(0.0001, start + p.at)
      gain.gain.exponentialRampToValueAtTime(peak, start + p.at + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + p.at + p.dur)
      osc.connect(gain).connect(ac.destination)
      osc.start(start + p.at)
      osc.stop(start + p.at + p.dur + 0.02)
    }
  } catch {
    // an oscillator failed to schedule — not worth caring about
  }
}
