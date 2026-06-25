"use client";

import { ChevronDown, ChevronUp, Loader2, Terminal } from "lucide-react";
import { memo, useMemo } from "react";
import type { EnginePhase } from "./types";

interface PdfPreviewProps {
  compileLog: string;
  engine: EnginePhase;
  isEmpty: boolean;
  onShowLogChange: (v: boolean) => void;
  pdfUrl: string | null;
  showLog: boolean;
  zoom: number;
}

function renderPreviewBody(
  isEmpty: boolean,
  hasError: boolean,
  engine: EnginePhase,
  pdfUrl: string | null,
  compileLog: string,
  showLog: boolean,
  zoom: number,
  onShowLogChange: (v: boolean) => void,
  statusLabel: string | null
) {
  if (isEmpty) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-muted-foreground text-sm">
          <p className="mb-1 font-medium">No preview yet</p>
          <p className="text-xs">Add LaTeX source to see a live preview</p>
        </div>
      </div>
    );
  }

  if (!pdfUrl && hasError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <p className="text-center text-destructive text-sm">
          {engine.phase === "error" ? engine.message : "Compilation error"}
        </p>
        {compileLog && !showLog && (
          <button
            className="text-muted-foreground text-xs underline"
            onClick={() => onShowLogChange(true)}
            type="button"
          >
            Show compilation log
          </button>
        )}
      </div>
    );
  }

  if (pdfUrl) {
    return (
      <div className="flex h-full flex-1 overflow-auto">
        <div
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top left",
            width: `${10_000 / zoom}%`,
            height: "100%",
          }}
        >
          <iframe
            className="h-full min-h-screen w-full border-0"
            src={pdfUrl}
            title="LaTeX PDF preview"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center text-muted-foreground text-sm">
        <Loader2 className="mx-auto mb-2 size-5 animate-spin" />
        <p className="text-xs">{statusLabel ?? "Initializing…"}</p>
      </div>
    </div>
  );
}

function PdfPreview({
  engine,
  compileLog,
  showLog,
  onShowLogChange,
  pdfUrl,
  zoom,
  isEmpty,
}: PdfPreviewProps) {
  const isCompiling =
    engine.phase === "loading" || engine.phase === "compiling";
  const hasError = engine.phase === "error";

  const statusLabel = useMemo(() => {
    if (engine.phase === "loading") {
      return engine.label;
    }
    if (engine.phase === "compiling") {
      return "Compiling…";
    }
    return null;
  }, [engine]);

  const body = useMemo(
    () =>
      renderPreviewBody(
        isEmpty,
        hasError,
        engine,
        pdfUrl,
        compileLog,
        showLog,
        zoom,
        onShowLogChange,
        statusLabel
      ),
    [
      isEmpty,
      hasError,
      engine,
      pdfUrl,
      compileLog,
      showLog,
      zoom,
      onShowLogChange,
      statusLabel,
    ]
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-end border-border/50 border-b px-3 py-1">
        <div className="flex items-center gap-2">
          {isCompiling && (
            <span className="flex items-center gap-1 text-muted-foreground text-xs">
              <Loader2 className="size-3 animate-spin" />
              {statusLabel}
            </span>
          )}
          {hasError && compileLog && (
            <button
              className="flex items-center gap-1 text-destructive text-xs hover:underline"
              onClick={() => onShowLogChange(!showLog)}
              type="button"
            >
              <Terminal className="size-3" />
              Log
              {showLog ? (
                <ChevronUp className="size-3" />
              ) : (
                <ChevronDown className="size-3" />
              )}
            </button>
          )}
        </div>
      </div>

      {hasError && showLog && compileLog && (
        <div className="max-h-48 overflow-auto border-border/50 border-b bg-destructive/5 p-3">
          <pre className="whitespace-pre-wrap font-mono text-destructive text-xs">
            {compileLog}
          </pre>
        </div>
      )}

      {body}
    </div>
  );
}

export default memo(PdfPreview);
