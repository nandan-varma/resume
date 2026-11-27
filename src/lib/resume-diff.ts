import type { Resume } from "./resume";

type Work = Resume["work"][number];
type Project = Resume["projects"][number];

const same = (a: string[], b: string[]) =>
  a.length === b.length && a.every((line, i) => line === b[i]);

const key = (...parts: string[]) => parts.join("|").trim().toLowerCase();
export const workKey = (w: Work) => key(w.position, w.company);
export const projectKey = (p: Project) => key(p.name);

/** The profile's version of a job or project, matched by title and company (or project name). */
export const originalWork = (master: Resume, w: Work) =>
  master.work.find((m) => workKey(m) === workKey(w));
export const originalProject = (master: Resume, p: Project) =>
  master.projects.find((m) => projectKey(m) === projectKey(p));

/** True when an item's bullets no longer match what is in the profile. */
export const isReworded = (
  original: { highlights: string[] } | undefined,
  item: { highlights: string[] },
) => original !== undefined && !same(original.highlights, item.highlights);

/** A plain-language account of how a tailored resume differs from the profile. */
export const summarizeChanges = (master: Resume, tailored: Resume) => {
  const rewordedJobs = tailored.work.filter((w) =>
    isReworded(originalWork(master, w), w),
  ).length;
  const rewordedProjects = tailored.projects.filter((p) =>
    isReworded(originalProject(master, p), p),
  ).length;
  return {
    summary: tailored.basics.summary !== master.basics.summary,
    rewordedJobs,
    rewordedProjects,
    projects: tailored.projects.map((p) => p.name),
    projectsTotal: master.projects.length,
    skillGroups: tailored.skills.length,
    skillGroupsTotal: master.skills.length,
  };
};
export type ChangeSummary = ReturnType<typeof summarizeChanges>;
