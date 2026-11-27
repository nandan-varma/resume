import { env } from "cloudflare:workers";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, jsonSchema, type ModelMessage, Output } from "ai";
import { z } from "zod";
import {
  lineBreakdown,
  overflow,
  type Paper,
  pageLines,
  trimToFit,
} from "./layout";
import {
  importPrompt,
  suggestPrompt,
  type TailorInput,
  tailorPrompt,
} from "./prompts";
import { assemble, Resume, Tailored } from "./resume";
import { Suggestions } from "./suggestions";

const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
const model = openai("gpt-6-luna");

/**
 * OpenAI's strict mode needs every key listed as required. Zod only does that
 * in "output" mode (defaulted fields are always present in parsed output),
 * so build the JSON Schema ourselves and still validate with Zod.
 */
const strictSchema = <T extends z.ZodType>(schema: T) =>
  jsonSchema<z.infer<T>>(
    z.toJSONSchema(schema, { io: "output", target: "draft-7" }) as never,
    {
      validate: (value) => {
        const result = schema.safeParse(value);
        return result.success
          ? { success: true, value: result.data }
          : { success: false, error: result.error };
      },
    },
  );

async function generate<T extends z.ZodType>(
  schema: T,
  system: string,
  messages: ModelMessage[],
) {
  const { output } = await generateText({
    model,
    output: Output.object({ schema: strictSchema(schema) }),
    system,
    messages,
    abortSignal: AbortSignal.timeout(90_000),
  });
  return output as z.infer<T>;
}

export function resumeFromText(text: string) {
  const { system, prompt } = importPrompt(text);
  return generate(Resume, system, [{ role: "user", content: prompt }]);
}

export async function suggestSearches(resume: Resume) {
  const { system, prompt } = suggestPrompt(resume);
  const { searches } = await generate(Suggestions, system, [
    { role: "user", content: prompt },
  ]);
  return searches.filter((s) => s.titles.length > 0);
}

const MAX_ROUNDS = 3;

const overflowFeedback = (resume: Resume, lines: number, paper: Paper) => {
  const breakdown = Object.entries(lineBreakdown(resume, paper))
    .map(([name, n]) => `${name} ${Math.round(n)}`)
    .join(", ");
  return [
    `That draft runs about ${lines} lines past one page. The limit is ${pageLines(paper)} lines of body text.`,
    `Estimated lines per section: ${breakdown}.`,
    "Return the complete JSON again, shorter. Make bullets one line where you can, drop the weakest bullets and the fourth project, and keep only the most relevant skill groups.",
    "Keep the strongest verified numbers. Do not change the match, the confidence or the cover letter.",
  ].join("\n");
};

/**
 * Tailors a resume and guarantees it fits one page. If a draft runs long, it is
 * sent back to the model with the exact overflow; if the model still cannot
 * fit it, deterministic trimming removes the weakest content.
 */
export async function tailorResume(input: TailorInput) {
  const { system, prompt } = tailorPrompt(input);
  const messages: ModelMessage[] = [{ role: "user", content: prompt }];

  const paper = input.prefs.paper;
  let out = await generate(Tailored, system, messages);
  let resume = assemble(input.resume, out);
  for (
    let round = 1;
    round < MAX_ROUNDS && overflow(resume, paper) > 0;
    round++
  ) {
    messages.push(
      { role: "assistant", content: JSON.stringify(out) },
      {
        role: "user",
        content: overflowFeedback(resume, overflow(resume, paper), paper),
      },
    );
    out = await generate(Tailored, system, messages);
    resume = assemble(input.resume, out);
  }

  return {
    match: out.match,
    resume: trimToFit(resume, paper),
    coverLetter: out.coverLetter,
  };
}
