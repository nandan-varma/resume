import type { Resume } from "../resume";
import type { Suggestion } from "../suggestions";
import { polish } from "./guards";
import { type Ask, askJson } from "./json";
import { suggestPrompt } from "./prompts";
import { Suggestions } from "./schemas";

const SENIORITY = /\b(?:senior|staff|principal|lead|head|director|manager)\b/i;

export async function suggestPipeline(
  ask: Ask,
  resume: Resume,
): Promise<Suggestion[]> {
  try {
    const { searches } = await askJson(ask, {
      label: "suggest",
      schema: Suggestions,
      ...suggestPrompt(resume),
      attempts: 2,
    });
    const early = resume.work.length <= 1;
    const clean = searches
      .map((s) => ({
        label: polish(s.label).slice(0, 40),
        titles: [
          ...new Set(
            s.titles
              .map((t) => polish(t).toLowerCase().replace(/[.]+$/, ""))
              .filter(
                (t) =>
                  t.length >= 3 &&
                  t.split(" ").length <= 5 &&
                  !(early && SENIORITY.test(t)),
              ),
          ),
        ].slice(0, 3),
        remote: s.remote,
        why: polish(s.why).slice(0, 200),
      }))
      .filter((s) => s.label && s.titles.length > 0)
      .slice(0, 5);
    if (clean.length >= 2) {
      return clean;
    }
  } catch {
    // Suggestions are a nicety: show none rather than guess.
  }
  return [];
}
