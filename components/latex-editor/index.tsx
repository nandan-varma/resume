"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ErrorBoundary } from "@/lib/error-boundary";
import {
  personalInfoQueryKey,
  usePersonalInfo,
  useRegenerateLatex,
} from "@/lib/queries/resume";
import EditorHeader from "./editor-header";
import EditorPane from "./editor-pane";
import PdfPreview from "./pdf-preview";
import { ResizablePanel } from "./resizable-panel";
import { ResumeOnboarding } from "./resume-onboarding";
import type { EditorJob } from "./types";
import { useLatexEditor } from "./use-latex-editor";

const RESUME_POLL_MS = 4000;
const RESUME_POLL_TIMEOUT_MS = 30_000;

interface LatexEditorProps {
  initialChatMessages?: unknown;
  initialLatex: string;
  isNewJobResume?: boolean;
  job?: EditorJob | null;
}

export function LatexEditor({
  initialChatMessages,
  initialLatex,
  job = null,
  isNewJobResume = false,
}: LatexEditorProps) {
  const { data: personalInfo } = usePersonalInfo();
  const queryClient = useQueryClient();
  const regenerate = useRegenerateLatex();
  const [skipResumeOnboarding, setSkipResumeOnboarding] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);

  const {
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
  } = useLatexEditor(initialLatex, job, isNewJobResume, initialChatMessages);

  // Untouched editor: empty and no chat activity yet (consultation only ever
  // starts when there's already a base resume to work from, so this is a
  // reliable "nothing here yet" signal regardless of job scope).
  const pristine = isEmpty && chatMessages.length === 0;
  const hasResume = !!personalInfo?.resumeUrl;
  const hasLatex = !!personalInfo?.resumeLatex;
  // resumeUrl set but resumeLatex isn't yet — either still converting, or an
  // old upload whose conversion never completed/failed silently.
  const pendingGeneration = hasResume && !hasLatex;
  const showResumeOnboarding = !skipResumeOnboarding && pristine && !hasLatex;

  // Adopt the AI-generated LaTeX the moment background conversion finishes,
  // but only while the editor is still pristine — never clobber real edits.
  useEffect(() => {
    if (pristine && personalInfo?.resumeLatex) {
      handleLatexChange(personalInfo.resumeLatex);
    }
  }, [pristine, personalInfo?.resumeLatex, handleLatexChange]);

  // No push channel for the background PDF->LaTeX task — poll while waiting.
  // Bounded: the conversion can fail silently server-side (e.g. a transient
  // AI-provider error), and a resume can also sit with resumeUrl set but
  // resumeLatex never generated from an old upload predating a fix — give up
  // after a timeout instead of spinning forever, and offer a manual retry.
  useEffect(() => {
    if (!pendingGeneration) {
      setPollTimedOut(false);
      return;
    }
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: personalInfoQueryKey });
    }, RESUME_POLL_MS);
    const timeout = setTimeout(
      () => setPollTimedOut(true),
      RESUME_POLL_TIMEOUT_MS
    );
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [pendingGeneration, queryClient]);

  const isCompiling =
    engine.phase === "loading" || engine.phase === "compiling";
  const isEngineReady = engine.phase === "ready";

  return (
    <ErrorBoundary reload>
      <div className="flex h-[calc(100vh-3rem)] flex-col bg-background">
        <EditorHeader
          activeTab={activeTab}
          autoSaving={autoSaving}
          dirty={dirty}
          incognito={incognito}
          isCompiling={isCompiling}
          isEngineReady={isEngineReady}
          job={job}
          onRecompile={handleForceRecompile}
          onSave={handleSave}
          onTabChange={setActiveTab}
          onToggleIncognito={toggleIncognito}
          onZoomChange={setZoom}
          pdfUrl={pdfUrl}
          saving={saving}
          zoom={zoom}
        />

        {showResumeOnboarding ? (
          <ResumeOnboarding
            hasResume={hasResume}
            onRegenerate={() => regenerate.mutate()}
            onSkip={() => setSkipResumeOnboarding(true)}
            pending={pendingGeneration}
            regenerating={regenerate.isPending}
            timedOut={pollTimedOut}
          />
        ) : (
          <>
            {/* Mobile: single pane, tab-switched */}
            <div className="flex min-h-0 flex-1 sm:hidden">
              {activeTab === "preview" ? (
                <PdfPreview
                  compileLog={compileLog}
                  engine={engine}
                  isEmpty={isEmpty}
                  onShowLogChange={setShowLog}
                  pdfUrl={pdfUrl}
                  showLog={showLog}
                  zoom={zoom}
                />
              ) : (
                <EditorPane
                  activeTab={activeTab}
                  chatInput={chatInput}
                  chatLoading={chatLoading}
                  chatMessages={chatMessages}
                  isEmpty={isEmpty}
                  job={job}
                  latex={latex}
                  onChatInputChange={setChatInput}
                  onChatSend={handleChatSend}
                  onClearChat={clearChat}
                  onConsultPick={handleConsultPick}
                  onConsultSkip={handleConsultSkip}
                  onLatexChange={handleLatexChange}
                  onRecompile={handleForceRecompile}
                  onRedo={redo}
                  onSave={handleSave}
                  onUndo={undo}
                  pendingQuestion={pendingQuestion}
                />
              )}
            </div>

            {/* Desktop: side-by-side resizable */}
            <div className="hidden min-h-0 flex-1 sm:flex">
              <ResizablePanel
                defaultLeftPercent={50}
                left={
                  <EditorPane
                    activeTab={activeTab}
                    chatInput={chatInput}
                    chatLoading={chatLoading}
                    chatMessages={chatMessages}
                    isEmpty={isEmpty}
                    job={job}
                    latex={latex}
                    onChatInputChange={setChatInput}
                    onChatSend={handleChatSend}
                    onClearChat={clearChat}
                    onConsultPick={handleConsultPick}
                    onConsultSkip={handleConsultSkip}
                    onLatexChange={handleLatexChange}
                    onRecompile={handleForceRecompile}
                    onRedo={redo}
                    onSave={handleSave}
                    onUndo={undo}
                    pendingQuestion={pendingQuestion}
                  />
                }
                right={
                  <PdfPreview
                    compileLog={compileLog}
                    engine={engine}
                    isEmpty={isEmpty}
                    onShowLogChange={setShowLog}
                    pdfUrl={pdfUrl}
                    showLog={showLog}
                    zoom={zoom}
                  />
                }
              />
            </div>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
