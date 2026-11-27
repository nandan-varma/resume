import { describe, expect, it } from "vitest";
import {
  completeness,
  defaultPrefs,
  emptyResume,
  hasContent,
  mergeImport,
  Resume,
  tidy,
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

  it("lists what a profile still needs", () => {
    expect(completeness(emptyResume()).done).toBe(0);
    const filled = Resume.parse({
      basics: { name: "Ada", email: "ada@example.com" },
      work: [{ company: "A" }],
    });
    const { steps, done } = completeness(filled);
    expect(done).toBe(2);
    expect(steps.find((s) => s.id === "skills")?.done).toBe(false);
  });

  it("has a default writing tone", () => {
    expect(defaultPrefs().tone).toBe("plain");
  });
});

describe("tidy", () => {
  it("drops blank bullets, blank rows and blank links", () => {
    const messy = Resume.parse({
      basics: {
        name: "  Ada\u00a0 Lovelace ",
        links: [{ url: "" }, { url: "ada.dev " }],
      },
      work: [
        { company: "A", highlights: ["one", "  ", ""] },
        { company: "", highlights: [""] },
      ],
      projects: [{ name: "" }],
      skills: [{ group: "", items: "" }],
      summaries: ["", " keep "],
      notes: "line one\nline two\u00a0",
    });
    const clean = tidy(messy);
    expect(clean.basics.name).toBe("Ada Lovelace");
    expect(clean.basics.links).toEqual([{ label: "", url: "ada.dev" }]);
    expect(clean.work).toHaveLength(1);
    expect(clean.work[0].highlights).toEqual(["one"]);
    expect(clean.projects).toEqual([]);
    expect(clean.skills).toEqual([]);
    expect(clean.summaries).toEqual(["keep"]);
    expect(clean.notes).toBe("line one\nline two");
  });

  it("keeps a row that only has bullets, and leaves a clean resume unchanged", () => {
    const r = Resume.parse({
      work: [{ highlights: ["did a thing"] }],
      basics: { name: "Ada" },
    });
    expect(tidy(r).work).toHaveLength(1);
    expect(tidy(tidy(r))).toEqual(tidy(r));
  });
});

describe("mergeImport", () => {
  it("keeps private notes and summary versions across an import", () => {
    const mine = Resume.parse({
      notes: "Needs sponsorship",
      summaries: ["A", "B"],
      basics: { name: "Old" },
    });
    const imported = Resume.parse({
      basics: { name: "New" },
      summaries: ["from the file"],
      notes: "",
    });
    const merged = mergeImport(mine, imported);
    expect(merged.basics.name).toBe("New");
    expect(merged.notes).toBe("Needs sponsorship");
    expect(merged.summaries).toEqual(["A", "B"]);
    expect(mergeImport(emptyResume(), imported).summaries).toEqual([
      "from the file",
    ]);
  });
});
