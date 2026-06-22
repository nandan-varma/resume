"use client";

import EditorHeader from "./editor-header";
import EditorPane from "./editor-pane";
import { ErrorBoundary } from "./error-boundary";
import JobBanner from "./job-banner";
import PdfPreview from "./pdf-preview";
import { ResizablePanel } from "./resizable-panel";
import type { EditorJob } from "./types";
import { useLatexEditor } from "./use-latex-editor";

interface LatexEditorProps {
  initialLatex: string;
  isNewJobResume?: boolean;
  job?: EditorJob | null;
}

export function LatexEditor({
  initialLatex,
  job = null,
  isNewJobResume = false,
}: LatexEditorProps) {
  const {
    autoSaving,
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
    undo,
    redo,
  } = useLatexEditor(initialLatex, job, isNewJobResume);

  const isCompiling =
    engine.phase === "loading" || engine.phase === "compiling";
  const isEngineReady = engine.phase === "ready";

  return (
    <ErrorBoundary>
      <div className="flex h-screen flex-col bg-background">
        <EditorHeader
          autoSaving={autoSaving}
          dirty={dirty}
          isCompiling={isCompiling}
          isEngineReady={isEngineReady}
          job={job}
          onRecompile={handleForceRecompile}
          onSave={handleSave}
          onZoomChange={setZoom}
          pdfUrl={pdfUrl}
          saving={saving}
          zoom={zoom}
        />

        <JobBanner job={job} />

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
              onConsultPick={handleConsultPick}
              onConsultSkip={handleConsultSkip}
              onLatexChange={handleLatexChange}
              onRecompile={handleForceRecompile}
              onRedo={redo}
              onSave={handleSave}
              onTabChange={setActiveTab}
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
    </ErrorBoundary>
  );
}
