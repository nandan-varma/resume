import { env } from "cloudflare:workers";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import type { z } from "zod";
import { importPrompt, type TailorInput, tailorPrompt } from "./prompts";
import { assemble, Resume, Tailored } from "./resume";

const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
const model = openai("gpt-6-luna");

async function generate<T extends z.ZodType>(
  schema: T,
  system: string,
  prompt: string,
) {
  const { output } = await generateText({
    model,
    output: Output.object({ schema }),
    system,
    prompt,
    abortSignal: AbortSignal.timeout(90_000),
  });
  return output as z.infer<T>;
}

export function resumeFromText(text: string) {
  const { system, prompt } = importPrompt(text);
  return generate(Resume, system, prompt);
}

export async function tailorResume(input: TailorInput) {
  const { system, prompt } = tailorPrompt(input);
  const out = await generate(Tailored, system, prompt);
  return {
    match: out.match,
    resume: assemble(input.resume, out),
    coverLetter: out.coverLetter,
  };
}
