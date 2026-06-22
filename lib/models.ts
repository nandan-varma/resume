import { google } from "@ai-sdk/google";
import type { GoogleGenerativeAIModelId } from "@ai-sdk/google/internal";
import { openai } from "@ai-sdk/openai";
import type { OpenAIChatModelId } from "@ai-sdk/openai/internal";

/**
 * AI model configuration for resume analysis and editing.
 * Defines available models from Google and OpenAI providers.
 */
/**
 * Type definition for AI models.
 * Represents models from either Google or OpenAI providers.
 */
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

/**
 * Type for AI model providers (Google or OpenAI).
 */
export type Provider = Model["provider"];

/**
 * Array of all available AI models for resume analysis and editing.
 * Includes models from Google (Gemini) and OpenAI (GPT) providers.
 * Exported as 'as const' to preserve exact values for TypeScript.
 */
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

/**
 * Type for all available model IDs.
 * Derived from the models array to ensure type safety.
 */
export type ModelId = (typeof models)[number]["id"]; // All available model IDs

/**
 * Type guard to validate if a string is a valid model ID.
 * @param id - The string to validate
 * @returns true if the string is a valid model ID, false otherwise
 */
/**
 * Type guard to validate if a string is a valid model ID.
 * @param id - The string to validate
 * @returns true if the string is a valid model ID, false otherwise
 */
export function isValidModelId(id: string): id is ModelId {
  return models.some((model) => model.id === id);
}

/**
 * Get a model configuration by its ID.
 * @param id - The model ID to look up
 * @returns The model configuration
 * @throws Error if the model is not found
 */
export function getModelById(id: ModelId): Model {
  const model = models.find((model) => model.id === id);
  if (!model) {
    throw new Error(`Model with ID '${id}' not found`);
  }
  return model;
}

/**
 * Get a model instance by its ID.
 * @param id - The model ID to get an instance for
 * @returns A model instance
 * @throws Error if the model provider is not supported
 */
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

/**
 * The default AI model used when no model is specified or selected.
 * Currently set to Gemini 3 Flash Preview.
 */
export const DEFAULT_MODEL_ID: ModelId = "gemini-3-flash-preview";

/**
 * Local storage key for persisting AI model selection.
 * Used to remember the user's preferred model across sessions.
 */
export const MODEL_STORAGE_KEY = "job-match-ai-model";

export type { ModelId };

/**
 * Resolve a model ID to a model instance.
 * If the provided ID is invalid, falls back to the default model.
 * @param id - The model ID to resolve
 * @returns A model instance
 */
/**
 * Resolve a model ID to a model instance.
 * If the provided ID is invalid, falls back to the default model.
 * @param id - The model ID to resolve
 * @returns A model instance
 */
export function resolveModel(id: string) {
  return isValidModelId(id)
    ? getModelInstanceById(id)
    : getModelInstanceById(DEFAULT_MODEL_ID);
}
