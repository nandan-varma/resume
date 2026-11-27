import { estimateLines, pageLines, trimToFit } from "../layout";
import type { Match, Prefs, Resume } from "../resume";
import { alignSkillNames, matchSkills, sortSkillItems } from "../skills";
import {
  bestSummary,
  detectBlockers,
  fallbackPlan,
  orderBullets,
  type Plan,
  type Posting,
  postingKeywords,
  rankProjects,
} from "./fallback";
import {
  guardBullets,
  letterProblems,
  normalizeLetter,
  polish,
  summaryProblems,
} from "./guards";
import { type Ask, askJson } from "./json";
import { bulletsPrompt, planPrompt, writePrompt } from "./prompts";
import {
  Bullets,
  LetterReply,
  Plan as PlanSchema,
  SummaryReply,
} from "./schemas";

export type TailorInput = {
  posting: Posting;
  resume: Resume;
  prefs: Prefs;
};

export type TailorResult = {
  match: Match;
  resume: Resume;
  /** Empty when the model could not write one that passed our checks. */
  coverLetter: string;
  /** Plain-language notes on anything that did not go as planned. */
  notes: string[];
};

/** Run async jobs a few at a time. */
async function pool<T>(jobs: (() => Promise<T>)[], size: number) {
  const results: T[] = new Array(jobs.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, jobs.length) }, async () => {
      while (next < jobs.length) {
        const i = next++;
        results[i] = await jobs[i]();
      }
    }),
  );
  return results;
}

const unique = (numbers: number[], size: number) => {
  const seen = new Set<number>();
  return numbers.filter((n) => n < size && !seen.has(n) && seen.add(n));
};

const CONFIDENCE = /^\d{1,2}\s*-\s*\d{1,3}\s*%$/;
const LEVELS = ["stretch", "good", "strong"] as const;

/** Trust the model's plan only where it is valid and consistent with what code can verify. */
const mergePlan = (
  got: ReturnType<typeof PlanSchema.parse>,
  fallback: Plan,
  resume: Resume,
): Plan => {
  const projects = unique(got.projects, resume.projects.length);
  const groups = unique(got.skillGroups, resume.skills.length);
  const blockers = [
    ...new Set([...fallback.blockers, ...got.blockers.map(polish)]),
  ]
    .filter(Boolean)
    .slice(0, 4);
  // A model cannot talk its way far above what the posting's named tools support.
  const ceiling = Math.min(LEVELS.indexOf(fallback.level) + 1, 2);
  let level = Math.min(LEVELS.indexOf(got.level), ceiling);
  if (blockers.length > 0) {
    level = Math.min(level, 1);
  }
  const reasons = got.reasons.map(polish).filter(Boolean).slice(0, 3);
  return {
    roleType: polish(got.roleType) || fallback.roleType,
    level: LEVELS[level],
    confidence: CONFIDENCE.test(got.confidence.trim())
      ? got.confidence.replace(/\s+/g, "")
      : "",
    reasons: reasons.length > 0 ? reasons : fallback.reasons,
    gaps: got.gaps.map(polish).filter(Boolean).slice(0, 4),
    blockers,
    projects: projects.length > 0 ? projects : fallback.projects,
    skillGroups: groups.length > 0 ? groups : fallback.skillGroups,
    summaryVariant:
      got.summaryVersion < resume.summaries.length
        ? got.summaryVersion
        : fallback.summaryVariant,
  };
};

/** What the writing steps may say: only things in the resume itself. */
const factsFor = (resume: Resume, description: string) => ({
  name: resume.basics.name,
  headline: resume.basics.headline,
  strengths: matchSkills(resume, description).have,
  items: [
    ...resume.work.slice(0, 2).map((w) => ({
      title: `${w.position} at ${w.company}`,
      bullets: w.highlights.slice(0, 2),
    })),
    ...resume.projects.slice(0, 2).map((p) => ({
      title: p.name,
      bullets: p.highlights.slice(0, 2),
    })),
  ],
});

const sourceText = (resume: Resume) => JSON.stringify({ ...resume, notes: "" });

/**
 * A cover letter for a resume, or "" when the model cannot write one that
 * passes the checks. There is no template: a weak letter is worse than none,
 * and the person can ask again.
 */
export async function writeCoverLetter(
  ask: Ask,
  input: TailorInput,
): Promise<string> {
  const { posting, resume, prefs } = input;
  try {
    const reply = await askJson(ask, {
      label: "letter",
      schema: LetterReply,
      ...writePrompt(
        "letter",
        factsFor(resume, posting.description),
        posting,
        prefs,
      ),
      attempts: 3,
      check: (v) =>
        letterProblems(normalizeLetter(v.letter, resume.basics.name), {
          company: posting.company,
          title: posting.title,
          profileText: sourceText(resume),
          postingText: posting.description,
        }),
    });
    return normalizeLetter(reply.letter, resume.basics.name);
  } catch {
    return "";
  }
}

/**
 * Tailor a resume and cover letter to a posting, on any model.
 *
 * The work is split into small calls (a plan, bullets for each item, a summary,
 * a letter). Every answer is validated, and anything that fails or invents a
 * fact is replaced by the person's own words. A model that is slow, confused
 * or offline therefore costs polish, never correctness, and the resume always
 * fits the page.
 */
