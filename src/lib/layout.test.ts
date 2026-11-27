import { describe, expect, it } from "vitest";
import { estimateLines, overflow, pageLines, trimToFit } from "./layout";
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
    expect(estimateLines(fitted, "a4")).toBeLessThanOrEqual(pageLines("a4"));
    expect(
      estimateLines(trimToFit(big, "letter"), "letter"),
    ).toBeLessThanOrEqual(pageLines("letter"));
    expect(fitted.work).toHaveLength(1);
    expect(fitted.education).toHaveLength(1);
    expect(fitted.projects.length).toBeLessThanOrEqual(3);
    expect(fitted.projects[0].name).toBe("P1");
  });

  it("fits more lines on A4 than on Letter", () => {
    expect(pageLines("a4")).toBeGreaterThan(pageLines("letter"));
    expect(pageLines("letter")).toBe(55);
  });

  it("gives a second page about twice the room, minus entries that do not split", () => {
    expect(pageLines("a4", 2)).toBe(pageLines("a4") * 2 - 3);
    expect(overflow(big, "a4", 2)).toBeLessThan(overflow(big, "a4", 1));
    const one = trimToFit(big, "a4", 1);
    const two = trimToFit(big, "a4", 2);
    expect(estimateLines(two, "a4")).toBeGreaterThan(estimateLines(one, "a4"));
    expect(overflow(two, "a4", 2)).toBeLessThanOrEqual(0);
  });

  it("matches the real renderer on a calibration resume", () => {
    // Measured in Chrome at 10pt Arial: 36.76 lines of content on both A4 and Letter.
    const sample = Resume.parse({
      basics: {
        name: "N",
        headline: "Software Engineer",
        email: "contact@nandan.fyi",
        phone: "206-837-3361",
        location: "Seattle, WA",
        links: [
          { url: "nandan.fyi" },
          { url: "github.com/nandan-varma" },
          { url: "linkedin.com/in/nandanvarma" },
        ],
        summary:
          "Software engineer who builds scalable backend systems and AI-powered features. Comfortable with the full code lifecycle: design, deployment, and operations. Learns new tools fast and ships code that makes a real difference for users.",
      },
      work: [
        {
          company: "H",
          position: "Software Engineer Intern",
          highlights: [
            "Designed and shipped an LLM tool-calling feature across multiple microservices, cutting user intent-to-action time by 50% and reaching 20% adoption in its first week.",
            "Built a React chat interface and inline content summaries for production, reducing time users spent searching large content collections.",
            "Engineered an LLM-powered compilation engine that tracked content changes and regenerated outputs, reducing stale content issues.",
          ],
        },
      ],
      projects: [
        {
          name: "PushStack - GitHub-Compatible Code Forge",
          stack:
            "TanStack Start, isomorphic-git, Neon, Drizzle, Cloudflare R2, Playwright",
          highlights: [
            "Built a GitHub-compatible code forge with Git smart-HTTP over Cloudflare R2, a REST API compatible with the gh CLI, code browsing, diffs, issues, pull requests, and global search; tested it end to end with Playwright.",
          ],
        },
      ],
      skills: [
        {
          group: "Distributed Systems",
          items:
            "Microservices, fault-tolerant service design, scalable data pipelines, REST, SSE, OAuth",
        },
        {
          group: "Languages",
          items:
            "Python, TypeScript, JavaScript, Java, C, C++/17, Rust, Go, Swift, C#, SQL, Bash, x86_64 assembly",
        },
      ],
      leadership: [
        {
          role: "Technical Coordinator",
          org: "Metarics Data Science Club, BVRIT",
          dates: "2021-2024",
          details:
            "Built club websites, raised event participation by 30%, led education across 4 hackathons reaching 150+ projects.",
        },
      ],
      education: [
        {
          school: "Seattle University",
          degree: "M.S. Computer Science",
          end: "June 2026",
          details: "GPA: 3.9/4.0.",
        },
      ],
    });
    const estimate = estimateLines(sample, "letter");
    // Never below the real height (it must not say "fits" when it does not), and close to it.
    expect(estimate).toBeGreaterThanOrEqual(36.76);
    expect(estimate).toBeLessThanOrEqual(37.9);
    const a4 = estimateLines(sample, "a4");
    expect(a4).toBeGreaterThanOrEqual(36.76);
    expect(a4).toBeLessThanOrEqual(37.9);
  });

  it("leaves a resume that already fits untouched", () => {
    const small = Resume.parse({
      basics: { name: "Ada" },
      work: [{ company: "A", highlights: ["One bullet."] }],
    });
    expect(trimToFit(small)).toEqual(small);
  });
});
