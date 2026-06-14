"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Loader2,
  Save,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveResumeLatex } from "@/server/users";
import { buildPreviewHtml } from "@/lib/latex-preview";

const DEBOUNCE_MS = 800;

interface LatexEditorProps {
  initialLatex: string;
  initialResumeUrl: string | null;
}

export function LatexEditor({ initialLatex, initialResumeUrl }: LatexEditorProps) {
  const [latex, setLatex] = useState(initialLatex);
  const [srcDoc, setSrcDoc] = useState(() =>
    initialLatex ? buildPreviewHtml(initialLatex) : ""
  );
  const [rendering, setRendering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [zoom, setZoom] = useState(100);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Rebuild preview on change, debounced
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (latex.trim()) {
        setRendering(true);
        try {
          setSrcDoc(buildPreviewHtml(latex));
        } catch {
          // If converter throws, leave existing preview
        }
        setRendering(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [latex]);

  const handleSave = async () => {
    setSaving(true);
    const result = await saveResumeLatex(latex);
    setSaving(false);
    if (result.success) {
      setDirty(false);
      toast.success("LaTeX saved");
    } else {
      toast.error(result.message ?? "Failed to save");
    }
  };

  // Download: open print dialog on the compiled preview
  const handleDownload = () => {
    if (!latex.trim()) return;
    const html = buildPreviewHtml(latex, { autoprint: true });
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  // Tab key inserts two spaces in the textarea
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const ta = textareaRef.current;
        if (!ta) return;
        const { selectionStart: s, selectionEnd: end } = ta;
        const next = latex.slice(0, s) + "  " + latex.slice(end);
        setLatex(next);
        setDirty(true);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = s + 2;
        });
      }
      // Ctrl/Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (dirty && !saving) handleSave();
      }
    },
    [latex, dirty, saving]
  );

  const isEmpty = !latex.trim();

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* ── Header ── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Dashboard
          </Link>
          <span className="select-none text-border">|</span>
          <span className="text-sm font-medium">LaTeX Editor</span>
          {dirty && (
            <span className="text-xs text-yellow-500 dark:text-yellow-400">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls for preview pane */}
          <div className="hidden items-center gap-1 sm:flex">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(50, z - 10))}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Zoom out preview"
            >
              <ZoomOut className="size-3.5" />
            </button>
            <span className="min-w-[3ch] text-center text-xs text-muted-foreground">
              {zoom}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(200, z + 10))}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Zoom in preview"
            >
              <ZoomIn className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(100)}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Reset zoom"
            >
              <RotateCcw className="size-3" />
            </button>
          </div>

          <div className="h-4 w-px bg-border" />

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isEmpty}
            title="Opens browser print dialog — choose 'Save as PDF'"
          >
            <Download className="size-3.5" />
            <span className="ml-1.5 hidden sm:inline">Download PDF</span>
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>
            {saving ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 size-3.5" />
            )}
            Save
          </Button>
        </div>
      </header>

      {/* ── Split pane ── */}
      <div className="flex min-h-0 flex-1">
        {/* LaTeX source editor */}
        <div className="flex w-1/2 flex-col border-r border-border">
          <div className="flex items-center justify-between border-b border-border/50 px-3 py-1">
            <span className="text-xs text-muted-foreground">LaTeX Source</span>
            <span className="text-xs text-muted-foreground">
              {latex.split("\n").length} lines
            </span>
          </div>
          <textarea
            ref={textareaRef}
            value={latex}
            onChange={(e) => {
              setLatex(e.target.value);
              setDirty(true);
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 resize-none bg-background p-4 font-mono text-sm text-foreground focus:outline-none"
            spellCheck={false}
            aria-label="LaTeX source"
            placeholder={
              isEmpty && initialResumeUrl
                ? "AI is generating LaTeX from your uploaded PDF — check back in a moment…"
                : "Paste or type your LaTeX here…\n\nExample:\n\\documentclass{article}\n\\begin{document}\nHello World\n\\end{document}"
            }
          />
        </div>

        {/* Live preview */}
        <div className="relative flex w-1/2 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/50 px-3 py-1">
            <span className="text-xs text-muted-foreground">Preview</span>
            {rendering && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Rendering…
              </span>
            )}
          </div>

          {srcDoc ? (
            <div className="flex-1 overflow-auto bg-muted/30">
              <div
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: "top left",
                  width: `${10000 / zoom}%`,
                  minHeight: "100%",
                }}
              >
                <iframe
                  ref={iframeRef}
                  srcDoc={srcDoc}
                  title="LaTeX preview"
                  className="h-[calc(100vh-7rem)] w-full border-0 bg-white"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-sm text-muted-foreground">
                <p className="mb-1 font-medium">No preview yet</p>
                <p className="text-xs">Add LaTeX source to see a live preview</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
