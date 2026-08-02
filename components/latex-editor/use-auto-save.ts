"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSaveLatex } from "@/lib/queries/resume";

// Manual-typing autosave only — chat turns persist immediately via
// appendTurn as they happen, so this hook has nothing to do with chat state.
export function useAutoSave(
  getLatex: () => string,
  jobId: number | null,
  chatLoading: boolean,
  onConflict: () => void
) {
  const { mutateAsync, isPending: saving } = useSaveLatex(jobId, {
    onConflict,
  });

  const [dirty, setDirty] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [incognito, setIncognito] = useState(false);
  const toggleIncognito = useCallback(() => setIncognito((v) => !v), []);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSave = useCallback(async () => {
    try {
      await mutateAsync(getLatex());
      setDirty(false);
      toast.success(jobId ? "Job resume saved" : "LaTeX saved");
    } catch {
      // toasted by the mutation's onError (including conflict)
    } finally {
      setAutoSaving(false);
    }
  }, [mutateAsync, getLatex, jobId]);

  const markDirty = useCallback(() => setDirty(true), []);

  useEffect(() => {
    if (!dirty || saving || incognito || chatLoading) {
      return;
    }
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      setAutoSaving(true);
      handleSave();
    }, 5000);
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [dirty, saving, incognito, chatLoading, handleSave]);

  return {
    saving,
    dirty,
    autoSaving,
    incognito,
    toggleIncognito,
    handleSave,
    markDirty,
  };
}
