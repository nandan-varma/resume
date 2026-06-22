import { google } from "@ai-sdk/google";
import type { GoogleGenerativeAIModelId } from "@ai-sdk/google/internal";
import { openai } from "@ai-sdk/openai";
import type { OpenAIChatModelId } from "@ai-sdk/openai/internal";

export type Model =
  | {
      id: string;
      name: string;
      provider: "google";
      ModelId: GoogleGenerativeAIModelId;
    }
  | {
      id: string;
      name: string;
      provider: "openai";
      ModelId: OpenAIChatModelId;
    };

export type Provider = Model["provider"];

export const models = [
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash Preview",
    provider: "google",
    ModelId: "gemini-3-flash-preview",
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    ModelId: "gemini-2.5-flash",
  },
  {
    id: "gemini-2.5-flash-preview-09-2025",
    name: "Gemini 2.5 Flash Preview (09-2025)",
    provider: "google",
    ModelId: "gemini-2.5-flash-preview-09-2025",
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    provider: "google",
    ModelId: "gemini-2.5-flash-lite",
  },
  {
    id: "gemini-2.5-flash-lite-preview-09-2025",
    name: "Gemini 2.5 Flash Lite Preview (09-2025)",
    provider: "google",
    ModelId: "gemini-2.5-flash-lite-preview-09-2025",
  },
  {
    id: "gemini-2.0-flash-lite",
    name: "Gemini 2.0 Flash Lite",
    provider: "google",
    ModelId: "gemini-2.0-flash-lite",
  },
  {
    id: "gpt-5",
    name: "GPT-5",
    provider: "openai",
    ModelId: "gpt-5",
  },
  {
    id: "gpt-5.2-codex",
    name: "GPT 5.2 Codex",
    provider: "openai",
    ModelId: "gpt-5.2-codex",
  },
] as const;

export type ModelId = (typeof models)[number]["id"];

export function isValidModelId(id: string): id is ModelId {
  return models.some((model) => model.id === id);
}

export function getModelById(id: ModelId): Model {
  return models.find((model) => model.id === id) as Model;
}

export function getModelInstanceById(id: ModelId) {
  const modelConfig = getModelById(id);

  if (modelConfig.provider === "google") {
    return google(modelConfig.ModelId as GoogleGenerativeAIModelId);
  }
  if (modelConfig.provider === "openai") {
    return openai(modelConfig.ModelId as OpenAIChatModelId);
  }
  throw new Error("Unsupported model provider");
}

export const DEFAULT_MODEL_ID: ModelId = "gemini-3-flash-preview";

export function resolveModel(id: string) {
  return isValidModelId(id)
    ? getModelInstanceById(id)
    : getModelInstanceById(DEFAULT_MODEL_ID);
}
