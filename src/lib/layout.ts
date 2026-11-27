import type { Resume } from "./resume";

export type Paper = "a4" | "letter";
export const PAPERS: Record<Paper, { label: string; w: number; h: number }> = {
  a4: { label: "A4", w: 8.268, h: 11.693 },
  letter: { label: "US Letter", w: 8.5, h: 11 },
};
export const DEFAULT_PAPER: Paper = "a4";

/**
 * A page-fit model for the printable resume (10pt Arial, 0.55in side and 0.42in
 * top and bottom margins). The server cannot measure a DOM, so it counts text
 * lines instead. One "line" is one line of body text; headings and gaps are
 * expressed in lines. Calibrated against the real rendering (layout.test.ts).
 * It leans a little pessimistic: a resume it says fits, fits.
 */
const LETTER_TEXT_WIDTH = 8.5 - 1.1;
const CHARS_PER_LINE = 112;
const BULLET_CHARS_PER_LINE = 108;
const LINE_PT = 13.2;

const widthScale = (paper: Paper) =>
  (PAPERS[paper].w - 1.1) / LETTER_TEXT_WIDTH;

/** Lines of body text that fit on one page. */
export const pageLines = (paper: Paper = DEFAULT_PAPER) =>
  Math.floor(((PAPERS[paper].h - 0.84) * 72) / LINE_PT);

const wrap = (text: string, width: number) =>
  Math.max(1, Math.ceil(text.trim().length / width));

const HEADING = 1.95;
const GAP = 0.25;

/** Estimated lines per section, so feedback can say where the space went. */
export const lineBreakdown = (r: Resume, paper: Paper = DEFAULT_PAPER) => {
  const scale = widthScale(paper);
  const para = CHARS_PER_LINE * scale;
  const bullet = BULLET_CHARS_PER_LINE * scale;
  const { basics, work, education, projects, skills, leadership } = r;
  const bullets = (items: string[]) =>
    items.reduce((sum, h) => sum + wrap(h, bullet), 0);
  const section = (present: boolean, body: () => number) =>
    present ? HEADING + body() : 0;

  // Skill items sit beside the widest group name.
  const widest = skills.reduce((m, s) => Math.max(m, s.group.length), 0);
  const skillWidth = Math.max(40, para - widest * 1.15 - 3);
  const contact = [
    basics.email,
    basics.phone,
    basics.location,
    ...basics.links.map((l) => l.url),
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    header:
      3.3 +
      (basics.headline ? 1.25 : 0) +
      (contact.length > 112 * scale ? 1 : 0),
    summary: section(basics.summary.trim() !== "", () =>
      wrap(basics.summary, para),
    ),
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
      skills.reduce((sum, s) => sum + wrap(s.items, skillWidth), 0),
    ),
    leadership: section(leadership.length > 0, () =>
      leadership.reduce(
        (sum, l) =>
          sum + wrap(`${l.role}, ${l.org} · ${l.dates}. ${l.details}`, para),
        0,
      ),
    ),
    education: section(education.length > 0, () =>
      education.reduce(
        (sum, e) => sum + 1 + wrap(`${e.degree} · ${e.details}`, para),
        0,
      ),
    ),
  };
};

export const estimateLines = (
  r: Resume,
  paper: Paper = DEFAULT_PAPER,
): number =>
  Object.values(lineBreakdown(r, paper)).reduce((sum, n) => sum + n, 0);

/** How many lines the resume runs past one page (zero or less means it fits). */
export const overflow = (
  r: Resume,
  paper: Paper = DEFAULT_PAPER,
  /** Lines to keep free, for a tighter version. */
  reserve = 0,
) => Math.ceil(estimateLines(r, paper) - (pageLines(paper) - reserve));

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
export const trimToFit = (
  resume: Resume,
  paper: Paper = DEFAULT_PAPER,
  reserve = 0,
): Resume => {
  const r = structuredClone(resume);
  for (const cut of cuts) {
    while (overflow(r, paper, reserve) > 0 && cut(r)) {
      // keep applying this cut while it still helps
    }
  }
  return r;
};
