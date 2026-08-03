// Mirrors the enabled subset of lib/models.ts (models.filter(m => !m.disabled)).
// The extension has no build step shared with the Next.js app, so this list
// is kept in sync by hand — update it whenever lib/models.ts changes.
export const MODELS = [
  { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash" },
  { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
  { id: "gpt-5.6-luna", name: "GPT 5.6 Luna" },
  { id: "ling-3.0-flash", name: "Ling 3.0 Flash (free)" },
  { id: "laguna-s-2.1", name: "Poolside Laguna S 2.1 (free)" },
  { id: "nemotron-3-ultra-550b", name: "Nemotron 3 Ultra 550B (free)" },
  { id: "north-mini-code", name: "Cohere North Mini Code (free)" },
];

export const DEFAULT_MODEL_ID = "nemotron-3-ultra-550b";
