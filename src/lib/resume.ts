import { z } from "zod";
import { cleanLine, stripUnsafe } from "./text";

/** Blank string by default, so forms can leave fields empty. */
const text = (title: string) => z.string().default("").meta({ title });
const list = (title: string) => z.array(z.string()).default([]).meta({ title });

/**
 * The single source of truth for a resume. The same schema validates AI
 * output and everything the editor saves.
 * Shaped after the open JSON Resume standard.
 */
export const Resume = z.object({
  basics: z
    .object({
      name: text("Full name"),
      headline: text("Headline"),
      email: text("Email"),
      phone: text("Phone"),
      location: text("Location"),
      links: z
        .array(z.object({ label: text("Label"), url: text("Link") }))
        .default([])
        .meta({ title: "Links (website, GitHub, LinkedIn)" }),
      summary: text("Summary"),
    })
    .default({
      name: "",
      headline: "",
      email: "",
      phone: "",
      location: "",
      links: [],
      summary: "",
    })
    .meta({ title: "About you" }),
  summaries: list("Summary variants").meta({
    title: "Summary variants",
    description:
      "Write a few versions for different kinds of jobs. We pick the closest one and adjust a word or two.",
  }),
  work: z
    .array(
      z.object({
        company: text("Company"),
        position: text("Job title"),
        location: text("Location"),
        start: text("Start (e.g. Jul 2025)"),
        end: text("End (or Present)"),
        highlights: list("What you achieved"),
      }),
    )
    .default([])
    .meta({ title: "Work experience" }),
  education: z
    .array(
      z.object({
        school: text("School"),
        degree: text("Degree"),
        end: text("Graduated"),
        details: text("Details (GPA, honors)"),
      }),
    )
    .default([])
    .meta({ title: "Education" }),
  projects: z
    .array(
      z.object({
        name: text("Project name"),
        url: text("Link"),
        year: text("Year"),
        stack: text("Tools used"),
        tier: text("Priority (T1 best, T2, T3)"),
        status: text("Status (Complete, WIP)"),
        roleFit: text("Best for (e.g. Systems, AI/ML, Backend)"),
        highlights: list("What you achieved"),
      }),
    )
    .default([])
    .meta({ title: "Projects" }),
  skills: z
    .array(
      z.object({
        group: text("Group (e.g. Languages)"),
        items: text("Skills, comma separated"),
      }),
    )
    .default([])
    .meta({ title: "Skills" }),
  leadership: z
    .array(
      z.object({
        role: text("Role"),
        org: text("Organization"),
        dates: text("Dates"),
        details: text("What you did"),
      }),
    )
    .default([])
    .meta({ title: "Leadership and activities" }),
  notes: text("Private notes").meta({
    title: "Private notes",
    description:
      "Only the writer sees this, it is never printed. Work authorization, deal-breakers, anything it should know.",
  }),
});
export type Resume = z.infer<typeof Resume>;

export const PaperSize = z.enum(["a4", "letter"]);

/** Longest set of personal rules we send to the model. */
export const RULES_MAX = 600;

export const Prefs = z.object({
  paper: PaperSize.default("a4"),
  tone: z.enum(["plain", "confident", "warm"]).default("plain"),
  // Cut to size rather than rejected, so an old or edited value never breaks a page.
  rules: z
    .string()
    .default("")
    .transform((v) => stripUnsafe(v, true).slice(0, RULES_MAX)),
});
export type Prefs = z.infer<typeof Prefs>;

export const Match = z.object({
  level: z.enum(["strong", "good", "stretch"]),
  roleType: z
    .string()
    .describe(
      "The kind of role, such as backend, AI/ML, systems, fullstack, native, mobile or devtools.",
    ),
  confidence: z
    .string()
    .describe(
      'Honest chance this resume gets a callback, as a range like "55-70%".',
    ),
  reasons: z
    .array(z.string())
    .describe(
      "Two or three positive reasons this person fits. Never put weaknesses here.",
    ),
  gaps: z
    .array(z.string())
    .describe("Specific things the posting wants that the profile lacks."),
  blockers: z
    .array(z.string())
    .describe(
      "Hard requirements the profile cannot meet, such as citizenship or clearance.",
    ),
});
export type Match = z.infer<typeof Match>;

const Rewrite = z.object({
  index: z.number().int().describe("Index of the item in the profile."),
  highlights: z.array(z.string()).describe("Rewritten bullets for this item."),
});

/**
 * What the model returns. It only chooses items by index and rewords bullets;
 * `assemble` builds the resume from the profile, so names, dates, schools and
 * contact details can never be invented or dropped.
 */
export const Tailored = z.object({
  match: Match,
  summary: z
    .string()
    .describe("Summary of three lines at most, shaped to the role."),
  work: z
    .array(Rewrite)
    .describe(
      "Every job in the profile, most relevant first, with rewritten bullets.",
    ),
  projects: z
    .array(Rewrite)
    .max(4)
    .describe(
      "The best three or four projects for this posting, most relevant first.",
    ),
  skillGroups: z
    .array(z.number().int())
    .describe(
      "Indexes of the skill groups worth showing, most relevant first. Leave out irrelevant groups.",
    ),
  coverLetter: z.string(),
});
export type Tailored = z.infer<typeof Tailored>;

