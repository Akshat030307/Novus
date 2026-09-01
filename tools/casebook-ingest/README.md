# casebook-ingest

Draft pipeline for the Casebook (`src/data/casebook.ts`). Not wired into the
app — `sim/` never fetches, and the game runs offline. This is a build-time
tool that a person runs, reviews, and only then commits.

## Rules

1. **Allowlist only.** Pull from authoritative public sources:
   - SEBI and RBI enforcement orders and press releases
   - court and tribunal judgments (public record)
   - Wikipedia (CC BY-SA — quotable with attribution)
   - published regulator and parliamentary-committee reports

   No news-article text. No paywalled sources. No scraping anything not on
   this list.

2. **Draft out, never commit.** `ingest.mjs` writes `drafts/*.json`. It does
   not touch `src/`.

3. **A person edits every card.** Check each figure and date against the cited
   source, trim to the teaching essentials, write the questions, confirm the
   licence. Then hand-merge into `src/data/casebook.ts` and drop the `DRAFT`
   note for that entry.

4. **Every card shows its sources and a "not investment advice" footer.** The
   `CasebookEntry` type enforces the `sources` field; the panel renders the
   footer.

## Status

`src/data/casebook.ts` currently holds six entries written from public
accounts, all marked DRAFT. `ingest.mjs` is a skeleton — the fetch/parse
steps are stubbed. Nothing here has been run against live sources yet.
