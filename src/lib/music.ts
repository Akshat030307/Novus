import { audio } from '@/lib/sound'

/**
 * Background music. One track — "SummerTown" by LushoGames, CC0, see
 * public/assets/LICENCES.md — looped through Web Audio rather than an <audio>
 * element, for two reasons: a decoded buffer loops with no gap at the seam
 * (an <audio loop> on an MP3 audibly stutters every 103 seconds), and a gain
 * node lets it fade instead of cutting.
 *
 * Three levels, and the game only ever asks for one of them:
 *
 *   'off'     not on the game screen, or the Music setting is off
 *   'full'    walking the city — still quiet; this is a background, not a soundtrack
 *   'ducked'  inside a building, in a conversation, or on the day-end screen,
 *             where someone is reading and thinking
 *
 * Like lib/sound.ts: it makes noise and decides nothing, and every failure is
 * a silent no-op. A blocked AudioContext or a missing file must never take the
 * game down with it.
 */
export type MusicLevel = 'off' | 'full' | 'ducked'

const TRACK = '/assets/music/summertown.mp3'
const GAIN: Record<MusicLevel, number> = { off: 0, full: 0.22, ducked: 0.06 }
const FADE_SECONDS = 0.8

let buffer: AudioBuffer | null = null
let loading: Promise<AudioBuffer | null> | null = null
let source: AudioBufferSourceNode | null = null
let gain: GainNode | null = null
/** the latest level asked for — an async load applies whatever is current when it lands */
let wanted: MusicLevel = 'off'
let stopTimer: ReturnType<typeof setTimeout> | null = null

function load(ctx: AudioContext): Promise<AudioBuffer | null> {
  if (buffer) return Promise.resolve(buffer)
  loading ??= fetch(TRACK)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
    .then((bytes) => ctx.decodeAudioData(bytes))
    .then((decoded) => (buffer = decoded))
    .catch(() => {
      loading = null // let a later request try again
      return null
    })
  return loading
}

function fadeTo(ctx: AudioContext, level: MusicLevel) {
  if (!gain) return
  const now = ctx.currentTime
  gain.gain.cancelScheduledValues(now)
  gain.gain.setValueAtTime(gain.gain.value, now)
  gain.gain.linearRampToValueAtTime(GAIN[level], now + FADE_SECONDS)
}

export function setMusic(level: MusicLevel): void {
  wanted = level
  try {
    const ctx = audio()
    if (!ctx) return

    if (level === 'off') {
      if (!source) return
      fadeTo(ctx, 'off')
      if (stopTimer) clearTimeout(stopTimer)
      stopTimer = setTimeout(() => {
        if (wanted !== 'off') return // someone asked for it back mid-fade
        source?.stop()
        source?.disconnect()
        source = null
      }, FADE_SECONDS * 1000 + 50)
      return
    }

    if (source) return fadeTo(ctx, level)

    void load(ctx).then((decoded) => {
      if (!decoded || source || wanted === 'off') {
        if (source) fadeTo(ctx, wanted)
        return
      }
      gain ??= ctx.createGain()
      gain.connect(ctx.destination)
      gain.gain.setValueAtTime(0, ctx.currentTime)
      source = ctx.createBufferSource()
      source.buffer = decoded
      source.loop = true
      source.connect(gain)
      source.start()
      fadeTo(ctx, wanted)
    })
  } catch {
    /* no audio on this device — the game plays on in silence */
  }
}

/** what is actually playing right now, for the verification script */
export function musicLevel(): { wanted: MusicLevel; playing: boolean; gain: number } {
  return { wanted, playing: source !== null, gain: gain?.gain.value ?? 0 }
}
