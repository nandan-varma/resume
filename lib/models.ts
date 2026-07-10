import { google } from "@ai-sdk/google";
import type { GoogleGenerativeAIModelId } from "@ai-sdk/google/internal";
import { mistral } from "@ai-sdk/mistral";
import { openai } from "@ai-sdk/openai";
import type { OpenAIChatModelId } from "@ai-sdk/openai/internal";

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
    };

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
] as const;

export type ModelId = (typeof models)[number]["id"];

export function isValidModelId(id: string): id is ModelId {
  return models.some((m) => m.id === id);
}

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
  return openai(model.modelId as OpenAIChatModelId);
}

export const DEFAULT_MODEL_ID: ModelId = "gpt-5.6-luna";
export const MODEL_STORAGE_KEY = "job-match-ai-model";

export function resolveModel(id: string) {
  return isValidModelId(id)
    ? getModelInstanceById(id)
    : getModelInstanceById(DEFAULT_MODEL_ID);
}
