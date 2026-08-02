import { google } from "@ai-sdk/google";
import type { GoogleGenerativeAIModelId } from "@ai-sdk/google/internal";
import { mistral } from "@ai-sdk/mistral";
import { openai } from "@ai-sdk/openai";
import type { OpenAIChatModelId } from "@ai-sdk/openai/internal";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

type MistralChatModelId =
  | "ministral-3b-latest"
  | "ministral-8b-latest"
  | "ministral-14b-latest"
  | "mistral-large-latest"
  | "mistral-medium-latest"
  | "mistral-medium-3"
  | "mistral-large-2512"
  | "mistral-medium-2508"
  | "mistral-medium-2505"
  | "mistral-small-2506"
  | "pixtral-large-latest"
  | "mistral-medium-3.5"
  | "mistral-small-latest"
  | "mistral-small-2603"
  | "magistral-medium-latest"
  | "magistral-small-latest"
  | "magistral-medium-2509"
  | "magistral-small-2509"
  | (string & {});

export type Model =
  | {
      id: string;
      name: string;
      provider: "google";
      modelId: GoogleGenerativeAIModelId;
    }
  | { id: string; name: string; provider: "openai"; modelId: OpenAIChatModelId }
  | {
      id: string;
      name: string;
      provider: "mistral";
      modelId: MistralChatModelId;
    }
  | { id: string; name: string; provider: "openrouter"; modelId: string };

export type Provider = Model["provider"];

export const models = [
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash Preview",
    provider: "google",
    modelId: "gemini-3-flash-preview",
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    modelId: "gemini-2.5-flash",
  },
  {
    id: "gemini-2.5-flash-preview-09-2025",
    name: "Gemini 2.5 Flash Preview (09-2025)",
    provider: "google",
    modelId: "gemini-2.5-flash-preview-09-2025",
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    provider: "google",
    modelId: "gemini-2.5-flash-lite",
  },
  {
    id: "gemini-2.5-flash-lite-preview-09-2025",
    name: "Gemini 2.5 Flash Lite Preview (09-2025)",
    provider: "google",
    modelId: "gemini-2.5-flash-lite-preview-09-2025",
  },
  {
    id: "gemini-2.0-flash-lite",
    name: "Gemini 2.0 Flash Lite",
    provider: "google",
    modelId: "gemini-2.0-flash-lite",
  },
  { id: "gpt-5", name: "GPT-5", provider: "openai", modelId: "gpt-5" },
  {
    id: "gpt-5.2-codex",
    name: "GPT 5.2 Codex",
    provider: "openai",
    modelId: "gpt-5.2-codex",
  },
  {
    id: "gpt-5.6-luna",
    name: "GPT 5.6 Luna",
    provider: "openai",
    modelId: "gpt-5.6-luna",
  },
  {
    id: "mistral-small-latest",
    name: "Mistral Small",
    provider: "mistral",
    modelId: "mistral-small-latest",
  },
  {
    id: "mistral-medium-latest",
    name: "Mistral Medium",
    provider: "mistral",
    modelId: "mistral-medium-latest",
  },
  {
    id: "mistral-large-latest",
    name: "Mistral Large",
    provider: "mistral",
    modelId: "mistral-large-latest",
  },
  {
    id: "nemotron-3-ultra-550b",
    name: "Nemotron 3 Ultra 550B (free)",
    provider: "openrouter",
    modelId: "nvidia/nemotron-3-ultra-550b-a55b:free",
  },
] as const;

export type ModelId = (typeof models)[number]["id"];

export function isValidModelId(id: string): id is ModelId {
  return models.some((m) => m.id === id);
}

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export function getModelInstanceById(id: ModelId) {
  const model = models.find((m) => m.id === id);
  if (!model) {
    throw new Error(`Model '${id}' not found`);
  }
  if (model.provider === "google") {
    return google(model.modelId as GoogleGenerativeAIModelId);
  }
  if (model.provider === "mistral") {
    return mistral(model.modelId as MistralChatModelId);
  }
  if (model.provider === "openrouter") {
    return openrouter.chat(model.modelId);
  }
  return openai(model.modelId as OpenAIChatModelId);
}

export const DEFAULT_MODEL_ID: ModelId = "nemotron-3-ultra-550b";

export function resolveModel(id: string) {
  const resolvedId = isValidModelId(id) ? id : DEFAULT_MODEL_ID;
  console.log(
    resolvedId === id
      ? `[models] using ${resolvedId}`
      : `[models] unknown modelId "${id}", falling back to ${resolvedId}`
  );
  return getModelInstanceById(resolvedId);
}
