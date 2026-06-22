"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { saveJobResumeLatex, saveResumeLatex } from "@/server/resume";
import type { EditorJob } from "./types";

export function useAutoSave(getLatex: () => string, job: EditorJob | null) {
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const latex = getLatex();
      const result = job
        ? await saveJobResumeLatex(job.id, latex)
        : await saveResumeLatex(latex);
      if (result.success) {
        setDirty(false);
        setAutoSaving(false);
        toast.success(job ? "Job resume saved" : "LaTeX saved");
      } else {
        toast.error(result.message ?? "Failed to save");
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }, [job, getLatex]);

  const markDirty = useCallback(() => {
    setDirty(true);
  }, []);

  useEffect(() => {
    if (!dirty || saving) {
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
  }, [dirty, saving, handleSave]);

  return {
    saving,
    dirty,
    autoSaving,
    handleSave,
    markDirty,
  };
}
