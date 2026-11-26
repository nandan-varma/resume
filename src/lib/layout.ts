import type { Resume } from "./resume";

/**
 * A page-fit model for the printable resume (US Letter, 9.5pt Arial).
 * The server cannot measure a DOM, so it counts text lines instead. One
 * "line" is one line of body text; headings and gaps are expressed in lines.
 * Calibrated against the real rendering (see layout.test.ts).
 */
const CHARS_PER_LINE = 118;
const BULLET_CHARS_PER_LINE = 112;
const SKILL_CHARS_PER_LINE = 100;
export const PAGE_LINES = 59;

const wrap = (text: string, width = CHARS_PER_LINE) =>
  Math.max(1, Math.ceil(text.trim().length / width));

const HEADING = 1.75;
const GAP = 0.3;

/** Estimated lines per section, so feedback can say where the space went. */
export const lineBreakdown = (r: Resume) => {
  const { basics, work, education, projects, skills, leadership } = r;
  const bullets = (items: string[]) =>
    items.reduce((sum, h) => sum + wrap(h, BULLET_CHARS_PER_LINE), 0);
  const section = (present: boolean, body: () => number) =>
    present ? HEADING + body() : 0;

  return {
    header: 1.6 + (basics.headline ? 1 : 0) + 1,
    summary: section(basics.summary.trim() !== "", () => wrap(basics.summary)),
    experience: section(work.length > 0, () =>
      work.reduce((sum, job) => sum + 1 + GAP + bullets(job.highlights), 0),
    ),
    projects: section(projects.length > 0, () =>
      projects.reduce(
        (sum, p) => sum + 1 + (p.stack ? 1 : 0) + GAP + bullets(p.highlights),
        0,
      ),
    ),
    skills: section(skills.length > 0, () =>
      skills.reduce((sum, s) => sum + wrap(s.items, SKILL_CHARS_PER_LINE), 0),
    ),
    leadership: section(leadership.length > 0, () =>
      leadership.reduce(
        (sum, l) =>
          sum + wrap(`${l.role}, ${l.org} (${l.dates}): ${l.details}`),
        0,
      ),
    ),
    education: section(education.length > 0, () =>
      education.reduce(
        (sum, e) => sum + 1 + wrap(`${e.degree} | ${e.details}`),
        0,
      ),
    ),
  };
};

export const estimateLines = (r: Resume): number =>
  Object.values(lineBreakdown(r)).reduce((sum, n) => sum + n, 0);

/** How many lines the resume runs past one page (zero or less means it fits). */
export const overflow = (r: Resume) => Math.ceil(estimateLines(r) - PAGE_LINES);

/** Each step makes one small cut and reports whether it changed anything. */
type Cut = (r: Resume) => boolean;

const keepFirst = <T>(items: T[], count: number) => {
  if (items.length <= count) {
    return false;
  }
  items.length = count;
  return true;
};

const cuts: Cut[] = [
  // 1. A fourth project and beyond.
  (r) => keepFirst(r.projects, 3),
  // 2. A third bullet on any project, last project first.
  (r) => {
    const project = r.projects.findLast((p) => p.highlights.length > 2);
    return project ? keepFirst(project.highlights, 2) : false;
  },
  // 3. Skill groups beyond four.
  (r) => keepFirst(r.skills, 4),
  // 4. A work bullet beyond three, from the end of the last job.
  (r) => {
    const job = r.work.findLast((w) => w.highlights.length > 3);
    return job ? keepFirst(job.highlights, job.highlights.length - 1) : false;
  },
  // 5. The last project's second bullet, then the project itself.
  (r) => {
    const last = r.projects.at(-1);
    if (last && last.highlights.length > 1) {
      return keepFirst(last.highlights, last.highlights.length - 1);
    }
    return r.projects.length > 2
      ? keepFirst(r.projects, r.projects.length - 1)
      : false;
  },
  // 6. Skill groups beyond three.
  (r) => keepFirst(r.skills, 3),
];

/**
 * Last-resort, deterministic trimming: remove the weakest content first,
 * never touching jobs or schools, until the page fits.
 */
export const trimToFit = (resume: Resume): Resume => {
  const r = structuredClone(resume);
  for (const cut of cuts) {
    while (overflow(r) > 0 && cut(r)) {
      // keep applying this cut while it still helps
    }
  }
  return r;
};
