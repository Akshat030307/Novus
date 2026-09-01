# The education layer

Novus is a game first — you walk a city, take jobs, live with the results.
This document is the plan for making it a **financial simulator you can learn
from and be assessed on** without turning it into a spreadsheet with a mascot.

Nothing here is built yet. It is the spec for the "C" steps in
`docs/build-steps.md`. Sign it off before any code.

---

## 1. What "educational" means here

The game already teaches by consequence. This layer makes the teaching:

- **Explicit** — a player can see *which* concept a case was about and read it
  back later, instead of only absorbing a vague instinct.
- **Practised** — the player commits to a judgement before the reveal, so the
  brain does recall, not recognition.
- **Structured** — the loose pile of cases and market days is grouped into
  named tracks with a check at the end of each.
- **Reviewable** — mistakes, accuracy and coverage add up to something a
  student can hand in or a self-learner can watch improve.

It does **not** mean lectures, locked doors, or a quiz between the player and
every action.

---

## 2. Principles (do not bend these)

1. **The game is the delivery mechanism.** The city, the biased NPCs, the clock
   pressure, XP and levels stay exactly as they are. Education rides on the
   game; it does not replace it.
2. **Teaching arrives after an outcome, pointing at numbers already shown.**
   This is already the rule in `docs/design.md` for the interface. The
   education layer extends it, it does not break it. No concept card pops up
   uninvited mid-decision.
3. **Reward the reasoning, not the dice.** `sim/cases` already scores the call
   against the hidden truth, never the sampled result. Every new mechanic here
   inherits that. A sound call that still went bad is still graded sound; a
   correct prediction on a file that defaulted anyway is still correct.
4. **The AI never teaches substance.** `ai/flavour.ts` may reword a debrief
   line or a concept card. It never produces the grade, the number, the lesson,
   or the pass mark. Every path has written fallback text, as now.
5. **The playable simulation stays fictional.** The market, the loan
   applicants, the events you act on — all invented, always. A real ticker in
   something you can buy or approve turns a learning game into what looks like
   advice. Real companies appear in **exactly one place**: the Casebook (C11),
   as historical record of concluded events, framed as study material, with
   sources cited and a "not investment advice" line. Reading about Satyam in
   2009 is history; a prompt to trade RELIANCE is advice. The wall between them
   is load-bearing.
6. **One optional screen, not a gate.** Where the player commits a prediction
   (C2), it is one screen, and skipping it costs the grading feedback but never
   blocks the decision.

---

## 3. What already carries the teaching

Build on these; do not duplicate them.

| Piece | What it already does |
|-------|----------------------|
| `sim/cases/index.ts` | `judgeChoice` scores reasoning vs `truth.defaultRisk`. `explainCase` rebuilds the ratios (debt-service cover, margin, leverage, collateral cover, score), lists the drivers, writes a verdict line. Reward table is luck-independent. |
| `FinancialCase.teaches` | Each case already declares the concepts it is about. |
| `sim/progression.ts` | Ten skills mapped to real competencies. Skill thresholds already unlock disclosures in the decide view (Accounting 2 → debt-service cover, Risk 2 → risk read, Analysis 3 → leverage). |
| `sim/market` | Noise is tuned larger than a weak sector shock, so the player cannot learn to press a button — only to think. |
| `data/npcs.ts` | NPCs are biased on purpose. Trust is discovered by watching their advice play out. |
| `ai/flavour.ts` | Rewording layer with written fallbacks, already wired into the case brief and explanation. |
| `DayEndScreen` | Already leads with the P&L number and a plain one-line read. |

---

## 4. The pieces

Each piece below: **what it is**, **why it teaches**, **shape** (where the code
and content live), **sim impact**.

### C1 — The Ledger

**What.** A reference book, reachable from the Academy and from a HUD button.
Every concept the game leans on gets one card: a plain definition, the formula,
what a good and a bad value look like, and one worked example drawn from a case
the player has actually resolved. A card unlocks the first time its concept
bites — you resolve a case where it is a driver, you cross a concentration
threshold, an event moves a holding you own.

