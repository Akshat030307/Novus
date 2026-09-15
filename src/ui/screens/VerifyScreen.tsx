import { useEffect, useState } from 'react'
import { verifyTranscript, verifyUrl, type IssuedTranscript } from '@/state/transcripts'
import { TranscriptView, TranscriptProvenance } from '@/ui/components/TranscriptView'
import { transcriptText, type TranscriptDoc } from '@/sim/transcript'
import { PixelButton } from '@/ui/components/PixelButton'

/**
 * Issue B1, the other side of it. What an instructor opens.
 *
 * No sign-in, no game, no save — a code in the address bar and a read-only
 * document. This is the page that turns "I played a game" into "here is my
 * coursework", so it is deliberately plain: the figures, where they came from,
 * and an honest note about what the code does and doesn't prove.
 */
export default function VerifyScreen({ code }: { code: string }) {
  const [state, setState] = useState<
    { kind: 'loading' } | { kind: 'ok'; value: IssuedTranscript } | { kind: 'bad'; error: string }
  >({ kind: 'loading' })

  useEffect(() => {
    let live = true
    void verifyTranscript(code).then((result) => {
      if (!live) return
      if (!result.ok) return setState({ kind: 'bad', error: result.error })
      // a body this renderer can't read is a failed check, not a blank page
      const body = result.value.doc
      if (!body || !Array.isArray(body.sections) || !Array.isArray(body.headline)) {
        return setState({ kind: 'bad', error: 'That transcript was issued by a newer version of Novus than this page can read.' })
      }
      setState({ kind: 'ok', value: result.value })
    })
    return () => {
      live = false
    }
  }, [code])

  return (
    <div className="h-full overflow-y-auto bg-night">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <header className="mb-6 border-b-2 border-line pb-4">
          <h1 className="font-display text-xl text-ink">NOVUS</h1>
          <p className="mt-1 font-display text-[9px] text-magenta uppercase">
            Gamified Financial Markets Education Platform
          </p>
        </header>

        {state.kind === 'loading' && <p className="text-sm text-muted">Checking {code}…</p>}

        {state.kind === 'bad' && (
          <div className="border-2 border-coral bg-panel-3 p-4">
            <h2 className="font-display text-[11px] text-coral uppercase">Not verified</h2>
            <p className="mt-2 text-sm text-ink">{state.error}</p>
            <p className="mt-2 text-xs text-muted">
              Codes look like <span className="font-num">NVS-A2B3C-D4E5F</span>. Check for a typo —
              the alphabet has no letter O and no digit 1, so those are usually a zero and an I.
            </p>
          </div>
        )}

        {state.kind === 'ok' && <Verified issued={state.value} />}

        <footer className="mt-8 border-t-2 border-line pt-4 text-[10px] text-muted">
          Novus is a teaching simulation. Every company, price and loan file in it is invented.
          Nothing here is investment advice.
        </footer>
      </div>
    </div>
  )
}

function Verified({ issued }: { issued: IssuedTranscript }) {
  const [copied, setCopied] = useState(false)
  const doc = issued.doc as TranscriptDoc

  const copy = () => {
    const text = transcriptText(doc, {
      code: issued.code,
      at: issued.issuedAt,
      url: verifyUrl(issued.code),
    })
    void navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      },
      () => {},
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-[13px] text-marigold uppercase">Report card</h2>
          <p className="mt-1 text-sm text-ink">
            {doc.player} · Finance Intern · Level {doc.level} · Day {doc.day}
          </p>
        </div>
        <div className="flex gap-2">
          <PixelButton onClick={copy}>{copied ? 'Copied' : 'Copy as text'}</PixelButton>
          <PixelButton tone="primary" onClick={() => window.print()}>
            Print / PDF
          </PixelButton>
        </div>
      </div>

      <TranscriptProvenance
        code={issued.code}
        issuedAt={issued.issuedAt}
        playerName={issued.playerName}
      />

      <TranscriptView doc={doc} />
    </div>
  )
}
