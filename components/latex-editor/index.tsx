"use client";

import { ErrorBoundary } from "@/lib/error-boundary";
import EditorHeader from "./editor-header";
import EditorPane from "./editor-pane";
import PdfPreview from "./pdf-preview";
import { ResizablePanel } from "./resizable-panel";
import type { EditorJob } from "./types";
import { useLatexEditor } from "./use-latex-editor";

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
      </div>
    </ErrorBoundary>
  );
}
