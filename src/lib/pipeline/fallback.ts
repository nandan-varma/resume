import type { Match, Resume } from "../resume";
import { matchSkills, toolsIn } from "../skills";

/**
 * Everything here is plain code. It is what the app does when a model is
 * missing, offline or not good enough, so a bad AI can lower the polish of a
 * resume but never its correctness.
 */

export type Posting = { title: string; company: string; description: string };

const STOP = new Set(
  "the and for with you your our are will have this that from they their who what when where which about into over more than also can able work team role join help build using used years year experience ability strong looking should must including across within such other new all any one two its has been being per".split(
    " ",
  ),
);

/** The words and tools a posting leans on most, best first. */
export const postingKeywords = (posting: string, max = 16) => {
  const counts = new Map<string, number>();
  for (const word of posting.toLowerCase().split(/[^\p{L}\p{N}+#.]+/u)) {
    const w = word.replace(/^\.+|\.+$/g, "");
    if (w.length >= 4 && !STOP.has(w) && !/^\d+$/.test(w)) {
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  const tools = toolsIn(posting);
  const common = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .filter((w) => !tools.some((t) => t.toLowerCase() === w));
  return [...tools, ...common].slice(0, max);
};

/** How strongly a text matches a posting's keywords: 0 and up. */
const relevance = (text: string, keywords: string[]) => {
  const lower = text.toLowerCase();
  return keywords.reduce(
    (sum, k, i) =>
      sum +
      (lower.includes(k) ? 1 + (keywords.length - i) / keywords.length : 0),
    0,
  );
};

const BLOCKERS: [RegExp, string][] = [
  [
    /security clearance|ts\/sci|top secret|secret clearance|public trust/i,
    "The posting asks for a security clearance.",
  ],
  [
    /u\.?s\.? citizen(?:ship)?|citizenship (?:is )?required|permanent resident|green card/i,
    "The posting requires US citizenship or permanent residency.",
  ],
  [
    /(?:do(?:es)? not|don't|doesn't|won't|will not|cannot|can't|unable to)\s+(?:offer\s+|provide\s+)?(?:visa\s+)?sponsor|\bno (?:visa )?sponsorship|without (?:visa )?sponsorship|sponsorship (?:is )?not (?:available|offered)/i,
    "The company does not sponsor work visas.",
  ],
  [/export control|\bitar\b/i, "Export-control rules apply to this role."],
];

export const detectBlockers = (description: string) =>
  BLOCKERS.filter(([pattern]) => pattern.test(description)).map(
    ([, message]) => message,
  );

const ROLE_TYPES: [RegExp, string][] = [
  [
    /machine learning|\bml\b|\bai\b|\bllm\b|data scientist|applied scientist/i,
    "AI/ML",
  ],
  [/ios|android|mobile|swift|kotlin/i, "mobile"],
  [/security|appsec|infosec/i, "security"],
  [
    /embedded|firmware|kernel|compiler|systems|low.?level|operating system/i,
    "systems",
  ],
  [/devops|sre|reliability|platform|infrastructure|cloud/i, "infrastructure"],
  [/front.?end|ui engineer|web developer/i, "frontend"],
  [/full.?stack/i, "fullstack"],
  [/data engineer|analytics|big data/i, "data"],
  [/back.?end|api|server|distributed/i, "backend"],
];

const roleTypeOf = (title: string, description = "") => {
  for (const [pattern, type] of ROLE_TYPES) {
    if (pattern.test(title)) {
      return type;
    }
  }
  for (const [pattern, type] of ROLE_TYPES) {
    if (pattern.test(description.slice(0, 800))) {
      return type;
    }
  }
  return "software";
};

/** Projects, best fit for a posting first, as indexes into the profile. */
export const rankProjects = (
  resume: Resume,
  keywords: string[],
  roleType: string,
) =>
  resume.projects
    .map((p, index) => {
      const text = `${p.name} ${p.stack} ${p.roleFit} ${p.highlights.join(" ")}`;
      const tier = /t1/i.test(p.tier) ? 1.5 : /t2/i.test(p.tier) ? 0.75 : 0;
      const fit = p.roleFit
        .toLowerCase()
        .includes(roleType.toLowerCase().split("/")[0])
        ? 2
        : 0;
      const year = Number((p.year.match(/20\d\d/g) ?? ["0"]).at(-1));
      const recent = year >= 2025 ? 1 : year >= 2023 ? 0.5 : 0;
      const done = /wip|progress/i.test(p.status) ? -1 : 0;
      return {
        index,
        score: relevance(text, keywords) + tier + fit + recent + done,
      };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((p) => p.index);

const rankSkillGroups = (resume: Resume, keywords: string[]) =>
  resume.skills
    .map((s, index) => ({
      index,
      score: relevance(`${s.group} ${s.items}`, keywords),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .filter((s, i) => s.score > 0 || i < 3)
    .map((s) => s.index);

export const bestSummary = (resume: Resume, keywords: string[]) => {
  const options =
    resume.summaries.length > 0
      ? resume.summaries
      : [resume.basics.summary].filter(Boolean);
  if (options.length === 0) {
    return { text: "", index: 0 };
  }
  const scored = options.map((text, index) => ({
    text,
    index,
    score: relevance(text, keywords),
  }));
  return scored.sort((a, b) => b.score - a.score || a.index - b.index)[0];
};

export type Plan = {
  roleType: string;
  level: Match["level"];
  confidence: string;
  reasons: string[];
  gaps: string[];
  blockers: string[];
  projects: number[];
  skillGroups: number[];
  summaryVariant: number;
};

/** A complete, sensible plan from the profile and the posting alone. */
export const fallbackPlan = (resume: Resume, posting: Posting): Plan => {
  const keywords = postingKeywords(`${posting.title}\n${posting.description}`);
  const roleType = roleTypeOf(posting.title, posting.description);
  const skills = matchSkills(resume, posting.description);
  const blockers = detectBlockers(posting.description);
  const coverage = skills.total === 0 ? 0.5 : skills.covered / skills.total;
  const level: Match["level"] =
    blockers.length > 0
      ? coverage >= 0.7
        ? "good"
        : "stretch"
      : coverage >= 0.7
        ? "strong"
        : coverage >= 0.4
          ? "good"
          : "stretch";
  const projects = rankProjects(resume, keywords, roleType);
  const reasons: string[] = [];
  if (skills.have.length > 0) {
    reasons.push(
      `Your profile already shows ${skills.have.slice(0, 4).join(", ")}, which the posting names.`,
    );
  }
  if (projects[0] !== undefined) {
    reasons.push(
      `Your project ${resume.projects[projects[0]].name} is close to this kind of work.`,
    );
  }
  return {
    roleType,
    level,
    // Odds of a callback are the model's judgement; code does not invent them.
    confidence: "",
    reasons,
    gaps:
      skills.missing.length > 0
        ? [
            `The posting names ${skills.missing.slice(0, 3).join(", ")}, which are not on your profile.`,
          ]
        : [],
    blockers,
    projects: projects.slice(0, 4),
    skillGroups: rankSkillGroups(resume, keywords),
    summaryVariant: bestSummary(resume, keywords).index,
  };
};

/** Order bullets so the ones closest to the posting lead. Nothing is added or removed. */
export const orderBullets = (bullets: string[], keywords: string[]) =>
  bullets
    .map((b, i) => ({ b, i, score: relevance(b, keywords) }))
    .sort((x, y) => y.score - x.score || x.i - y.i)
    .map((x) => x.b);
