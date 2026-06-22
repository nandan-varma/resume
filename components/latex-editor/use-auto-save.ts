"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSaveEditorState } from "@/lib/queries/resume";
import type { ChatMsg, EditorJob } from "./types";

export function useAutoSave(
  getLatex: () => string,
  chatMessages: ChatMsg[],
  job: EditorJob | null
) {
  const { mutateAsync, isPending: saving } = useSaveEditorState(job?.id ?? null);

  const [dirty, setDirty] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);

  const chatMessagesRef = useRef(chatMessages);
  chatMessagesRef.current = chatMessages;
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSave = useCallback(async () => {
    try {
      await mutateAsync({ latex: getLatex(), chatMessages: chatMessagesRef.current });
      setDirty(false);
      setAutoSaving(false);
      toast.success(job ? "Job resume saved" : "LaTeX saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
  }, [mutateAsync, getLatex, job]);

  const markDirty = useCallback(() => setDirty(true), []);

  useEffect(() => {
    if (!dirty || saving) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      setAutoSaving(true);
      handleSave();
    }, 5000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [dirty, saving, handleSave]);

  return { saving, dirty, autoSaving, handleSave, markDirty };
}
