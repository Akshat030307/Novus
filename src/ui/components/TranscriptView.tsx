import type { TranscriptDoc, TranscriptLine } from '@/sim/transcript'

/**
 * Issue B1. One renderer, two places: the Academy panel shows the live
 * document, the verification page shows the stored one. They must look
 * identical — if what an instructor opens doesn't match what the player saw
 * when they issued it, the code is worth nothing.
 *
 * Reads only from the document. No store, no content lookups, no GameState —
 * so a transcript from an old version still renders exactly as issued.
 */
export function TranscriptView({ doc }: { doc: TranscriptDoc }) {
  return (
    <div className="space-y-4">
      {doc.award && (
        <div className="border-2 border-marigold bg-panel-3 p-4">
          <div className="font-display text-[9px] text-marigold uppercase">Certificate</div>
          <h3 className="mt-1 font-display text-[13px] text-ink">{doc.award.title}</h3>
          <p className="mt-2 text-xs leading-relaxed text-muted">{doc.award.blurb}</p>
        </div>
      )}
      <dl className="grid grid-cols-2 gap-px border-2 border-line bg-line sm:grid-cols-4">
        {doc.headline.map((h) => (
          <div key={h.label} className="bg-panel-3 p-2">
            <dt className="font-display text-[9px] text-muted uppercase">{h.label}</dt>
            <dd className="font-num text-sm text-ink">{h.value}</dd>
          </div>
        ))}
      </dl>

      {doc.sections.map((section) => (
        <section key={section.title} className="border-2 border-line bg-panel-3 p-3">
          <h4 className="font-display text-[10px] text-marigold uppercase">{section.title}</h4>
          <p className="mt-1 mb-2 text-[11px] leading-relaxed text-muted">{section.summary}</p>
          <ul className="space-y-1">
            {section.lines.map((line, i) => (
              <Line key={`${line.label}-${i}`} line={line} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function Line({ line }: { line: TranscriptLine }) {
  // the glyph carries the pass/fail, never the colour on its own (issue A3)
  const mark = line.passed === undefined ? '·' : line.passed ? '✓' : '✕'
  const tone =
    line.passed === undefined ? 'text-muted' : line.passed ? 'text-jade' : 'text-coral'

  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="text-ink">
          <span className={`mr-1.5 font-num ${tone}`}>{mark}</span>
          {line.label}
        </span>
        <span className="shrink-0 font-num text-muted">{line.value}</span>
      </div>
      {line.note && <p className="pl-4 text-[10px] text-muted">{line.note}</p>}
    </li>
  )
}

/**
 * What the code does and does not stand behind. Shown on both sides, in the
 * same words, because an honest limit stated up front is what makes the rest
 * of it credible.
 */
export function TranscriptProvenance({
  code,
  issuedAt,
  playerName,
}: {
  code: string
  issuedAt: string
  playerName: string
}) {
  return (
    <div className="border-2 border-amethyst bg-panel-3 p-3">
      <div className="font-display text-[9px] text-amethyst uppercase">Verification</div>
      <p className="mt-1 font-num text-sm break-all text-ink">{code}</p>
      <p className="mt-1 text-[11px] text-muted">
        Issued to <span className="text-ink">{playerName}</span> on{' '}
        <span className="font-num">{new Date(issuedAt).toLocaleString('en-IN')}</span>.
      </p>
      <p className="mt-2 text-[10px] leading-relaxed text-muted">
        This code proves the report came out of Novus, under this account, at the time the database
        recorded — and that nothing in it has been edited since. It does not vouch for how the run
        was played.
      </p>
    </div>
  )
}
