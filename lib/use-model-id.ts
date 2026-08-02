"use client";

import { useCallback } from "react";
import { usePersonalInfo, useSavePreferredModelId } from "@/lib/queries/resume";
import { DEFAULT_MODEL_ID, isValidModelId, type ModelId } from "./models";

export function useModelId(): [ModelId, (id: ModelId) => void] {
  const { data } = usePersonalInfo();
  const { mutate } = useSavePreferredModelId();

  const modelId =
    data?.preferredModelId && isValidModelId(data.preferredModelId)
      ? data.preferredModelId
      : DEFAULT_MODEL_ID;

  const setModelId = useCallback((id: ModelId) => mutate(id), [mutate]);

  return [modelId, setModelId];
}
