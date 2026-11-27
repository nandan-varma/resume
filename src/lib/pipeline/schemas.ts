import { z } from "zod";

/**
 * Lenient shapes for model replies. Weaker models return a string where a list
 * was asked for, a number as text, or "Strong match" for "strong". Each helper
 * accepts the sensible variants and turns them into the exact type we want,
 * so a harmless slip does not cost a retry.
 */

const text = z.preprocess(
  (v) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : ""),
  z.string(),
);

const list = z.preprocess((v) => {
  if (Array.isArray(v)) {
    return v.filter((x): x is string => typeof x === "string");
  }
  if (typeof v === "string" && v.trim()) {
    return v
      .split(/\n|;/)
      .map((s) => s.replace(/^[-*\d.)\s]+/, "").trim())
      .filter(Boolean);
  }
  return [];
}, z.array(z.string()));

const indexes = z.preprocess(
  (v) =>
    (Array.isArray(v)
      ? v
      : v === undefined || v === null || v === ""
        ? []
        : [v]
    )
      .map((x) =>
        typeof x === "object" && x !== null && "index" in x
          ? (x as { index: unknown }).index
          : x,
      )
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 0),
  z.array(z.number()),
);

const index = z.preprocess((v) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : 0;
}, z.number());

const level = z.preprocess(
  (v) => {
    const s = String(v ?? "").toLowerCase();
    if (s.includes("strong")) {
      return "strong";
    }
    if (s.includes("good") || s.includes("moderate") || s.includes("medium")) {
      return "good";
    }
    if (
      s.includes("stretch") ||
      s.includes("weak") ||
      s.includes("low") ||
      s.includes("poor")
    ) {
      return "stretch";
    }
    return s;
  },
  z.enum(["strong", "good", "stretch"]),
);

export const Plan = z.object({
  roleType: text,
  level,
  confidence: text,
  reasons: list,
  gaps: list,
  blockers: list,
  projects: indexes,
  skillGroups: indexes,
  summaryVersion: index,
});

export const Bullets = z.object({ bullets: list });
export const SummaryReply = z.object({ summary: text });
export const LetterReply = z.object({ letter: text });

export const Suggestions = z.object({
  searches: z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z.array(
      z.object({
        label: text,
        titles: list,
        remote: z.preprocess(
          (v) => v === true || String(v).toLowerCase() === "true",
          z.boolean(),
        ),
        why: text,
      }),
    ),
  ),
});
