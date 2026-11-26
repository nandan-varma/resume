import type { RJSFSchema } from "@rjsf/utils";
import { z } from "zod";

/** Blank string by default, so forms can leave fields empty. */
const text = (title: string) => z.string().default("").meta({ title });
const list = (title: string) => z.array(z.string()).default([]).meta({ title });

/**
 * The single source of truth for a resume. The same schema validates AI
 * output, validates saved forms, and (as JSON Schema) generates the editor.
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

export const Prefs = z.object({
  tone: z
    .enum(["plain", "confident", "warm"])
    .default("plain")
    .meta({ title: "How should it sound?" }),
  rules: text("Your own rules (optional)").meta({
    title: "Your own rules (optional)",
    description: 'For example: "Never mention my first internship."',
  }),
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

/** JSON Schema for the editor form. `input` mode keeps defaulted fields optional. */
export const toFormSchema = (schema: z.ZodType): RJSFSchema => {
  const { $schema: _ignored, ...jsonSchema } = z.toJSONSchema(schema, {
    target: "draft-7",
    io: "input",
  });
  return jsonSchema as RJSFSchema;
};

export const hasContent = (r: Resume) =>
  r.basics.name.trim() !== "" &&
  (r.work.length > 0 || r.projects.length > 0 || r.education.length > 0);
