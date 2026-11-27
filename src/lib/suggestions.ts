import type { Resume } from "./resume";

export type Suggestion = {
  /** A short human name for the search, such as "AI / LLM engineer". */
  label: string;
  /** One to three realistic job-board titles. */
  titles: string[];
  /** Whether to include remote jobs. */
  remote: boolean;
  /** One short sentence on why this fits the person. */
  why: string;
};

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