**Concepts for the first pass:** debt-service coverage ratio, operating cash
flow, leverage / gearing, collateral cover, credit score, gross margin,
price-to-earnings, mark-to-market, realised vs unrealised P&L, diversification /
concentration risk, sector shock, drift vs noise, default risk.

**Why it teaches.** Turns an absorbed instinct into something a player can look
up, revise, and carry out of the game.

**Shape.** Content in `data/concepts/` (one file per concept, typed). A `ui/`
panel (`ui/ledger/`). Unlock state: see §6 — either a `learned: string[]` on
`GameState`, or `flags` keys like `concept:dscr`.

**Sim impact.** A pure `noteLearned(state, conceptId)` helper called from
`resolveCase` / `applyTrade` / the event driver. No new maths.

---

### C2 — Predict, then reveal

**What.** On the case decide screen, before **Submit decision**, one commit:

- Will it default? — a band: **low** (&lt;20%), **mid** (20–40%), **high**
  (&gt;40%).
- Why? — one line, free text, or pick a driver from a list.

The decision is submitted as it is today. The **outcome screen** then grades the
*prediction* against `truth.defaultRisk` and `truth.drivers`:

> You said **high** and named *thin cash flow*. The file was 42%, and that was
> the driver. Well read — the approval still made sense against collateral.

or

> You said **low**. It was 42%. Debt-service cover was 1.1× — cash barely
> covered the interest already owed. That is the number to watch.

**Why it teaches.** Retrieval practice: committing an answer before the reveal
is the single most evidence-backed study technique. It converts "click approve"
into active recall, and it separates *did I reason well* from *did it pay off*.

**Shape.** A `prediction` step in `CasePanel` (before the existing decide view).
Grading is a pure function in `sim/cases` comparing the band to
`truth.defaultRisk` and the picked driver to `truth.drivers`.

**Sim impact.** `sim/types.ts` — see §6. `resolveCase` takes an optional
`prediction` and stores it plus a `predictionRight` flag on the `ResolvedCase`.

---

### C3 — Tap any number to learn it

**What.** Every figure in the HUD and panels carries a hover / tap affordance
that opens a two-sentence explainer: P/E, D/E, unrealised P&L, average cost,
return %, default risk, credit score, collateral value, reputation, XP, Energy.
Same glossary as C1.

**Why it teaches.** Kills the "I don't know what this number is" wall in the
moment it matters, without a detour to a manual.

**Shape.** An `<Explain term="pe">…</Explain>` wrapper component + the glossary
data from C1. Pure `ui/` + `data/`.

**Sim impact.** None.

---

### C4 — Modules

**What.** The teaching grouped into named tracks, each with an intro card, the
cases and scenarios that belong to it, and a short end-of-module check
(3–5 multiple-choice questions drawn from its concepts) with a pass mark.

Proposed tracks:

| Module | Teaches | Content |
|--------|---------|---------|
| Reading a loan file | debt-service cover, operating cash flow, clean vs stretched | Sharma, Anand, the decide-view disclosures |
| Balance-sheet stress | leverage, collateral cover | Girish Steel, Prakash Cold Storage |
| Cash that isn't cash | revenue vs cash flow | Vector Trading |
| Diversification | concentration risk, the allocation bar | an allocation case (needs §5) + a forced over-concentration scenario |
| Reacting to news | events, sector shocks, noise vs signal | the event system + a crash scenario (needs §5) |
| Spotting a pattern | transaction anomalies | a fraud-list case (needs §5) |

**Why it teaches.** This is the structure a classroom or a serious self-learner
follows. It is also the spine that C10 (the transcript) hangs off.

**Shape.** Content in `data/modules/`. A `ui/` module browser (likely the
Academy body). A pure `scoreCheck(answers, module)` in `sim/`.

**Sim impact.** `sim/types.ts` — `modules: Record<string, ModuleProgress>` on
`GameState` (see §6). Depends on §5 for three of the six tracks.

---

### C5 — Day-end debrief line

**What.** The close screen already leads with P&L. Add one generated teaching
sentence built from the day's actions:

> Your three biggest positions are all one sector — one bad headline there is a
> bad day.

> Eleven trades on a flat tape. Noise isn't signal.

> You turned away two clean files today. Check you're not over-weighting
> collateral.

