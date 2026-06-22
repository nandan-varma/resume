"use client";

import {
  ArrowLeft,
  Briefcase,
  Download,
  Loader2,
  Play,
  RotateCcw,
  Save,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Link from "next/link";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import type { EditorJob } from "./types";

interface EditorHeaderProps {
  autoSaving: boolean;
  dirty: boolean;
  isCompiling: boolean;
  isEngineReady: boolean;
  job: EditorJob | null;
  onRecompile: () => void;
  onSave: () => void;
  onZoomChange: (zoom: number) => void;
  pdfUrl: string | null;
  saving: boolean;
  zoom: number;
}

function EditorHeader({
  autoSaving,
  dirty,
  job,
  pdfUrl,
  saving,
  zoom,
  isCompiling,
  isEngineReady,
  onSave,
  onZoomChange,
  onRecompile,
}: EditorHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-border border-b px-4">
      <div className="flex items-center gap-4">
        <Link
          className="flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
          href="/dashboard"
        >
          <ArrowLeft className="size-3.5" />
          Dashboard
        </Link>
        <span className="select-none text-border">|</span>
        <span className="font-medium text-sm">LaTeX Editor</span>
        {job && (
          <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-primary text-xs">
            <Briefcase className="size-3" />
            {job.title}
          </span>
        )}
        {dirty && (
          <span className="inline-flex items-center gap-1 text-xs text-yellow-500 dark:text-yellow-400">
            {autoSaving && <Loader2 className="size-3 animate-spin" />}
            {autoSaving ? "Saving…" : "Unsaved changes"}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          disabled={!isEngineReady || isCompiling}
          onClick={onRecompile}
          size="sm"
          title="Force recompile (Ctrl+Shift+Enter)"
          variant="outline"
        >
          {isCompiling ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Play className="size-3.5" />
          )}
          <span className="ml-1.5 hidden sm:inline">Recompile</span>
        </Button>
        <div className="hidden items-center gap-1 sm:flex">
          <button
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => onZoomChange(Math.max(50, zoom - 10))}
            title="Zoom out"
            type="button"
          >
            <ZoomOut className="size-3.5" />
          </button>
          <span className="min-w-[3ch] text-center text-muted-foreground text-xs">
            {zoom}%
          </span>
          <button
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => onZoomChange(Math.min(200, zoom + 10))}
            title="Zoom in"
            type="button"
          >
            <ZoomIn className="size-3.5" />
          </button>
          <button
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => onZoomChange(100)}
            title="Reset zoom"
            type="button"
          >
            <RotateCcw className="size-3" />
          </button>
        </div>
        <div className="h-4 w-px bg-border" />
        {pdfUrl ? (
          <a
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-foreground text-sm transition-colors hover:bg-muted"
            download="resume.pdf"
            href={pdfUrl}
            title="Download PDF"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Download PDF</span>
          </a>
        ) : (
          <span className="inline-flex h-8 cursor-default items-center gap-1.5 rounded-md border border-border px-3 text-muted-foreground text-sm opacity-50">
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Download PDF</span>
          </span>
        )}
        <Button disabled={saving || !dirty} onClick={onSave} size="sm">
          {saving ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <Save className="mr-1.5 size-3.5" />
          )}
          Save
        </Button>
      </div>
    </header>
  );
}

export default memo(EditorHeader);
