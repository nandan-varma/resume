"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  resumeDocumentQueryKey,
  useClearMessages,
  useRestoreRevision,
  useResumeDocument,
} from "@/lib/queries/resume";
import { useModelId } from "@/lib/use-model-id";
import { getResumeDocument } from "@/server/resume-editor";
import type { ChatMsg, EditorJob } from "./types";
import { fromDocumentMessage } from "./types";
import { useAiChat } from "./use-ai-chat";
import { useAutoFix } from "./use-auto-fix";
import { useAutoSave } from "./use-auto-save";
import { useConsultation } from "./use-consultation";
import { useEngine } from "./use-engine";

const DEBOUNCE_MS = 2500;

export function useLatexEditor(job: EditorJob | null, isNewJobResume: boolean) {
  const jobId = job?.id ?? null;
  const queryClient = useQueryClient();

  const { data: doc } = useResumeDocument(jobId);
  // A brand-new job-scoped editor starts from the global resume text, same
  // as before this refactor — same query key when jobId is null, so this
  // never costs an extra fetch for the global editor itself.
  const { data: globalDoc } = useResumeDocument(null);
  const initialLatexSource = doc?.resumeLatex || globalDoc?.resumeLatex || "";

  const [latex, setLatexState] = useState(() => initialLatexSource);
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

  const [streamingMessage, setStreamingMessage] = useState<ChatMsg | null>(
    null
  );
  const [outOfSync, setOutOfSync] = useState(false);
  const onConflict = useCallback(() => setOutOfSync(true), []);

  const persistedMessages = useMemo(
    () => (doc?.messages ?? []).map(fromDocumentMessage),
    [doc?.messages]
  );
  const chatMessages = useMemo(
    () =>
      streamingMessage
        ? [...persistedMessages, streamingMessage]
        : persistedMessages,
    [persistedMessages, streamingMessage]
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
    fillRatio,
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
  } = useAutoSave(getLatex, jobId, chatLoading, onConflict);

  const clearMessagesMutation = useClearMessages(jobId);
  const clearChat = useCallback(() => {
    clearMessagesMutation.mutate();
  }, [clearMessagesMutation]);

  const restoreRevisionMutation = useRestoreRevision(jobId, { onConflict });
  const handleRestore = useCallback(
    (revisionId: number) => {
      restoreRevisionMutation.mutate(revisionId, {
        onSuccess: ({ document }) => {
          setLatex(document.resumeLatex, false);
        },
      });
    },
    [restoreRevisionMutation, setLatex]
  );
  const restoringRevisionId = restoreRevisionMutation.isPending
    ? (restoreRevisionMutation.variables ?? null)
    : null;

  const { chatInput, setChatInput, handleChatSend, executeAIEdit, undo, redo } =
    useAiChat(
      getLatex,
      setLatex,
      modelId,
      job,
      pageCount,
      fillRatio,
      persistedMessages,
      setStreamingMessage,
      chatLoadingRef,
      setChatLoading,
      onConflict
    );

  const { pendingQuestion, handleConsultPick, handleConsultSkip } =
    useConsultation(
      getLatex,
      executeAIEdit,
      modelId,
      job,
      isNewJobResume,
      initialLatexSource,
      pageCount,
      fillRatio,
      persistedMessages,
      setChatLoading,
      onConflict
    );

  useAutoFix({
    engine,
    compileLog,
    chatLoading,
    chatLoadingRef,
    chatMessages: persistedMessages,
    aiAppliedRef,
    executeAIEdit,
    fillRatio,
    job,
    onConflict,
    pageCount,
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

  // ── Out-of-sync recovery ───────────────────────────────────────────────

  const reloadFromServer = useCallback(async () => {
    const fresh = await queryClient.fetchQuery({
      queryKey: resumeDocumentQueryKey(jobId),
      queryFn: () => getResumeDocument(jobId),
    });
    setLatex(fresh?.resumeLatex ?? "", false);
    setOutOfSync(false);
  }, [queryClient, jobId, setLatex]);

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
    outOfSync,
    reloadFromServer,
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
    handleRestore,
    restoringRevisionId,
    undo,
    redo,
  };
}
