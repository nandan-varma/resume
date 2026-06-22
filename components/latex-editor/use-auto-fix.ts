"use client";

import { useEffect, useRef } from "react";
import type { ChatMsg, EditorJob, EnginePhase } from "./types";
import { buildHistory } from "./types";

const MAX_AUTO_FIX = 2;

interface AutoFixOptions {
  aiAppliedRef: React.MutableRefObject<boolean>;
  chatLoading: boolean;
  chatMessages: ChatMsg[];
  compileLog: string;
  engine: EnginePhase;
  executeAIEdit: (
    instruction: string,
    history: { role: "user" | "assistant"; content: string }[],
    noticeMsg?: string,
    jobDescription?: string
  ) => Promise<void>;
  job: EditorJob | null;
  setChatMessages: (
    updater: ChatMsg[] | ((prev: ChatMsg[]) => ChatMsg[])
  ) => void;
}

export function useAutoFix({
  engine,
  compileLog,
  chatLoading,
  chatMessages,
  aiAppliedRef,
  executeAIEdit,
  job,
  setChatMessages,
}: AutoFixOptions) {
  const autoFixCountRef = useRef(0);
  const pendingAutoFixRef = useRef(false);

  // Effect: trigger auto-fix when compilation error occurs after AI edit
  // biome-ignore lint/correctness/useExhaustiveDependencies: refs & AI state intentionally excluded
  useEffect(() => {
    if (engine.phase !== "error" && engine.phase !== "ready") {
      return;
    }

    const wasAI = aiAppliedRef.current;
    aiAppliedRef.current = false;

    if (!wasAI || engine.phase !== "error" || !compileLog) {
      return;
    }

    if (autoFixCountRef.current >= MAX_AUTO_FIX) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `notice-${Date.now()}`,
          role: "notice",
          content:
            "Could not auto-fix — edit manually or try a different instruction.",
        },
      ]);
      return;
    }

    if (chatLoading) {
      pendingAutoFixRef.current = true;
      return;
    }

    autoFixCountRef.current += 1;
    executeAIEdit(
      `The LaTeX has compilation errors. Fix them.\n\nError log:\n${compileLog.slice(0, 2000)}`,
      buildHistory(chatMessages),
      "Compilation error — fixing automatically…",
      job?.description
    );
  }, [engine.phase, compileLog]);

  // Effect: process pending auto-fix when chat finishes loading
  // biome-ignore lint/correctness/useExhaustiveDependencies: only run when chatLoading changes
  useEffect(() => {
    if (!chatLoading && pendingAutoFixRef.current) {
      pendingAutoFixRef.current = false;
      if (
        engine.phase === "error" &&
        compileLog &&
        autoFixCountRef.current < MAX_AUTO_FIX
      ) {
        autoFixCountRef.current += 1;
        executeAIEdit(
          `The LaTeX has compilation errors. Fix them.\n\nError log:\n${compileLog.slice(0, 2000)}`,
          buildHistory(chatMessages),
          "Compilation error — fixing automatically…",
          job?.description
        );
      }
    }
  }, [chatLoading]);
}
