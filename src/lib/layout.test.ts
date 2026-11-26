import { describe, expect, it } from "vitest";
import { estimateLines, overflow, PAGE_LINES, trimToFit } from "./layout";
import { Resume } from "./resume";

const bullet =
  "Built a service used by forty teams that cut manual planning time by thirty percent across the company.";
const project = (name: string) => ({
  name,
  stack: "TS",
  highlights: [bullet, bullet, bullet],
});

const big = Resume.parse({
  basics: { name: "Ada", headline: "Engineer", summary: bullet },
  work: [
    {
      company: "A",
      position: "Dev",
      highlights: [bullet, bullet, bullet, bullet, bullet],
    },
  ],
  projects: ["P1", "P2", "P3", "P4", "P5"].map(project),
  skills: Array.from({ length: 8 }, (_, i) => ({
    group: `G${i}`,
    items: bullet,
  })),
  leadership: [{ role: "Lead", org: "Club", dates: "2022", details: bullet }],
  education: [{ school: "U", degree: "BS", details: "GPA 3.9" }],
});

describe("page fit", () => {
  it("counts an oversized resume as overflowing", () => {
    expect(overflow(big)).toBeGreaterThan(0);
  });

  it("trims deterministically until it fits, keeping work and education", () => {
    const fitted = trimToFit(big);
    expect(estimateLines(fitted)).toBeLessThanOrEqual(PAGE_LINES);
    expect(fitted.work).toHaveLength(1);
    expect(fitted.education).toHaveLength(1);
    expect(fitted.projects.length).toBeLessThanOrEqual(3);
    expect(fitted.projects[0].name).toBe("P1");
  });

  it("leaves a resume that already fits untouched", () => {
    const small = Resume.parse({
      basics: { name: "Ada" },
      work: [{ company: "A", highlights: ["One bullet."] }],
    });
    expect(trimToFit(small)).toEqual(small);
  });
});
