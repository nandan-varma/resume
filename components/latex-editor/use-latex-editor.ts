"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useModelId } from "@/lib/use-model-id";
import type { ChatMsg, EditorJob } from "./types";
import { useAiChat } from "./use-ai-chat";
import { useAutoFix } from "./use-auto-fix";
import { useAutoSave } from "./use-auto-save";
import { useConsultation } from "./use-consultation";
import { useEngine } from "./use-engine";

const DEBOUNCE_MS = 2500;

export function useLatexEditor(
  initialLatex: string,
  job: EditorJob | null,
  isNewJobResume: boolean,
  initialChatMessages?: unknown
) {
  const [latex, setLatexState] = useState(initialLatex);
  const latexRef = useRef(latex);
  const aiAppliedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getLatex = useCallback(() => latexRef.current, []);

  const setLatex = useCallback((value: string, isAiEdit: boolean) => {
    latexRef.current = value;
    setLatexState(value);
    if (isAiEdit) {
      aiAppliedRef.current = true;
    }
  }, []);

  const [zoom, setZoom] = useState(100);
  const [activeTab, setActiveTab] = useState<"editor" | "chat" | "preview">(
    "chat"
  );

  const [modelId] = useModelId();

  const [chatMessages, setChatMessages] = useState<ChatMsg[]>(
    Array.isArray(initialChatMessages) ? (initialChatMessages as ChatMsg[]) : []
  );
  const [chatLoading, _setChatLoading] = useState(false);
  const chatLoadingRef = useRef(false);
  const setChatLoading = useCallback((v: boolean) => {
    chatLoadingRef.current = v;
    _setChatLoading(v);
  }, []);

  const {
    engine,
    pageCount,
    pdfUrl,
    compileLog,
    showLog,
    setShowLog,
    compile,
  } = useEngine();

  const {
    saving,
    dirty,
    autoSaving,
    incognito,
    toggleIncognito,
    handleSave,
    markDirty,
  } = useAutoSave(getLatex, chatMessages, job);

  const clearChat = useCallback(() => {
    setChatMessages([]);
    markDirty();
  }, [markDirty]);

  // ponytail: persist consultation progress so revisits don't restart from scratch
  const prevChatCountRef = useRef(chatMessages.length);
  useEffect(() => {
    if (chatMessages.length !== prevChatCountRef.current) {
      prevChatCountRef.current = chatMessages.length;
      markDirty();
    }
  }, [chatMessages.length, markDirty]);

  const { chatInput, setChatInput, handleChatSend, executeAIEdit, undo, redo } =
    useAiChat(
      getLatex,
      setLatex,
      modelId,
      job,
      pageCount,
      chatMessages,
      setChatMessages,
      chatLoadingRef,
      setChatLoading
    );

  const { pendingQuestion, handleConsultPick, handleConsultSkip } =
    useConsultation(
      getLatex,
      executeAIEdit,
      modelId,
      job,
      isNewJobResume,
      initialLatex,
      chatMessages,
      setChatMessages,
      setChatLoading
    );

  useAutoFix({
    engine,
    compileLog,
    chatLoading,
    chatLoadingRef,
    chatMessages,
    aiAppliedRef,
    executeAIEdit,
    job,
    setChatMessages,
  });

  // ── Compilation debounce ──────────────────────────────────────────────

  // biome-ignore lint/correctness/useExhaustiveDependencies: latex triggers via ref
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    const src = latexRef.current;
    if (src.trim()) {
      debounceRef.current = setTimeout(() => compile(src), DEBOUNCE_MS);
    }
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [latex, compile]);

  // ── Text change handler ───────────────────────────────────────────────

  const handleLatexChange = useCallback(
    (value: string) => {
      latexRef.current = value;
      setLatexState(value);
      aiAppliedRef.current = false;
      markDirty();
    },
    [markDirty]
  );

  // ── Force recompile ──────────────────────────────────────────────────

  const handleForceRecompile = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    await compile(latexRef.current);
  }, [compile]);

  const isEmpty = !latex.trim();

  return {
    autoSaving,
    incognito,
    toggleIncognito,
    latex,
    pdfUrl,
    engine,
    compileLog,
    showLog,
    saving,
    dirty,
    zoom,
    activeTab,
    chatMessages,
    chatInput,
    chatLoading,
    isEmpty,
    pendingQuestion,
    handleLatexChange,
    setZoom,
    setActiveTab,
    setChatInput,
    setShowLog,
    handleSave,
    handleChatSend,
    handleConsultPick,
    handleConsultSkip,
    handleForceRecompile,
    clearChat,
    undo,
    redo,
  };
}
