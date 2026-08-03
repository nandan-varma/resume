"use client";

import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import { useAppendTurn } from "@/lib/queries/resume";
import type { ChatMsg, EditorJob, EnginePhase } from "./types";
import { buildHistory } from "./types";

const MAX_AUTO_FIX = 2;
const MAX_PAGE_FIT = 2;

function pageFitInstruction(pageCount: number, fillRatio: number | null) {
  const fillNote =
    fillRatio === null
      ? ""
      : ` (last page ~${Math.round(fillRatio * 100)}% full)`;
  return `The resume compiles to ${pageCount} pages${fillNote}. Tighten it further — shorten bullets, reduce spacing/margins, trim less-relevant content — to fit on exactly one page.`;
}

interface AutoFixOptions {
  aiAppliedRef: React.MutableRefObject<boolean>;
  chatLoading: boolean;
  chatLoadingRef: React.MutableRefObject<boolean>;
  chatMessages: ChatMsg[];
  compileLog: string;
  engine: EnginePhase;
  executeAIEdit: (
    instruction: string,
    history: { role: "user" | "assistant"; content: string }[],
    noticeMsg?: string,
    jobDescription?: string
  ) => Promise<void>;
  fillRatio: number | null;
  job: EditorJob | null;
  onConflict: () => void;
  pageCount: number | null;
}

export function useAutoFix({
  engine,
  compileLog,
  chatLoading,
  chatLoadingRef,
  chatMessages,
  aiAppliedRef,
  executeAIEdit,
  fillRatio,
  job,
  onConflict,
  pageCount,
}: AutoFixOptions) {
  const { mutate: appendTurn } = useAppendTurn(job?.id ?? null, {
    onConflict,
  });
  const autoFixCountRef = useRef(0);
  const pendingAutoFixRef = useRef(false);
  const pageFitCountRef = useRef(0);
  const pendingPageFitRef = useRef(false);

  const tryPageFit = useCallback(
    (wasAI: boolean) => {
      if (pageCount === null || pageCount <= 1) {
        pageFitCountRef.current = 0;
        return;
      }
      if (!wasAI) {
        return;
      }
      if (pageFitCountRef.current >= MAX_PAGE_FIT) {
        appendTurn({
          messages: [
            {
              role: "notice",
              content: `Still ${pageCount} pages after ${MAX_PAGE_FIT} tightening passes — try a manual edit or a different instruction.`,
            },
          ],
        });
        return;
      }
      if (chatLoadingRef.current) {
        pendingPageFitRef.current = true;
        return;
      }
      pageFitCountRef.current += 1;
      executeAIEdit(
        pageFitInstruction(pageCount, fillRatio),
        buildHistory(chatMessages),
        `Still ${pageCount} pages — tightening further…`,
        job?.description
      );
    },
    [
      pageCount,
      fillRatio,
      chatLoadingRef,
      appendTurn,
      executeAIEdit,
      chatMessages,
      job,
    ]
  );

  const tryCompileFix = useCallback(
    (wasAI: boolean) => {
      if (!(wasAI && compileLog)) {
        return;
      }
      if (autoFixCountRef.current >= MAX_AUTO_FIX) {
        appendTurn({
          messages: [
            {
              role: "notice",
              content:
                "Could not auto-fix — edit manually or try a different instruction.",
            },
          ],
        });
        return;
      }
      if (chatLoadingRef.current) {
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
    },
    [compileLog, chatLoadingRef, appendTurn, executeAIEdit, chatMessages, job]
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: refs & AI state intentionally excluded
  useEffect(() => {
    if (engine.phase !== "error" && engine.phase !== "ready") {
      return;
    }

    const wasAI = aiAppliedRef.current;
    aiAppliedRef.current = false;

    if (engine.phase === "ready") {
      // Reset counter on any successful compile so future AI edits get fresh attempts.
      autoFixCountRef.current = 0;
      tryPageFit(wasAI);
      return;
    }

    tryCompileFix(wasAI);
  }, [engine.phase, compileLog, pageCount]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: only run when chatLoading changes
  useEffect(() => {
    if (chatLoadingRef.current) {
      return;
    }

    if (pendingPageFitRef.current) {
      pendingPageFitRef.current = false;
      tryPageFit(true);
      return;
    }

    if (pendingAutoFixRef.current) {
      pendingAutoFixRef.current = false;
      if (engine.phase === "error") {
        tryCompileFix(true);
      }
    }
  }, [chatLoading]);
}
