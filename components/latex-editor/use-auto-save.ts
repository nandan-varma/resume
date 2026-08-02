"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSaveEditorState } from "@/lib/queries/resume";
import type { ChatMsg, EditorJob } from "./types";

export function useAutoSave(
  getLatex: () => string,
  chatMessages: ChatMsg[],
  job: EditorJob | null,
  chatLoading: boolean
) {
  const { mutateAsync, isPending: saving } = useSaveEditorState(
    job?.id ?? null
  );

  const [dirty, setDirty] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [incognito, setIncognito] = useState(false);
  const toggleIncognito = useCallback(() => setIncognito((v) => !v), []);

  const chatMessagesRef = useRef(chatMessages);
  chatMessagesRef.current = chatMessages;
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSave = useCallback(async () => {
    try {
      await mutateAsync({
        latex: getLatex(),
        chatMessages: chatMessagesRef.current,
      });
      setDirty(false);
      setAutoSaving(false);
      toast.success(job ? "Job resume saved" : "LaTeX saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
  }, [mutateAsync, getLatex, job]);

  const markDirty = useCallback(() => setDirty(true), []);

  // Wait for the AI response to finish streaming before scheduling a save —
  // otherwise a slow generation (can take 10s+) gets caught mid-stream and
  // persists a message stuck at streaming:true / partial content. `dirty`
  // stays true across the whole stream (set once when the placeholder is
  // added), so as soon as chatLoading clears this fires and saves the
  // finished message.
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
