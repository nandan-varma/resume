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

import { alignSkillNames, sortSkillItems, toolsIn } from "./skills";

describe("alignSkillNames", () => {
  it("uses the posting's spelling for tools the person already lists", () => {
    expect(
      alignSkillNames(
        "Python, Postgres, K8s",
        "We run PostgreSQL on Kubernetes.",
      ),
    ).toBe("Python, PostgreSQL, Kubernetes");
  });

  it("never adds a tool and leaves matching spellings alone", () => {
    expect(
      alignSkillNames("Python, Rust", "We use PostgreSQL and Kubernetes."),
    ).toBe("Python, Rust");
    expect(alignSkillNames("PostgreSQL, Postgres", "PostgreSQL required")).toBe(
      "PostgreSQL, Postgres",
    );
  });
});

describe("sortSkillItems / toolsIn", () => {
  it("puts what the posting names first, keeping the rest in order", () => {
    expect(
      sortSkillItems("Go, Rust, TypeScript, SQL", "TypeScript and SQL"),
    ).toBe("TypeScript, SQL, Go, Rust");
  });

  it("lists the tools in a text", () => {
    expect(toolsIn("Built it in Rust with Postgres and Kafka")).toEqual(
      expect.arrayContaining(["Rust", "PostgreSQL", "Kafka"]),
    );
  });
});
