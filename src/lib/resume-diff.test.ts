import { describe, expect, it } from "vitest";
import { Resume } from "./resume";
import { originalWork, summarizeChanges } from "./resume-diff";

const master = Resume.parse({
  basics: { summary: "Old" },
  work: [{ company: "A", position: "Dev", highlights: ["one", "two"] }],
  projects: [
    { name: "P1", highlights: ["x"] },
    { name: "P2", highlights: ["y"] },
  ],
  skills: [
    { group: "Lang", items: "TS" },
    { group: "Ops", items: "AWS" },
  ],
});

describe("summarizeChanges", () => {
  it("reports nothing for an untouched copy", () => {
    const s = summarizeChanges(master, structuredClone(master));
    expect(s).toMatchObject({
      summary: false,
      rewordedJobs: 0,
      rewordedProjects: 0,
    });
  });

  it("reports rewording, project picks and skills", () => {
    const tailored = structuredClone(master);
    tailored.basics.summary = "New";
    tailored.work[0].highlights = ["one, but sharper"];
    tailored.projects = [tailored.projects[1]];
    tailored.skills = [tailored.skills[0]];
    const s = summarizeChanges(master, tailored);
    expect(s.summary).toBe(true);
    expect(s.rewordedJobs).toBe(1);
    expect(s.projects).toEqual(["P2"]);
    expect(s.projectsTotal).toBe(2);
    expect(s.skillGroups).toBe(1);
  });

  it("finds the original job even if its bullets changed", () => {
    expect(originalWork(master, { ...master.work[0], highlights: [] })).toBe(
      master.work[0],
    );
  });
});
