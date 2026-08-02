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
      disabled?: boolean;
    }
  | {
      id: string;
      name: string;
      provider: "openai";
      modelId: OpenAIChatModelId;
      disabled?: boolean;
    }
  | {
      id: string;
      name: string;
      provider: "mistral";
      modelId: MistralChatModelId;
      disabled?: boolean;
    }
  | {
      id: string;
      name: string;
      provider: "openrouter";
      modelId: string;
      disabled?: boolean;
    };

export type Provider = Model["provider"];

export const models = [
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    provider: "google",
    modelId: "gemini-3.6-flash",
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    provider: "google",
    modelId: "gemini-3.1-flash-lite",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "google",
    modelId: "gemini-2.5-pro",
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
    disabled: true,
  },
  {
    id: "mistral-medium-latest",
    name: "Mistral Medium",
    provider: "mistral",
    modelId: "mistral-medium-latest",
    disabled: true,
  },
  {
    id: "mistral-large-latest",
    name: "Mistral Large",
    provider: "mistral",
    modelId: "mistral-large-latest",
    disabled: true,
  },
  {
    id: "ling-3.0-flash",
    name: "Ling 3.0 Flash (free)",
    provider: "openrouter",
    modelId: "inclusionai/ling-3.0-flash:free",
  },
  {
    id: "laguna-s-2.1",
    name: "Poolside Laguna S 2.1 (free)",
    provider: "openrouter",
    modelId: "poolside/laguna-s-2.1:free",
  },
  {
    id: "nemotron-3-ultra-550b",
    name: "Nemotron 3 Ultra 550B (free)",
    provider: "openrouter",
    modelId: "nvidia/nemotron-3-ultra-550b-a55b:free",
  },
  {
    id: "north-mini-code",
    name: "Cohere North Mini Code (free)",
    provider: "openrouter",
    modelId: "cohere/north-mini-code:free",
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