export async function tailorPipeline(
  ask: Ask,
  input: TailorInput,
): Promise<TailorResult> {
  const { posting, resume, prefs } = input;
  const { paper, pages } = prefs;
  const notes: string[] = [];
  const description = posting.description;
  const keywords = postingKeywords(`${posting.title}\n${description}`);
  const profileText = sourceText(resume);
  const fallback = fallbackPlan(resume, posting);

  // 1. Plan: what to show, and how well the person fits.
  let plan = fallback;
  try {
    const got = await askJson(ask, {
      label: "plan",
      schema: PlanSchema,
      ...planPrompt(resume, posting, pages),
      attempts: 2,
    });
    plan = mergePlan(got, fallback, resume);
  } catch {
    notes.push(
      "The AI could not assess this job, so we chose projects and skills by matching the posting and left out the callback odds.",
    );
  }
  plan = {
    ...plan,
    blockers: [...new Set([...plan.blockers, ...detectBlockers(description)])],
  };

  // 2. Bullets for every job and each chosen project, a few calls at a time.
  const chosen = plan.projects.slice(0, pages === 2 ? 6 : 4);
  const limits = { maxCount: 4, maxChars: 190 };
  let kept = 0;

  const improve =
    (title: string, stack: string | undefined, original: string[]) =>
    async () => {
      if (original.length === 0) {
        return original;
      }
      const ordered = orderBullets(original, keywords);
      try {
        const reply = await askJson(ask, {
          label: `bullets: ${title}`,
          schema: Bullets,
          ...bulletsPrompt(
            { title, stack, bullets: original },
            posting,
            keywords,
            prefs,
            limits,
          ),
          attempts: 2,
        });
        const guarded = guardBullets(reply.bullets, {
          original: ordered,
          profileText,
          ...limits,
        });
        if (guarded.usedModel) {
          return guarded.bullets;
        }
      } catch {
        // fall through to the person's own wording
      }
      kept++;
      return ordered.slice(0, limits.maxCount);
    };

  const done = await pool(
    [
      ...resume.work.map((w) =>
        improve(`${w.position} at ${w.company}`, undefined, w.highlights),
      ),
      ...chosen.map((i) =>
        improve(
          resume.projects[i].name,
          resume.projects[i].stack,
          resume.projects[i].highlights,
        ),
      ),
    ],
    5,
  );
  if (kept > 0) {
    notes.push(
      `We kept your own wording for ${kept} ${kept === 1 ? "item" : "items"}, because the AI's version added claims or was not usable.`,
    );
  }

  // 3. Assemble from the profile: facts always come from the person.
  const built: Resume = {
    ...resume,
    basics: { ...resume.basics },
    summaries: [],
    notes: "",
    work: resume.work.map((w, i) => ({ ...w, highlights: done[i] })),
    projects: chosen.map((i, n) => ({
      ...resume.projects[i],
      highlights: done[resume.work.length + n],
    })),
    skills: (plan.skillGroups.length > 0
      ? plan.skillGroups
      : resume.skills.map((_, i) => i)
    ).map((i) => ({
      ...resume.skills[i],
      items: alignSkillNames(
        sortSkillItems(resume.skills[i].items, description),
        description,
      ),
    })),
  };

  // 4. Summary and letter, as separate small calls so one can succeed without the other.
  const [summaryResult, coverLetter] = await Promise.all([
    askJson(ask, {
      label: "summary",
      schema: SummaryReply,
      ...writePrompt("summary", factsFor(built, description), posting, prefs),
      attempts: 3,
      check: (v) => summaryProblems(polish(v.summary), profileText),
    }).then(
      (v) => polish(v.summary),
      () => undefined,
    ),
    writeCoverLetter(ask, { posting, resume: built, prefs }),
  ]);
  built.basics.summary =
    summaryResult ??
    (resume.summaries[plan.summaryVariant] ||
      bestSummary(resume, keywords).text ||
      resume.basics.summary);
  if (summaryResult === undefined && built.basics.summary) {
    notes.push(
      "We used one of your own summaries, because the AI's version did not pass our checks.",
    );
  }
  if (!coverLetter) {
    notes.push(
      "The AI could not write a cover letter that passed our checks. Open the Cover letter tab and press Write it again.",
    );
  }

  // 5. Use spare room on the page, then guarantee the fit.
  for (const i of rankProjects(resume, keywords, plan.roleType).filter(
    (i) => !chosen.includes(i),
  )) {
    if (built.projects.length >= (pages === 2 ? 8 : 5)) {
      break;
    }
    const projects = [
      ...built.projects,
      {
        ...resume.projects[i],
        highlights: orderBullets(resume.projects[i].highlights, keywords).slice(
          0,
          2,
        ),
      },
    ];
    if (
      estimateLines({ ...built, projects }, paper) >
      pageLines(paper, pages) - 1
    ) {
      break;
    }
    built.projects = projects;
  }

  return {
    match: {
      level: plan.level,
      roleType: plan.roleType,
      confidence: plan.confidence,
      reasons: plan.reasons,
      gaps: plan.gaps,
      blockers: plan.blockers,
    },
    resume: trimToFit(built, paper, pages),
    coverLetter,
    notes,
  };
}
