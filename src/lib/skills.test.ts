import { describe, expect, it } from "vitest";
import { Resume } from "./resume";
import { matchSkills } from "./skills";

const resume = Resume.parse({
  skills: [{ group: "Languages", items: "TypeScript, Postgres, React" }],
  work: [{ highlights: ["Built a Node API on AWS"] }],
});

describe("matchSkills", () => {
  const posting =
    "We use TypeScript, React, PostgreSQL and Kubernetes. Some Java and Kubernetes too.";

  it("splits named tools into covered and missing", () => {
    const m = matchSkills(resume, posting);
    expect(m.have).toEqual(
      expect.arrayContaining(["TypeScript", "React", "PostgreSQL"]),
    );
    expect(m.missing).toEqual(["Kubernetes", "Java"]);
    expect(m.covered).toBe(3);
    expect(m.total).toBe(5);
  });

  it("does not find Java inside JavaScript", () => {
    expect(matchSkills(resume, "We write JavaScript.").missing).toEqual([
      "JavaScript",
    ]);
    expect(matchSkills(resume, "We write JavaScript.").missing).not.toContain(
      "Java",
    );
  });

  it("knows other names for the same tool", () => {
    expect(matchSkills(resume, "Postgres experience").have).toEqual([
      "PostgreSQL",
    ]);
  });

  it("handles postings that name nothing", () => {
    expect(matchSkills(resume, "Great team, free lunch.").total).toBe(0);
  });
});
