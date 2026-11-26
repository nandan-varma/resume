import { z } from "zod";
import type { Resume } from "./resume";

export const Suggestions = z.object({
  searches: z
    .array(
      z.object({
        label: z
          .string()
          .describe(
            "A short human name for the search, such as 'AI / LLM engineer'.",
          ),
        titles: z
          .array(z.string())
          .max(3)
          .describe("One to three realistic job-board titles."),
        remote: z.boolean().describe("Whether to include remote jobs."),
        why: z
          .string()
          .describe("One short sentence on why this fits the person."),
      }),
    )
    .max(5),
});
export type Suggestion = z.infer<typeof Suggestions>["searches"][number];

/** The search page URL for a suggestion. */
export const suggestionUrl = (s: Suggestion) => {
  const params = new URLSearchParams({ title: s.titles.join(", ") });
  if (s.remote) {
    params.set("remote", "on");
  }
  return `/?${params}`;
};

/** A short hash of the resume, so suggestions are only regenerated when it changes. */
export const fingerprint = async (resume: Resume) => {
  const bytes = new TextEncoder().encode(JSON.stringify(resume));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};
