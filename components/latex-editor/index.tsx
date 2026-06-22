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
  initialResumeUrl: string | null;
  isNewJobResume?: boolean;
  job?: EditorJob | null;
}

export function LatexEditor({
  initialLatex,
  initialResumeUrl,
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
    textareaRef,
    handleLatexChange,
    setZoom,
    setActiveTab,
    setChatInput,
    setShowLog,
    handleSave,
    handleKeyDown,
    handleChatSend,
    handleConsultPick,
    handleConsultSkip,
  } = useLatexEditor(initialLatex, initialResumeUrl, job, isNewJobResume);

  return (
    <ErrorBoundary>
      <div className="flex h-screen flex-col bg-background">
        <EditorHeader
          autoSaving={autoSaving}
          dirty={dirty}
          job={job}
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
              initialResumeUrl={initialResumeUrl}
              isEmpty={isEmpty}
              job={job}
              latex={latex}
              onChatInputChange={setChatInput}
              onChatSend={handleChatSend}
              onConsultPick={handleConsultPick}
              onConsultSkip={handleConsultSkip}
              onKeyDown={handleKeyDown}
              onLatexChange={handleLatexChange}
              onTabChange={setActiveTab}
              pendingQuestion={pendingQuestion}
              textareaRef={textareaRef}
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
