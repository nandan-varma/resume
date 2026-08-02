"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_MODEL_ID,
  isValidModelId,
  MODEL_STORAGE_KEY,
  type ModelId,
} from "./models";

const LOCAL_CHANGE_EVENT = "model-id-change";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(LOCAL_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LOCAL_CHANGE_EVENT, callback);
  };
}

function getSnapshot(): ModelId {
  const stored = localStorage.getItem(MODEL_STORAGE_KEY);
  return stored && isValidModelId(stored) ? stored : DEFAULT_MODEL_ID;
}

function getServerSnapshot(): ModelId {
  return DEFAULT_MODEL_ID;
}

export function useModelId(): [ModelId, (id: ModelId) => void] {
  const modelId = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const setModelId = useCallback((id: ModelId) => {
    localStorage.setItem(MODEL_STORAGE_KEY, id);
    window.dispatchEvent(new Event(LOCAL_CHANGE_EVENT));
  }, []);

  return [modelId, setModelId];
}
