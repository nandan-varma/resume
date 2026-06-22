"use client";

import { useState } from "react";
import {
  DEFAULT_MODEL_ID,
  isValidModelId,
  MODEL_STORAGE_KEY,
  type ModelId,
} from "./models";

export function useModelId(): [ModelId, (id: ModelId) => void] {
  const [modelId, setModelIdState] = useState<ModelId>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_MODEL_ID;
    }
    const stored = localStorage.getItem(MODEL_STORAGE_KEY);
    return stored && isValidModelId(stored)
      ? (stored as ModelId)
      : DEFAULT_MODEL_ID;
  });

  const setModelId = (id: ModelId) => {
    setModelIdState(id);
    localStorage.setItem(MODEL_STORAGE_KEY, id);
  };

  return [modelId, setModelId];
}
