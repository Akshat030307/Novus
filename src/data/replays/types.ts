/**
 * Issue B7. The shape of a historical replay.
 *
 * A replay walks a concluded event forward in time, showing only what was
 * public at each point, and asks for a decision before revealing what happened
 * next. The scoring is the whole design: you are marked on whether the call
 * was defensible **on what was knowable then**, never on whether it matched
 * the ending. Hindsight is the bias this exists to teach against, so a drill
 * that rewarded hindsight would teach the opposite of its subject.
 */
export interface ReplayOption {
  id: string
  label: string
}

export interface ReplayStep {
  /** as the date would have been read at the time */
  when: string
  /** what was public at this point. Every line traces to the Casebook card. */
  known: string[]
  question: string
  options: ReplayOption[]
  /** the calls a careful reader could defend on what was known *then* */
  defensible: string[]
  /** what happened next, from the record */
  outcome: string
  /** why the defensible calls were defensible — shown after the step */
  note: string
}

export interface Replay {
  id: string
  title: string
  /** the Casebook entry every fact here is drawn from */
  casebookId: string
  /** who the player is standing in for */
  role: string
  /** stated up front, every time */
  caution: string
  steps: ReplayStep[]
}