**Why it teaches.** Makes results into feedback, every day, in the place the
player already stops to read.

**Shape.** A pure `analyseDay(state, report) → string | null` in `sim/` reading
the day's trades, holdings and resolved cases. `ai/flavour.ts` may reword it;
written fallback is the sentence itself.

**Sim impact.** `sim/types.ts` — `lesson: string | null` on `DayEndReport`.

---

### C6 — Mistake log

**What.** Unsound calls, noise-trades, over-concentration, and predictions that
ignored the real driver get recorded with their lesson. A panel surfaces the
*pattern*, not the individual slip:

> You've rejected four clean loans. That's a collateral bias — you're treating
> "unsecured" as "unsafe".

> Six of your eight losing trades were bought within an hour of an event
> headline. You're chasing news.

**Why it teaches.** Names the recurring error so the player can break it —
which a single bad outcome never does.

**Shape.** `mistakes: MistakeRecord[]` appended by `resolveCase` / `applyTrade`
via the same analysers as C2 and C5. A `ui/` panel.

**Sim impact.** `sim/types.ts` — `mistakes` on `GameState` (see §6).

---

### C7 — Scenario mode

**What.** A menu — from the home screen or the Academy — of set-piece
situations replayed deliberately, on a separate save from the career run:

- A crash mid-morning. Protect the book.
- A rate hike lands. What re-rates, and which way?
- Here is a transaction list. Find the fraud pattern.
- ₹10,00,000 and twenty minutes. Build a book that survives one bad sector.

Each is a seeded starting `GameState` + a goal + a scored debrief. It reuses the
existing sim wholesale.

**Why it teaches.** This is the thing a teacher assigns. Decoupled, repeatable,
comparable between players.

**Shape.** `data/scenarios/` definitions. A runner that mostly reuses the game
loop. A separate save slot. A debrief screen.

**Sim impact.** Reuses existing types; needs §5 for the allocation, crash and
fraud scenarios. Large enough to be its own phase after C1–C6 and C10.

---

### C8 — Assist setting

**What.** A settings toggle: **show the ratios** vs **make me compute them**.
The skill unlocks already do a crude version of this (Accounting 2 reveals
debt-service cover); this lifts it out from behind the grind so a beginner
isn't locked out and an advanced learner can remove the training wheels.

**Why it teaches.** Difficulty by *disclosure*, not damage.

**Shape.** A `settings` flag + conditionals in the decide view (which already
branch on skill level — this becomes an OR).

**Sim impact.** None. `state/settings.ts` only.

---

### C9 — Sourced further reading

**What.** One "learn more" pointer per concept card to real Indian
investor-education material — SEBI's investor site, RBI's financial-education
content, NISM basics. The businesses stay fictional; the concepts point at real
references.

**Why it teaches.** Keeps Novus honest as education rather than a closed
sandbox, and gives a motivated player somewhere to go next.

**Shape.** A URL + one-line blurb per concept in `data/concepts/`. Rides on C1.

**Sim impact.** None.

---

### C10 — Transcript

**What.** On demand, and at the end of a run: concepts demonstrated, decision
accuracy from C2 predictions, modules passed and their scores, mistakes and
whether they recurred, best and worst calls with the reasoning attached.
Exportable — copy to clipboard, or a print stylesheet.

**Why it teaches.** A student hands it in. A self-learner watches the accuracy
climb.

**Shape.** A `ui/` screen aggregating C2, C4 and C6 state. No new state of its
own.

**Sim impact.** None beyond what C2/C4/C6 add.

---

### C11 — The Casebook (real events)

**What.** A shelf in the Academy, next to the Modules, of **real, concluded
financial events** — each a structured study card:

- what happened, as a short timeline
- the numbers that mattered
- **the red flags that were visible beforehand** — the line on the balance
  sheet, the rating that didn't move, the control that wasn't there
