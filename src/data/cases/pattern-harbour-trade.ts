import type { PatternCase } from '@/sim/types'

/**
 * Issue B5. Rhymes with the PNB letters-of-undertaking case
 * (`echoes: 'pnb-lou'`) — the Casebook card that, until now, paired with "the
 * fraud-pattern case (planned)". This is that case.
 *
 * Nothing in these accounts is wrong, and that is the exercise. The money is
 * all present. The tell is a control that is not there: an instrument issued
 * on one system that never had to agree with the ledger on another, signed by
 * the same two people for years, in a branch nobody rotated.
 *
 * Harbour Trade Finance is invented, as everything playable in Novus is.
 */
export const patternHarbourTrade: PatternCase = {
  kind: 'pattern',
  id: 'pattern-harbour-trade',
  building: 'risk',
  title: 'Harbour Trade Finance — branch controls review',
  brief:
    'A routine controls review of one trade-finance branch. The accounts balance, ' +
    'the audits are clean, and there is no loss to point at. You are not being ' +
    'asked whether money is missing. You are being asked whether it could go ' +
    'missing without anyone noticing.',
  accounts: [
    { label: 'Guarantees outstanding', value: '₹4,120 crore', note: 'issued to overseas banks' },
    {
      label: 'Guarantees recorded in the core ledger',
      value: '₹3,180 crore',
      note: 'the messaging system is reconciled to the ledger annually',
    },
    { label: 'Branch fee income', value: '₹38 crore', note: 'up 22% on last year' },
    { label: 'Staff authorised to issue guarantees', value: '2', note: 'unchanged for seven years' },
    { label: 'Maker-checker on issuance', value: 'in place', note: 'both roles held in the branch' },
    { label: 'Job rotation for those two roles', value: 'none since 2019' },
    { label: 'Internal audit findings', value: 'nil', note: 'last four cycles' },
    { label: 'Losses recognised', value: 'nil' },
    { label: 'Average guarantee size', value: '₹47 crore' },
    { label: 'Client concentration', value: 'top 3 clients are 61% of guarantees' },
    { label: 'Branch headcount', value: '19' },
  ],
  flags: [
    {
      id: 'ledger-gap',
      label: '₹940 crore of guarantees that the core ledger has never seen',
    },
    { id: 'annual-recon', label: 'Two systems reconciled once a year' },
    { id: 'no-rotation', label: 'The same two people authorising for seven years' },
    { id: 'local-checker', label: 'Maker and checker both sitting inside the branch' },
    { id: 'clean-audits', label: 'Four clean audit cycles over a control that does not exist' },
    { id: 'fee-growth', label: 'Fee income growing 22%' },
    { id: 'concentration', label: 'Three clients are most of the book' },
    { id: 'small-branch', label: 'A nineteen-person branch' },
  ],
  choices: [
    {
      id: 'clear',
      label: 'Clear it',
      detail: 'Balanced, audited, no losses. Nothing to report.',
      guards: false,
      riskMult: 1,
    },
    {
      id: 'reconcile_daily',
      label: 'Force a daily reconciliation',
      detail: 'Every instrument issued must appear in the ledger the same day.',
      guards: true,
      riskMult: 0.35,
    },
    {
      id: 'escalate',
      label: 'Escalate and rotate the roles',
      detail: 'Refer it up, move the two authorisers, pull the full history.',
      guards: true,
      riskMult: 0.3,
    },
    {
      id: 'note_it',
      label: 'Note it in the report',
      detail: 'Record the observation, no action required of the branch.',
      guards: false,
      riskMult: 0.9,
    },
  ],
  truth: {
    // client concentration, fee growth and branch size are ordinary facts about
    // a trade-finance branch. The gap between two systems, and everything that
    // let it stay open, is the finding.
    realFlags: ['ledger-gap', 'annual-recon', 'no-rotation', 'local-checker', 'clean-audits'],
    soundChoices: ['reconcile_daily', 'escalate'],
    fraudRisk: 0.75,
    drivers: [
      '₹940 crore of live obligations exist on one system and not on the other',
      'a yearly reconciliation cannot catch anything that is settled inside the year',
      'seven years, two people, no rotation, and a checker who reports to the maker',
      'clean audits of a control that was never there are not evidence of anything',
    ],
    echoes: 'pnb-lou',
  },
  teaches: [
    'a clean audit of a missing control tells you nothing',
    'when two systems only have to agree once a year, they are not reconciled',
    'fraud usually needs no false number — only a gap nobody owns',
  ],
}
