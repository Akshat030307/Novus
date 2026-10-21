import { useEffect, useState, type ReactNode } from "react";
import sourceCheck from '@/data/casebook-sources.json'
import { useGameStore, useUiStore } from "@/state/store";
import {
  CASEBOOK,
  getCasebookEntry,
  type CasebookEntry,
} from "@/data/casebook";
import { getConcept } from "@/data/concepts";
import { caseEchoing } from "@/data/cases";
import { PixelButton } from "@/ui/components/PixelButton";

/**
 * Step C-a2. Real, concluded events as study cards. Read-state is a `flags`
 * key per entry. The draft banner and the footer are not decoration — the
 * cards need a source check before this is shown to anyone outside dev.
 */
export function CasebookPanel() {
  const [openId, setOpenId] = useState<string | null>(null);
  const flags = useGameStore((s) => s.state.flags);
  const apply = useGameStore((s) => s.apply);
  const wanted = useUiStore((s) => s.casebookEntry);
  const setWanted = useUiStore((s) => s.setCasebookEntry);

  // issue B5: a resolved pattern file can send the player straight here
  useEffect(() => {
    if (!wanted) return;
    setOpenId(wanted);
    setWanted(null);
    if (!useGameStore.getState().state.flags[`casebook:${wanted}`]) {
      apply((d) => {
        d.flags[`casebook:${wanted}`] = true;
        return d;
      });
    }
  }, [wanted, setWanted, apply]);

  const open = (id: string) => {
    setOpenId(id);
    if (!flags[`casebook:${id}`]) {
      apply((d) => {
        d.flags[`casebook:${id}`] = true;
        return d;
      });
    }
  };

  if (openId) {
    const entry = getCasebookEntry(openId);
    if (entry) return <Detail entry={entry} onBack={() => setOpenId(null)} />;
  }

  return (
    <div className="space-y-3">
      <div className="border-l-2 border-coral bg-panel-3 py-2 pl-3 pr-2 text-[14px] text-muted">
        Draft. These are written from public accounts; figures and dates still
        need a check against the cited sources.
      </div>
      <p className="text-[14px] text-muted">
        Things that actually happened. Each one rhymes with a case you can work
        in the game.
      </p>
      <ul className="space-y-2">
        {CASEBOOK.map((e) => (
          <li key={e.id}>
            <button
              onClick={() => open(e.id)}
              className="w-full border-2 border-line bg-panel-3 p-3 text-left hover:border-marigold"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-[14px] text-ink">
                  {e.title} <span className="text-muted">· {e.year}</span>
                </h3>
                {flags[`casebook:${e.id}`] && (
                  <span className="text-[12px] text-jade font-semibold uppercase tracking-wide">
                    Read
                  </span>
                )}
              </div>
              <p className="mt-1 text-[14px] text-muted">{e.oneLine}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Detail({
  entry,
  onBack,
}: {
  entry: CasebookEntry;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="border border-line px-2 py-1 text-[12px] text-muted font-semibold uppercase tracking-wide hover:text-ink"
      >
        ← All cases
      </button>

      <div>
        <h3 className="text-[18px] font-semibold text-marigold">
          {entry.title} · {entry.year}
        </h3>
        <p className="mt-1 max-w-3xl text-[16px] text-ink">{entry.oneLine}</p>
      </div>

      {/* two columns once there is room: the story on the left, what you do
          with it on the right. One column below that, unchanged. */}
      <div className="grid gap-x-10 gap-y-4 xl:grid-cols-2 xl:items-start">
        <div className="space-y-4">
          <Block title="What happened">
            <ul className="space-y-1 text-[14px] text-muted">
              {entry.timeline.map((t, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-marigold">▪</span>
                  {t}
                </li>
              ))}
            </ul>
          </Block>

          <Block title="The numbers">
            <ul className="space-y-1 text-[14px] text-muted">
              {entry.numbers.map((n, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-muted">·</span>
                  {n}
                </li>
              ))}
            </ul>
          </Block>
        </div>

        <div className="space-y-4">
          <Block title="Visible beforehand">
            <ul className="space-y-1 text-[14px] text-ink">
              {entry.redFlags.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-coral">▪</span>
                  {r}
                </li>
              ))}
            </ul>
          </Block>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] text-muted font-semibold uppercase tracking-wide">
              Reinforces
            </span>
            {entry.teaches.map((c) => (
              <span
                key={c}
                className="border border-line px-1.5 py-0.5 text-[13px] text-muted"
              >
                {getConcept(c)?.label ?? c}
              </span>
            ))}
          </div>

          <RhymesWith entry={entry} />

          <Block title="Check yourself">
            {entry.questions.map((qa, i) => (
              <QA key={i} qa={qa} />
            ))}
          </Block>

          <div>
            <div className="mb-1 text-[12px] font-semibold tracking-wide text-muted uppercase">
              Sources
            </div>
            <ul className="flex flex-col gap-1.5">
              {entry.sources.map((s) => (
                <li key={s.url} className="flex flex-wrap items-baseline gap-x-2">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[13px] text-amethyst underline hover:text-marigold"
                  >
                    {s.label} ↗
                  </a>
                  <SourceState url={s.url} />
                </li>
              ))}
            </ul>
            <CheckedLine />
          </div>
        </div>
      </div>

      <p className="border-t border-line pt-2 text-[13px] text-muted/70">
        Study material, not investment advice. The companies named are the
        historical record of concluded events.
      </p>
    </div>
  );
}

/* ---------- what the TinyFish check found ---------- */

type Checked = {
  ok: boolean
  title?: string | null
  finalUrl?: string | null
  error?: string
}
const CHECK = sourceCheck as {
  checkedAt: string | null
  checkedBy: string
  sources: Record<string, Checked>
}

/** a citation that has been opened recently says so; one that broke says that louder */
function SourceState({ url }: { url: string }) {
  const found = CHECK.sources[url]
  if (!found) return null
  if (!found.ok) {
    return (
      <span className="text-[12px] text-coral" title={found.error}>
        could not be reached when last checked
      </span>
    )
  }
  return (
    <span className="text-[12px] text-jade" title={found.title ?? undefined}>
      ✓ reachable{found.finalUrl ? ' · redirects' : ''}
    </span>
  )
}

/** one line saying when an agent last opened every link on this page */
function CheckedLine() {
  if (!CHECK.checkedAt) return null
  const when = new Date(CHECK.checkedAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const all = Object.values(CHECK.sources)
  const broken = all.filter((s) => !s.ok).length
  return (
    <p className="mt-2 text-[12px] text-muted">
      Every source in the Casebook was opened by a {CHECK.checkedBy} agent on {when}
      {broken === 0 ? ' and all of them resolved.' : `, and ${broken} did not resolve.`}
    </p>
  )
}

/**
 * Issue B5. Reading is where the Casebook used to stop. Where an invented file
 * carries the same shape, this opens it — the reading and the exercise are the
 * same lesson, and until now nothing joined them.
 *
 * The other direction is deliberately not symmetric: a pattern file only names
 * the event it rhymes with *after* the decision, because knowing it was Satyam
 * hands you the answer.
 */
function RhymesWith({ entry }: { entry: CasebookEntry }) {
  const live = caseEchoing(entry.id);
  const resolved = useGameStore((s) => s.state.cases.resolved);
  const apply = useGameStore((s) => s.apply);
  const setOpenBuilding = useUiStore((s) => s.setOpenBuilding);
  const done = live ? resolved.some((r) => r.caseId === live.id) : false;

  const openLive = () => {
    if (!live) return;
    apply((d) => {
      d.cases.openCaseId = live.id;
      return d;
    });
    setOpenBuilding(live.building);
  };

  return (
    <div className="border-l-2 border-amethyst pl-3">
      <div className="text-[12px] text-amethyst font-semibold uppercase tracking-wide">
        Rhymes with
      </div>
      <p className="text-[14px] text-muted">{entry.pairsWith}</p>
      {live && (
        <div className="mt-2">
          <PixelButton onClick={openLive}>
            {done ? "Reopen the file" : "Now find it in a live file"}
          </PixelButton>
          <p className="mt-1 text-[13px] text-muted">
            {live.title}: waiting at Risk &amp; Compliance.
          </p>
        </div>
      )}
    </div>
  );
}

function QA({ qa }: { qa: { q: string; a: string } }) {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-2">
      <button
        onClick={() => setShow((s) => !s)}
        className="text-left text-[14px] text-ink hover:text-marigold"
      >
        {qa.q}
      </button>
      {show && (
        <p className="mt-1 border-l-2 border-line pl-2 text-[14px] text-muted">
          {qa.a}
        </p>
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[12px] text-muted font-semibold uppercase tracking-wide">
        {title}
      </div>
      {children}
    </div>
  );
}
