import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  assemble,
  defaultPrefs,
  emptyResume,
  hasContent,
  Resume,
  type Tailored,
  Tailored as TailoredSchema,
  toFormSchema,
} from "./resume";

describe("Resume", () => {
  it("fills every missing field with a blank default", () => {
    const resume = Resume.parse({ basics: { name: "Ada" } });
    expect(resume.basics.email).toBe("");
    expect(resume.work).toEqual([]);
  });

  it("treats a name plus any experience as a usable profile", () => {
    expect(hasContent(emptyResume())).toBe(false);
    const filled = Resume.parse({
      basics: { name: "Ada" },
      projects: [{ name: "Engine" }],
    });
    expect(hasContent(filled)).toBe(true);
  });

  it("builds a form schema where nothing is required", () => {
    const schema = toFormSchema(Resume);
    expect(schema).not.toHaveProperty("$schema");
    expect(schema.required ?? []).toEqual([]);
  });

  it("has a default writing tone", () => {
    expect(defaultPrefs().tone).toBe("plain");
  });
});

describe("assemble", () => {
  const source = Resume.parse({
    basics: { name: "Ada", email: "ada@example.com", summary: "Old summary" },
    work: [
      { company: "A", position: "Dev", highlights: ["one"] },
      { company: "B", position: "Lead", highlights: ["two"] },
    ],
    projects: [
      { name: "P0" },
      { name: "P1", highlights: ["p1"] },
      { name: "P2" },
      { name: "P3" },
    ],
    skills: [
      { group: "Langs", items: "TS" },
      { group: "Tools", items: "Git" },
    ],
  });
  const base = {
    match: {
      level: "good",
      roleType: "backend",
      confidence: "50-60%",
      reasons: [],
      gaps: [],
      blockers: [],
    },
    summary: "",
    work: [],
    projects: [],
    skillGroups: [],
    coverLetter: "",
  } satisfies Tailored;

  it("keeps everything from the profile when the model returns nothing useful", () => {
    const result = assemble(source, base);
    expect(result.basics).toEqual(source.basics);
    expect(result.work).toEqual(source.work);
    expect(result.projects.map((p) => p.name)).toEqual(["P0", "P1", "P2"]);
  });

  it("applies reordering and rewritten bullets without touching facts", () => {
    const result = assemble(source, {
      ...base,
      summary: "New summary",
      work: [{ index: 1, highlights: ["better two"] }],
      projects: [
        { index: 3, highlights: ["new"] },
        { index: 1, highlights: [] },
        { index: 9, highlights: ["x"] },
      ],
      skillGroups: [1],
    });
    expect(result.basics.summary).toBe("New summary");
    expect(result.basics.email).toBe("ada@example.com");
    expect(result.work.map((w) => [w.company, w.highlights])).toEqual([
      ["B", ["better two"]],
      ["A", ["one"]],
    ]);
    expect(result.projects.map((p) => [p.name, p.highlights])).toEqual([
      ["P3", ["new"]],
      ["P1", ["p1"]],
    ]);
    expect(result.skills.map((s) => s.group)).toEqual(["Tools"]);
  });
});

describe("AI JSON Schema", () => {
  it("lists every property as required, as OpenAI strict mode demands", () => {
    const check = (node: unknown): void => {
      if (!node || typeof node !== "object") {
        return;
      }
      const n = node as {
        properties?: Record<string, unknown>;
        required?: string[];
        items?: unknown;
      };
      if (n.properties) {
        expect(n.required?.slice().sort()).toEqual(
          Object.keys(n.properties).sort(),
        );
        Object.values(n.properties).forEach(check);
      }
      check(n.items);
    };
    check(z.toJSONSchema(Resume, { io: "output", target: "draft-7" }));
    check(z.toJSONSchema(TailoredSchema, { io: "output", target: "draft-7" }));
  });
});
