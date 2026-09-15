import { useEffect, useMemo, useState } from 'react'
import { useGameStore } from '@/state/store'
import { useAuthStore } from '@/state/auth'
import { useAttemptsStore } from '@/state/attempts'
import { CERTIFICATES, assess, type Certificate } from '@/sim/certificates'
import { buildCertificate } from '@/sim/transcript'
import {
  issueTranscript,
  myTranscripts,
  verifyUrl,
  type IssuedTranscript,
} from '@/state/transcripts'
import { PixelButton } from '@/ui/components/PixelButton'

/**
 * Issue B8. The published bar, and whether you have cleared it.
 *
 * Every requirement is on screen from the first visit, with the count against
 * it — before it is met, while it is being met, and after. Nothing here is
 * ever revealed as a surprise, because a certificate whose conditions you
 * could not read in advance is a participation badge.
 *
 * Issuing goes through the same path as a transcript (issue B1): the code and
 * the timestamp come from the database, and once issued nothing can edit or
 * withdraw it.
 */
export function CertificatesPanel() {
  const state = useGameStore((s) => s.state)
  const attempts = useAttemptsStore((s) => s.attempts)
  const user = useAuthStore((s) => s.user)
  const [issued, setIssued] = useState<IssuedTranscript[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return setIssued([])
    let live = true
    void myTranscripts().then((rows) => {
      if (live) setIssued(rows.filter((r) => r.kind === 'certificate'))
    })
    return () => {
      live = false
    }
  }, [user])

  const issue = async (cert: Certificate) => {
    setBusy(cert.id)
    setError(null)
    const doc = buildCertificate(cert, state, attempts)
    const result = await issueTranscript(doc)
    setBusy(null)
    if (!result.ok) return setError(result.error)
    setIssued((prev) => [result.value, ...prev])
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Named awards with published conditions. Every requirement below is measured, not granted —
        and you can read all of them long before you meet any of them.
      </p>

      {error && <p className="border-l-2 border-coral pl-3 text-xs text-coral">{error}</p>}

      {CERTIFICATES.map((cert) => (
        <Card
          key={cert.id}
          cert={cert}
          issued={issued.find((i) => i.doc.award?.title === cert.title) ?? null}
          canIssue={Boolean(user)}
          busy={busy === cert.id}
          onIssue={() => void issue(cert)}
        />
      ))}
    </div>
  )
}

function Card({
  cert,
  issued,
  canIssue,
  busy,
  onIssue,
}: {
  cert: Certificate
  issued: IssuedTranscript | null
  canIssue: boolean
  busy: boolean
  onIssue: () => void
}) {
  const state = useGameStore((s) => s.state)
  const attempts = useAttemptsStore((s) => s.attempts)
  const { requirements, earned } = useMemo(
    () => assess(cert, state, attempts),
    [cert, state, attempts],
  )
  const met = requirements.filter((r) => r.met).length

  return (
    <div className={`border-2 bg-panel-3 p-3 ${earned ? 'border-marigold' : 'border-line'}`}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-display text-[11px] text-ink">{cert.title}</h3>
        <span
          className={`shrink-0 font-display text-[9px] uppercase ${
            issued ? 'text-jade' : earned ? 'text-marigold' : 'text-muted'
          }`}
        >
          {issued ? '✓ Issued' : earned ? 'Ready' : `${met}/${requirements.length}`}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">{cert.blurb}</p>

      <ul className="mt-2 space-y-1">
        {requirements.map((r) => (
          <li key={r.id} className="flex items-baseline justify-between gap-3 text-xs">
            <span className={r.met ? 'text-ink' : 'text-muted'}>
              <span className={`mr-1.5 font-num ${r.met ? 'text-jade' : 'text-muted'}`}>
                {r.met ? '✓' : '·'}
              </span>
              {r.label}
            </span>
            <span className={`shrink-0 font-num ${r.met ? 'text-jade' : 'text-muted'}`}>
              {r.got}/{r.need}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-2 border-l-2 border-line pl-2 text-[10px] leading-relaxed text-muted">
        {cert.scope}
      </p>

      {issued ? (
        <div className="mt-2">
          <p className="font-num text-xs break-all text-ink">{issued.code}</p>
          <a
            href={verifyUrl(issued.code)}
            target="_blank"
            rel="noreferrer"
            className="font-display text-[9px] text-amethyst uppercase underline hover:text-marigold"
          >
            Open it as they will see it
          </a>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <PixelButton tone="primary" onClick={onIssue} disabled={!earned || !canIssue || busy}>
            {busy ? 'Issuing…' : 'Issue certificate'}
          </PixelButton>
          {!canIssue && <span className="text-[10px] text-muted">Sign in to issue.</span>}
          {canIssue && !earned && (
            <span className="text-[10px] text-muted">
              {requirements.length - met} requirement{requirements.length - met === 1 ? '' : 's'} to
              go.
            </span>
          )}
        </div>
      )}
    </div>
  )
}
