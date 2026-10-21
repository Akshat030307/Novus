/**
 * What the TinyFish Agent is asked to do with a syllabus, in one place.
 *
 * Shared, unchanged, by the Supabase function that runs it live for a teacher
 * (syllabus-plan/index.ts, on Deno) and by the script that pre-reads the demo
 * syllabus (tools/tinyfish/syllabus.mjs, on Node). Plain JavaScript with no
 * imports, so both runtimes load the same file and the two can never drift.
 *
 * The Agent only reads. It returns the courses and units the document lists,
 * as typed fields. Matching those units to Novus modules and drills is a rule
 * in src/sim/syllabus.ts, so a teacher can see exactly why each match was made.
 */

export const SYLLABUS_GOAL =
  'This is a university or college syllabus, possibly a PDF. It usually contains several courses ' +
  '(often five to ten, across one or more semesters). Go through every page to the end; do not stop ' +
  'after the first course. List every course (also called a paper or subject). For each course give its title ' +
  'and semester as written. For each unit or module of that course give its title, every topic it ' +
  'lists as short phrases in the order written (all of them, not a summary), and the teaching hours or number of lectures if the ' +
  'document states them, or the number of weeks if it states weeks instead. Also give the institution and programme name if shown. Use only what the ' +
  'document says; leave a field empty rather than guess.'

export const SYLLABUS_SCHEMA = {
  type: 'object',
  properties: {
    institution: { type: 'string' },
    programme: { type: 'string' },
    courses: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          semester: { type: 'string' },
          units: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                topics: { type: 'array', items: { type: 'string' } },
                hours: { type: 'number' }, // teaching hours or lectures, if stated
                weeks: { type: 'number' }, // or the weeks, where a syllabus counts in weeks
              },
              required: ['title'],
            },
          },
        },
        required: ['title', 'units'],
      },
    },
  },
  required: ['courses'],
}

/** a run is capped so one bad link cannot burn credits for ten minutes */
export const SYLLABUS_MAX_SECONDS = 420

/**
 * Keep only what is safe and useful to show: strings trimmed and capped,
 * empty units dropped, hours that are not plausible numbers removed. The Agent
 * returns typed fields, but this is still text from somebody else's website.
 */
export function cleanSyllabus(raw) {
  // the site carries no em dashes, so text from somebody else's document loses its own
  const str = (v, n = 160) =>
    typeof v === 'string' ? v.replace(/\s*\u2014\s*/g, ': ').replace(/\s+/g, ' ').trim().slice(0, n) : ''
  // what an Agent writes when a document has no detail for something: a
  // placeholder is not a unit, and a course of placeholders is not a course
  const filler = (v) => !v || /^(n\/?a|none|nil|-+|not (detailed|specified|available|given|stated)\b.*)$/i.test(v)
  const data = raw?.result && !raw.courses ? raw.result : raw ?? {}
  const courses = (Array.isArray(data.courses) ? data.courses : [])
    .slice(0, 40)
    .map((c) => ({
      title: str(c?.title),
      semester: str(c?.semester, 40),
      units: (Array.isArray(c?.units) ? c.units : [])
        .slice(0, 12)
        .map((u) => {
          const hours = Number(u?.hours)
          const weeks = Number(u?.weeks)
          return {
            title: str(u?.title),
            topics: (Array.isArray(u?.topics) ? u.topics : []).map((t) => str(t, 120)).filter((t) => !filler(t)).slice(0, 20),
            hours: Number.isFinite(hours) && hours > 0 && hours <= 120 ? hours : null,
            weeks: Number.isFinite(weeks) && weeks > 0 && weeks <= 20 ? weeks : null,
          }
        })
        .filter((u) => !filler(u.title)),
    }))
    .filter((c) => c.title && c.units.length)
  return { institution: str(data.institution), programme: str(data.programme), courses }
}
