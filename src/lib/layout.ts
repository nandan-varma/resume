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

const without = <T>(items: T[], index: number) =>
  items.filter((_, i) => i !== index);

/**
 * Last-resort, deterministic trimming: remove the weakest content first, never
 * touching work experience bullets below two, until the page fits.
 */
export const trimToFit = (resume: Resume): Resume => {
  const r = structuredClone(resume);
  const steps: Array<(r: Resume) => boolean> = [
    // 1. Fourth project and beyond.
    (x) => x.projects.length > 3 && !!(x.projects = x.projects.slice(0, 3)),
    // 2. A third bullet on any project, last project first.
    (x) => {
      const i = x.projects.findLastIndex((p) => p.highlights.length > 2);
      return (
        i >= 0 &&
        !!(x.projects[i].highlights = x.projects[i].highlights.slice(0, 2))
      );
    },
    // 3. Skill groups beyond four.
    (x) => x.skills.length > 4 && !!(x.skills = x.skills.slice(0, 4)),
    // 4. Work bullets beyond three, from the end of the last job.
    (x) => {
      const i = x.work.findLastIndex((w) => w.highlights.length > 3);
      return i >= 0 && !!x.work[i].highlights.pop();
    },
    // 5. A second bullet on the last project, then the project itself.
    (x) => {
      const last = x.projects.at(-1);
      if (last && last.highlights.length > 1) {
        last.highlights.pop();
        return true;
      }
      return (
        x.projects.length > 2 &&
        !!(x.projects = without(x.projects, x.projects.length - 1))
      );
    },
    // 6. Skill groups beyond three.
    (x) => x.skills.length > 3 && !!(x.skills = x.skills.slice(0, 3)),
  ];

  for (const step of steps) {
    while (overflow(r) > 0 && step(r)) {
      // keep applying this step while it still helps
    }
  }
  return r;
};
