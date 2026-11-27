import type { Resume } from "./resume";

export type Paper = "a4" | "letter";
export const PAPERS: Record<Paper, { label: string; w: number; h: number }> = {
  a4: { label: "A4", w: 8.268, h: 11.693 },
  letter: { label: "US Letter", w: 8.5, h: 11 },
};
const DEFAULT_PAPER: Paper = "a4";

/**
 * A page-fit model for the printable resume (10pt Arial, 0.55in side and 0.42in
 * top and bottom margins). The server cannot measure a DOM, so it simulates
 * word wrapping with Arial's real character widths and counts lines. One
 * "line" is one line of body text (13.2pt); headings and gaps are expressed in
 * lines. Calibrated against the real renderer (layout.test.ts).
 */
const LINE_PT = 13.2;
const MARGIN_X_IN = 1.1;
const MARGIN_Y_IN = 0.84;

/** Helvetica/Arial advance widths per 1000 em for printable ASCII (space to tilde). */
const WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278,
  278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584,
  584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556,
  833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278,
  278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222,
  500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500,
  500, 334, 260, 334, 584,
];

const charWidth = (c: string) => {
  const code = c.charCodeAt(0);
  return code >= 32 && code <= 126 ? WIDTHS[code - 32] : 556;
};

/** Width of text in points at a font size (bold runs about 7% wider). */
const textWidth = (text: string, pt: number, bold = false) => {
  let sum = 0;
  for (const c of text) {
    sum += charWidth(c);
  }
  return (sum / 1000) * pt * (bold ? 1.07 : 1);
};

/** How many lines text takes when wrapped greedily at word breaks into a column. */
const wrapLines = (text: string, widthPt: number, pt = 10) => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return 1;
  }
  const space = textWidth(" ", pt);
  let lines = 1;
  let used = 0;
  for (const word of words) {
    const w = textWidth(word, pt);
    if (used === 0) {
      used = w;
    } else if (used + space + w <= widthPt) {
      used += space + w;
    } else {
      lines += 1;
      used = w;
    }
    // A single word wider than the column breaks onto further lines.
    while (used > widthPt) {
      lines += 1;
      used -= widthPt;
    }
  }
  return lines;
};

export type Pages = 1 | 2;

/** Lines of body text that fit on the page(s). A second page loses a few lines to entries that do not split. */
export const pageLines = (paper: Paper = DEFAULT_PAPER, pages: Pages = 1) =>
  Math.floor(((PAPERS[paper].h - MARGIN_Y_IN) * 72) / LINE_PT) * pages -
  (pages - 1) * 3;

const textWidthPt = (paper: Paper) => (PAPERS[paper].w - MARGIN_X_IN) * 72;

const HEADING = 1.95;
const GAP = 0.25;
const BULLET_INDENT_PT = 11;
const DATE_GAP_PT = 14;

/** Estimated lines per section, so feedback can say where the space went. */
const lineBreakdown = (r: Resume, paper: Paper = DEFAULT_PAPER) => {
  const width = textWidthPt(paper);
  const { basics, work, education, projects, skills, leadership } = r;
  const bullets = (items: string[]) =>
    items.reduce((sum, h) => sum + wrapLines(h, width - BULLET_INDENT_PT), 0);
  const section = (present: boolean, body: () => number) =>
    present ? HEADING + body() : 0;
  /** A title line with a date on the right: the title wraps if it would touch the date. */
  const titleRow = (left: string, date: string) =>
    wrapLines(left, width - textWidth(date, 9.5) - DATE_GAP_PT);

  // Skill items sit beside the widest group name.
  const groupWidth = skills.reduce(
    (m, s) => Math.max(m, textWidth(s.group, 10, true)),
    0,
  );
  const skillWidth = width - groupWidth - 9;
  const contact = [
    basics.email,
    basics.phone,
    basics.location,
    ...basics.links.map((l) => l.url),
  ]
    .filter(Boolean)
    .join(" · ");
  // name 22pt + headline + contact + 7pt gap, in lines of 13.2pt
  const header =
    22 / LINE_PT +
    (basics.headline ? (2 + 11 * 1.32) / LINE_PT : 0) +
    (contact ? (2 + 9 * 1.32 * wrapLines(contact, width, 9)) / LINE_PT : 0) +
    7 / LINE_PT;

  return {
    header,
    summary: section(basics.summary.trim() !== "", () =>
      wrapLines(basics.summary, width),
    ),
    experience: section(work.length > 0, () =>
      work.reduce(
        (sum, job) =>
          sum +
          titleRow(
            `${job.position}, ${job.company} · ${job.location}`,
            `${job.start} – ${job.end}`,
          ) +
          GAP +
          bullets(job.highlights),
        0,
      ),
    ),
    projects: section(projects.length > 0, () =>
      projects.reduce(
        (sum, p) =>
          sum +
          titleRow(`${p.name} · ${p.url}`, p.year) +
          (p.stack ? (9.5 * 1.32) / LINE_PT : 0) +
          GAP +
          bullets(p.highlights),
        0,
      ),
    ),
    skills: section(skills.length > 0, () =>
      skills.reduce((sum, s) => sum + wrapLines(s.items, skillWidth), 0),
    ),
    leadership: section(leadership.length > 0, () =>
      leadership.reduce(
        (sum, l) =>
          sum +
          wrapLines(`${l.role}, ${l.org} · ${l.dates}. ${l.details}`, width),
        0,
      ),
    ),
    education: section(education.length > 0, () =>
      education.reduce(
        (sum, e) =>
          sum +
          titleRow(e.school, e.end) +
          wrapLines(`${e.degree} · ${e.details}`, width),
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

/** How many lines the resume runs past its page(s) (zero or less means it fits). */
export const overflow = (
  r: Resume,
  paper: Paper = DEFAULT_PAPER,
  pages: Pages = 1,
) => Math.ceil(estimateLines(r, paper) - pageLines(paper, pages));

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
  pages: Pages = 1,
): Resume => {
  const r = structuredClone(resume);
  for (const cut of cuts) {
    while (overflow(r, paper, pages) > 0 && cut(r)) {
      // keep applying this cut while it still helps
    }
  }
  return r;
};
