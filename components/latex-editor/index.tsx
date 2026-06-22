"use client";

import { EditorHeader } from "./editor-header";
import { EditorPane } from "./editor-pane";
import { JobBanner } from "./job-banner";
import { PdfPreview } from "./pdf-preview";
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
    <div className="flex h-screen flex-col bg-background">
      <EditorHeader
        dirty={dirty}
        job={job}
        onSave={handleSave}
        onZoomChange={setZoom}
        pdfUrl={pdfUrl}
        saving={saving}
        zoom={zoom}
      />

      <JobBanner job={job} />

      <div className="flex min-h-0 flex-1">
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

        <PdfPreview
          compileLog={compileLog}
          engine={engine}
          isEmpty={isEmpty}
          onShowLogChange={setShowLog}
          pdfUrl={pdfUrl}
          showLog={showLog}
          zoom={zoom}
        />
      </div>
    </div>
  );
}