- what it teaches, linked to the same concepts as C1
- two or three questions ("Which line on Satyam's 2008 balance sheet was the
  tell?")
- links to the primary sources

First pass, all Indian unless noted, all long concluded and taught in every
finance course:

| Event | Teaches | Pairs with the fictional case… |
|-------|---------|-------------------------------|
| Satyam Computers, 2009 | fabricated cash, auditor failure, promoter risk | Vector Trading (cash that isn't cash) |
| IL&FS, 2018 | leverage, asset-liability mismatch, rating failure, contagion | Girish Steel (balance-sheet stress) |
| PNB / letters of undertaking, 2018 | internal controls, trade finance, operational risk | the fraud-pattern case (needs §5) |
| Kingfisher Airlines, 2012 | cash burn, personal guarantees, willful default | Sharma / Prakash (loan files) |
| Yes Bank, 2020 | NPA recognition, capital adequacy, AT1 write-down | Girish Steel |
| Harshad Mehta, 1992 | settlement risk, manipulation, why the regulator has teeth | the "reacting to news" module |
| Global financial crisis / Lehman, 2008 | securitisation, leverage, systemic risk | the crash scenario (C7) |

**Why it teaches.** Transfer. A learner who has worked the fictional Girish
Steel file and then reads IL&FS at real scale sees the *same shape* — an
over-levered lender borrowing short to lend long — and it lands with the weight
of a thing that actually happened. The fictional case builds the skill; the
real case proves it was worth building.

**Shape.** Content in `data/casebook/`, one typed file per event. A `ui/` shelf
(Academy body). Read-state as a `flags` key (`casebook:satyam`) — no new
`GameState` field. Every card carries a footer: *study material, not investment
advice; the companies named are the historical record of concluded events.*

**Sourcing — this is the part that needs care.** No live scraping, no runtime
`fetch`, nothing ships unreviewed.

1. A **build-time tool**, `tools/casebook-ingest/` — a plain Node script,
   outside the app (`sim/` never fetches). It pulls from a **fixed allowlist**
   of authoritative public sources only:
   - SEBI and RBI enforcement orders and press releases (public documents)
   - court and tribunal judgments (public record — e.g. Indian Kanoon)
   - Wikipedia (CC BY-SA — quotable with attribution)
   - published regulator and parliamentary committee reports
2. It emits **draft** JSON. It never commits.
3. A person edits every card before it ships: checks each fact against the
   cited source, trims to the teaching essentials, writes the questions,
   confirms the licence. Short quotes from public regulator documents and
   attributed Wikipedia extracts only — **no copied news-article text.**
4. The tool and its allowlist live in the repo so the provenance of every card
   is auditable.

**Sim impact.** None. Content and one `ui/` shelf.

---

## 5. The one structural prerequisite

`FinancialCase` today assumes a loan: it carries `figures: LoanFigures` and
`truth: { defaultRisk, drivers }`. `docs/architecture.md` §6 already flags that
the non-loan lessons need it generalised. C4 and C7 depend on this.

Proposed: a discriminated union on `kind`.

```ts
interface CaseBase {
  id: string
  title: string
  building: BuildingId
  brief: string
  choices: CaseChoice[]
  teaches: string[]          // concept ids
}

export type FinancialCase =
  | (CaseBase & { kind: 'loan';       figures: LoanFigures;  truth: LoanTruth })
  | (CaseBase & { kind: 'allocation'; book: MockHolding[];   truth: AllocationTruth })
  | (CaseBase & { kind: 'pattern';    ledger: LedgerLine[];  truth: PatternTruth })
```

`resolveCase` and `explainCase` branch on `kind`. `CasePanel` renders a
different body per kind. The five existing cases become `kind: 'loan'` with no
other change. This is its own build step and lands before C4.

---

## 6. The type surface, proposed once

All of C's `sim/types.ts` and `GameState` changes, batched so they get reviewed
together rather than four times.

```ts
// --- new shapes ---

/** committed before a case decision, in C2 */
export interface CasePrediction {
  risk: 'low' | 'mid' | 'high'   // <20% / 20–40% / >40%
  note?: string                   // one line, or a driver id the player picked
}

/** a recurring error the game has spotted, in C6 */
export interface MistakeRecord {
  id: string
  kind: 'unsound_call' | 'noise_trade' | 'concentration' | 'chased_news' | 'ignored_driver'
  day: number
  note: string                    // the lesson, plain language
}

/** per-module progress, in C4 */
export interface ModuleProgress {
  started: boolean
  passed: boolean
  score?: number                  // 0–1 on the end check, best attempt
}

// --- additions to existing shapes ---

export interface ResolvedCase {
  // ...existing fields...
  prediction?: CasePrediction     // absent for cases resolved before C2 shipped
  predictionRight?: boolean       // graded band vs truth.defaultRisk
}

export interface DayEndReport {
  // ...existing fields...
  lesson: string | null           // the C5 debrief sentence, null on a quiet day
}

export interface GameState {
  // ...existing fields...
  learned: string[]                        // concept ids unlocked for the Ledger (C1)
  modules: Record<string, ModuleProgress>  // keyed by module id (C4)
  mistakes: MistakeRecord[]                 // (C6)
}
```

**Migration.** Bump `GameState.version` to 2. `state/migrate.ts` gains a step:
if `save.version < 2`, default `learned: []`, `modules: {}`, `mistakes: []`,
then `save.version = 2`. Old saves keep loading.

**Alternative for `learned`.** It could live in `flags` as `concept:<id>` keys
and avoid one field. Recommendation: keep the explicit array — the Ledger panel
iterates it, and `flags` is already a grab-bag.

**C11 adds nothing here.** Casebook read-state is a `flags` key per event
(`casebook:satyam`); there is no per-event progress to track.

---

## 7. Build order

Each step ends with something that runs, same rule as `docs/build-steps.md`.

| Step | What | Sim risk |
|------|------|----------|
| C-spec | This document, signed off | — |
| C-a | **C1 + C3 + C9** — the Ledger, tap-to-explain, further reading. All content + `ui/`. `learned` via `flags` or the new field. | low |
| C-a2 | **C11** — the Casebook: the `tools/casebook-ingest/` tool, then five to seven curated real events linked to C1's concepts. Content + one `ui/` shelf. | none |
| C-b | **C8** — assist setting. | none |
| C-c | **`FinancialCase` generalisation** (§5). | structural |
| C-d | **C2** — predict, then reveal. | `sim/types.ts` |
| C-e | **C5 + C6** — day debrief and mistake log, shared analysers. | `sim/types.ts` |
| C-f | **C4** — modules and end checks. | `sim/types.ts` |
| C-g | **C10** — transcript. | none |
| C-h | **C7** — scenario mode. Its own phase. | reuses |

Do the `sim/types.ts` change from §6 in one commit at the start of C-d, let
TypeScript show every screen that breaks, fix those. That is the type file
doing its job.

---

## 8. Open questions for sign-off

1. **Scope of the first pass.** Is C-a + C-b + C-c + C-d a good first
   deliverable, with C-e onward as a second pass? Or narrower still?
2. **`learned` field vs `flags`.** Explicit array (recommended) or fold into
   `flags`?
3. **Prediction input.** Free-text "why", or pick-a-driver only? Free text is
   warmer but ungraded on the reasoning half; a picked driver grades cleanly.
   Could do both — text shown back, driver graded.
4. **Module checks — pass mark.** 3/5? 4/5? Retakeable? Does failing block
   anything, or just not award the badge? (Principle 2 says it should not
   block.)
5. **Where the Ledger lives.** Academy body only, or also a persistent HUD
   button? The Academy is the walk-there answer; a HUD button is the
   dashboard-trap answer.
6. **Scenario mode save slot.** Separate `localStorage` key and no cloud sync,
   or a full parallel slot?
7. **`FinancialCase` union now or later.** It is a prerequisite for C4/C7 but
   not for C1–C3, C5, C6, C8. Land it at C-c as written, or defer until C4?
8. **Casebook — first events.** Confirm the seven in C11's table, or swap some
   (DHFL, Nirav Modi as its own card, Enron, LTCM, 2G, NSEL are candidates).
   How many for the first pass — five?
9. **Casebook — ingestion.** The build-time curated tool as described
   (recommended), or is even that more automation than you want (hand-write
   each card from sources, skip the tool)?
10. **Casebook — licensing line.** Confirm: attributed Wikipedia extracts and
   short quotes from public SEBI/RBI/court documents are in scope; no
   news-article text; every card shows its sources and a "not investment
   advice" footer.
