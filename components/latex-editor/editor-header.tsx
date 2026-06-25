"use client";

import {
  Briefcase,
  Code2,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Play,
  RotateCcw,
  Save,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import type { EditorJob } from "./types";

interface EditorHeaderProps {
  activeTab: "editor" | "chat" | "preview";
  autoSaving: boolean;
  dirty: boolean;
  incognito: boolean;
  isCompiling: boolean;
  isEngineReady: boolean;
  job: EditorJob | null;
  onRecompile: () => void;
  onSave: () => void;
  onTabChange: (tab: "editor" | "chat" | "preview") => void;
  onToggleIncognito: () => void;
  onZoomChange: (zoom: number) => void;
  pdfUrl: string | null;
  saving: boolean;
  zoom: number;
}

function EditorHeader({
  activeTab,
  autoSaving,
  dirty,
  incognito,
  job,
  pdfUrl,
  saving,
  zoom,
  isCompiling,
  isEngineReady,
  onSave,
  onTabChange,
  onToggleIncognito,
  onZoomChange,
  onRecompile,
}: EditorHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-border border-b">
      <div className="flex h-full items-center">
        <button
          className={`flex h-full items-center gap-1.5 border-b-2 px-3 text-xs transition-colors ${activeTab === "editor" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => onTabChange("editor")}
          type="button"
        >
          <Code2 className="size-3" />
          <span className="hidden sm:inline">Editor</span>
        </button>
        <button
          className={`flex h-full items-center gap-1.5 border-b-2 px-3 text-xs transition-colors ${activeTab === "chat" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => onTabChange("chat")}
          type="button"
        >
          <Sparkles className="size-3" />
          <span className="hidden sm:inline">AI Chat</span>
        </button>
        <button
          className={`flex h-full items-center gap-1.5 border-b-2 px-3 text-xs transition-colors sm:hidden ${activeTab === "preview" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => onTabChange("preview")}
          type="button"
        >
          <Eye className="size-3" />
        </button>
        <div className="mx-2 h-4 w-px bg-border" />
        {job && (
          <span className="hidden items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-primary text-xs sm:flex">
            <Briefcase className="size-3" />
            {job.title}
          </span>
        )}
        {incognito && (
          <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
            <EyeOff className="size-3" />
            <span className="hidden sm:inline">Saves paused</span>
          </span>
        )}
        {!incognito && dirty && (
          <span className="inline-flex items-center gap-1 text-xs text-yellow-500 dark:text-yellow-400">
            {autoSaving && <Loader2 className="size-3 animate-spin" />}
            <span className="hidden sm:inline">
              {autoSaving ? "Saving…" : "Unsaved changes"}
            </span>
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
        <button
          className={`rounded p-1 transition-colors ${incognito ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          onClick={onToggleIncognito}
          title={
            incognito
              ? "Resume saving (incognito off)"
              : "Pause saving (incognito)"
          }
          type="button"
        >
          {incognito ? (
            <EyeOff className="size-3.5" />
          ) : (
            <Eye className="size-3.5" />
          )}
        </button>
        <Button
          disabled={saving || !dirty || incognito}
          onClick={onSave}
          size="sm"
        >
          {saving ? (
            <Loader2 className="size-3.5 animate-spin sm:mr-1.5" />
          ) : (
            <Save className="size-3.5 sm:mr-1.5" />
          )}
          <span className="hidden sm:inline">Save</span>
        </Button>
      </div>
    </header>
  );
}

export default memo(EditorHeader);
