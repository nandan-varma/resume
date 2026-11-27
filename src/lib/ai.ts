import { env } from "cloudflare:workers";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, type ModelMessage } from "ai";
import { importPipeline } from "./pipeline/import";
import type { Ask } from "./pipeline/json";
import { suggestPipeline } from "./pipeline/suggest";
import {
  type TailorInput,
  tailorPipeline,
  writeCoverLetter,
} from "./pipeline/tailor";
import type { Resume } from "./resume";

/**
 * The only file that talks to an AI provider. Everything else works on plain
 * text in, text out (see ./pipeline), so adding another provider, or letting
 * people bring their own key, means adding a branch to `createAsk`.
 */
type ModelConfig = {
  provider: "openai";
  model: string;
  apiKey: string;
  baseURL?: string;
};

const defaultConfig = (): ModelConfig => ({
  provider: "openai",
  model: "gpt-6-luna",
  apiKey: env.OPENAI_API_KEY,
});

const CALL_TIMEOUT_MS = 50_000;

function createAsk(config: ModelConfig = defaultConfig()): Ask {
  const provider = createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });
  const model = provider(config.model);
  return async ({ system, prompt, history }) => {
    const messages: ModelMessage[] = [
      { role: "user", content: prompt },
      ...(history ?? []),
    ];
    const { text } = await generateText({
      model,
      system,
      messages,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    });
    return text;
  };
}

/** Read the text of a resume into a profile. */
export const resumeFromText = (text: string, ask: Ask = createAsk()) =>
  importPipeline(ask, text);

/** Search ideas for a profile. */
export const suggestSearches = (resume: Resume, ask: Ask = createAsk()) =>
  suggestPipeline(ask, resume);

/** A tailored resume and cover letter for one posting. */
export const tailorResume = (input: TailorInput, ask: Ask = createAsk()) =>
  tailorPipeline(ask, input);

/** A cover letter for an existing resume, or "" if the model could not write a good one. */
export const writeLetter = (input: TailorInput, ask: Ask = createAsk()) =>
  writeCoverLetter(ask, input);
