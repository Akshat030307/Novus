import { useEffect, useMemo, useState } from 'react'
import { useGameStore } from '@/state/store'
import { useAuthStore } from '@/state/auth'
import { useAttemptsStore } from '@/state/attempts'
import { buildTranscript, transcriptText } from '@/sim/transcript'
import {
  issueTranscript,
  myTranscripts,
  verifyUrl,
  type IssuedTranscript,
} from '@/state/transcripts'
import { TranscriptView, TranscriptProvenance } from '@/ui/components/TranscriptView'
import { PixelButton } from '@/ui/components/PixelButton'

/**
 * Step C-g, rebuilt for issue B1. Everything the education layer knows about
 * this run — and, once issued, a link somebody else can open.
 *
 * The copy button stays: it is the right tool when the answer is "paste this
 * into an email". The issued transcript is for when the answer is "prove it."
 */
export function TranscriptPanel() {
  const state = useGameStore((s) => s.state)
  const attempts = useAttemptsStore((s) => s.attempts)
  const user = useAuthStore((s) => s.user)

  const doc = useMemo(() => buildTranscript(state, attempts), [state, attempts])

  const [copied, setCopied] = useState<'none' | 'text' | 'link'>('none')
  const [issuing, setIssuing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [issued, setIssued] = useState<IssuedTranscript[]>([])
  const latest = issued[0] ?? null

  useEffect(() => {
    if (!user) return setIssued([])
    let live = true
    void myTranscripts().then((rows) => {
      if (live) setIssued(rows)
    })
    return () => {
      live = false
    }
  }, [user])

  const flash = (what: 'text' | 'link') => {
    setCopied(what)
    setTimeout(() => setCopied('none'), 1500)
  }

  const copyText = () => {
    const text = latest
      ? transcriptText(doc, {
          code: latest.code,
          at: latest.issuedAt,
          url: verifyUrl(latest.code),
        })
      : transcriptText(doc)
    void navigator.clipboard?.writeText(text).then(() => flash('text'), () => {})
  }

  const copyLink = () => {
    if (!latest) return
    void navigator.clipboard
      ?.writeText(verifyUrl(latest.code))
      .then(() => flash('link'), () => {})
  }

  const issue = async () => {
    setIssuing(true)
    setError(null)
    const result = await issueTranscript(doc)
    setIssuing(false)
    if (!result.ok) return setError(result.error)
    setIssued((prev) => [result.value, ...prev])
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-[11px] text-marigold uppercase">Report card</h3>
          <p className="font-display text-[9px] text-muted uppercase">
            {state.player.name} · Level {state.player.level} · Day {state.clock.day}
          </p>
        </div>
        <div className="flex gap-2">
          <PixelButton onClick={copyText}>{copied === 'text' ? 'Copied' : 'Copy'}</PixelButton>
          <PixelButton tone="primary" onClick={() => void issue()} disabled={!user || issuing}>
            {issuing ? 'Issuing…' : 'Issue transcript'}
          </PixelButton>
        </div>
      </div>

      {!user && (
        <p className="border-l-2 border-line pl-3 text-xs text-muted">
          Sign in to issue a transcript. It has to be written against an account and timestamped by
          the server — a code the game made up on its own would prove nothing.
        </p>
      )}

      {error && <p className="border-l-2 border-coral pl-3 text-xs text-coral">{error}</p>}

      {latest && (
        <div className="space-y-2">
          <TranscriptProvenance
            code={latest.code}
            issuedAt={latest.issuedAt}
            playerName={latest.playerName}
          />
          <div className="flex flex-wrap items-center gap-2">
            <PixelButton onClick={copyLink}>
              {copied === 'link' ? 'Link copied' : 'Copy link'}
            </PixelButton>
            <a
              href={verifyUrl(latest.code)}
              target="_blank"
              rel="noreferrer"
              className="font-display text-[9px] text-amethyst uppercase underline hover:text-marigold"
            >
              Open it as they will see it
            </a>
          </div>
          {issued.length > 1 && (
            <p className="text-[10px] text-muted">
              Earlier:{' '}
              {issued.slice(1).map((t, i) => (
                <span key={t.code}>
                  {i > 0 && ' · '}
                  <a
                    href={verifyUrl(t.code)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-num underline hover:text-marigold"
                  >
                    {t.code}
                  </a>
                </span>
              ))}
            </p>
          )}
          <p className="text-[10px] text-muted">
            The one above is a snapshot of the run as it stood when you issued it. Issue another
            later and both stay readable — neither can be edited or withdrawn.
          </p>
        </div>
      )}

      <TranscriptView doc={doc} />
    </div>
  )
}