const pick = <T>(items: T[], indexes: number[]) => {
  const seen = new Set<number>();
  return indexes.flatMap((i) => {
    if (seen.has(i) || !items[i]) {
      return [];
    }
    seen.add(i);
    return [i];
  });
};

/** Build the tailored resume from the profile plus the model's choices. */
export const assemble = (source: Resume, out: Tailored): Resume => {
  const reword = <T extends { highlights: string[] }>(
    items: T[],
    rewrites: Tailored["work"],
  ) => {
    const order = pick(
      items,
      rewrites.map((r) => r.index),
    );
    const rest = items.map((_, i) => i).filter((i) => !order.includes(i));
    return [...order, ...rest].map((i) => {
      const bullets =
        rewrites
          .find((r) => r.index === i)
          ?.highlights.filter((h) => h.trim()) ?? [];
      return {
        ...items[i],
        highlights: bullets.length > 0 ? bullets : items[i].highlights,
      };
    });
  };

  const chosen = pick(
    source.projects,
    out.projects.map((p) => p.index),
  );
  const projects = reword(
    chosen.map((i) => source.projects[i]),
    out.projects.map((p) => ({ ...p, index: chosen.indexOf(p.index) })),
  );
  const skillOrder = pick(source.skills, out.skillGroups);
  const skills = (
    skillOrder.length > 0 ? skillOrder : source.skills.map((_, i) => i)
  ).map((i) => source.skills[i]);

  return {
    ...source,
    basics: {
      ...source.basics,
      summary: out.summary.trim() || source.basics.summary,
    },
    work: reword(source.work, out.work),
    projects: projects.length > 0 ? projects : source.projects.slice(0, 3),
    skills,
  };
};

export const emptyResume = (): Resume => Resume.parse({});
export const defaultPrefs = (): Prefs => Prefs.parse({});

export const hasContent = (r: Resume) =>
  r.basics.name.trim() !== "" &&
  (r.work.length > 0 || r.projects.length > 0 || r.education.length > 0);

/** What a profile still needs, so the first run can show clear next steps. */
export const completeness = (r: Resume) => {
  const steps = [
    {
      id: "contact",
      label: "Name and email",
      done: r.basics.name.trim() !== "" && r.basics.email.trim() !== "",
    },
    {
      id: "work",
      label: "Work or education",
      done: r.work.length > 0 || r.education.length > 0,
    },
    { id: "projects", label: "A project", done: r.projects.length > 0 },
    { id: "skills", label: "Skills", done: r.skills.length > 0 },
    {
      id: "summary",
      label: "A short summary",
      done: r.basics.summary.trim() !== "" || r.summaries.length > 0,
    },
  ];
  return { steps, done: steps.filter((s) => s.done).length };
};

const squash = cleanLine;

const blank = (values: string[]) => values.every((v) => v === "");

/**
 * What gets stored. The editor keeps empty bullets and half-filled rows while
 * you work; this drops them and cleans stray spaces, so nothing blank is ever
 * saved, printed or sent to the model. Private notes keep their line breaks.
 */
export const tidy = (r: Resume): Resume => {
  const clean = <T extends Record<string, unknown>>(item: T): T =>
    Object.fromEntries(
      Object.entries(item).map(([k, v]) => [
        k,
        typeof v === "string"
          ? squash(v)
          : Array.isArray(v)
            ? v
                .map((x) => (typeof x === "string" ? squash(x) : x))
                .filter((x) => x !== "")
            : v,
      ]),
    ) as T;
  const rows = <T extends Record<string, unknown>>(
    items: T[],
    keys: (keyof T)[],
  ) =>
    items
      .map(clean)
      .filter(
        (i) =>
          !(
            blank(keys.map((k) => String(i[k] ?? ""))) &&
            (!Array.isArray(i.highlights) || i.highlights.length === 0)
          ),
      );

  return {
    basics: {
      ...clean(r.basics),
      links: r.basics.links
        .map((l) => ({ label: squash(l.label), url: squash(l.url) }))
        .filter((l) => l.url !== "" || l.label !== ""),
    },
    summaries: r.summaries.map(squash).filter((s) => s !== ""),
    work: rows(r.work, ["company", "position", "location", "start", "end"]),
    education: rows(r.education, ["school", "degree", "end", "details"]),
    projects: rows(r.projects, [
      "name",
      "url",
      "year",
      "stack",
      "tier",
      "status",
      "roleFit",
    ]),
    skills: rows(r.skills, ["group", "items"]),
    leadership: rows(r.leadership, ["role", "org", "dates", "details"]),
    notes: r.notes.replace(/ /g, " ").trim(),
  };
};
