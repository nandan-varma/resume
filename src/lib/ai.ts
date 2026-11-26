import { env } from "cloudflare:workers";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, Output } from "ai";
import type { z } from "zod";
import { importPrompt, type TailorInput, tailorPrompt } from "./prompts";
import { assemble, Resume, Tailored } from "./resume";

const provider = createOpenAICompatible({
  name: "opencode-go",
  baseURL: "https://opencode.ai/zen/go/v1",
  apiKey: env.OPENCODE_API_KEY,
  supportsStructuredOutputs: true,
  // OpenCode Go asks clients to identify themselves and send a session id.
  fetch: (url, init) => {
    const headers = new Headers(init?.headers);
    headers.set("user-agent", "jobmatch/1.0");
    headers.set("x-opencode-session", crypto.randomUUID());
    return fetch(url, { ...init, headers });
  },
});
const model = provider("deepseek-v4.1-flash");

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
