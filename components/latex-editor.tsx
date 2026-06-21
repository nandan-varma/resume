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
  Terminal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveResumeLatex } from "@/server/users";

const DEBOUNCE_MS = 2500;
// texlive-extra is the cumulative tier: includes collection-latex, collection-latexrecommended,
// collection-latexextra, collection-fontsrecommended (cm-super, lm, etc.) and more.
const PACKAGES_JS = "/core/busytex/texlive-extra.js";

type EnginePhase =
  | { phase: "idle" }
  | { phase: "loading"; label: string }
  | { phase: "ready" }
  | { phase: "compiling" }
  | { phase: "error"; message: string };

interface LatexEditorProps {
  initialLatex: string;
  initialResumeUrl: string | null;
}

export function LatexEditor({ initialLatex, initialResumeUrl }: LatexEditorProps) {
  const [latex, setLatex] = useState(initialLatex);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [engine, setEngine] = useState<EnginePhase>({ phase: "idle" });
  const [compileLog, setCompileLog] = useState("");
  const [showLog, setShowLog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [zoom, setZoom] = useState(100);

  const runnerRef = useRef<any>(null);
  const compilerRef = useRef<any>(null);
  const initPromiseRef = useRef<Promise<void> | null>(null);
  const pdfBlobUrlRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const revokePdf = () => {
    if (pdfBlobUrlRef.current) {
      URL.revokeObjectURL(pdfBlobUrlRef.current);
      pdfBlobUrlRef.current = null;
    }
  };

  const initEngine = useCallback((): Promise<void> => {
    if (runnerRef.current) return Promise.resolve();
    if (initPromiseRef.current) return initPromiseRef.current;

    initPromiseRef.current = (async () => {
      setEngine({ phase: "loading", label: "Loading LaTeX engine…" });
      const { BusyTexRunner, PdfLatex } = await import("texlyre-busytex");

      setEngine({ phase: "loading", label: "Downloading TeX packages (first time only)…" });
      const runner = new BusyTexRunner({
        busytexBasePath: "/core/busytex",
        preloadDataPackages: [PACKAGES_JS],
        catalogDataPackages: [PACKAGES_JS],
        verbose: false,
      });

      await runner.initialize(true);
      runnerRef.current = runner;
      compilerRef.current = new PdfLatex(runner);
      setEngine({ phase: "ready" });
    })().catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      setEngine({ phase: "error", message });
      initPromiseRef.current = null; // allow retry
      throw err;
    });

    return initPromiseRef.current;
  }, []);

  const compile = useCallback(
    async (src: string) => {
      if (!src.trim()) {
        revokePdf();
        setPdfUrl(null);
        return;
      }

      try {
        await initEngine();
        setEngine({ phase: "compiling" });

        const result = await compilerRef.current.compile({
          input: src,
          rerun: true,
          verbose: "silent",
        });

        setCompileLog(result.log ?? "");

        if (result.success && result.pdf) {
          revokePdf();
          const blob = new Blob([result.pdf], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          pdfBlobUrlRef.current = url;
          setPdfUrl(url);
          setEngine({ phase: "ready" });
        } else {
          setEngine({ phase: "error", message: "Compilation failed — see log below" });
        }
      } catch (err) {
        if (engine.phase !== "error") {
          const message = err instanceof Error ? err.message : String(err);
          setEngine({ phase: "error", message });
        }
      }
    },
    [initEngine, engine.phase],
  );

  // Pre-initialize engine on mount so it's ready when user starts typing
  useEffect(() => {
    initEngine().catch(() => {});
  }, [initEngine]);

  // Debounced compile on latex change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!latex.trim()) {
      revokePdf();
      setPdfUrl(null);
      return;
    }
    debounceRef.current = setTimeout(() => compile(latex), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [latex, compile]);

  // Cleanup blob URL on unmount
  useEffect(() => () => revokePdf(), []);

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

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = "resume.pdf";
    a.click();
  };

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
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (dirty && !saving) handleSave();
      }
    },
    [latex, dirty, saving],
  );

  const isEmpty = !latex.trim();
  const isLoading =
    engine.phase === "loading" || engine.phase === "compiling";
  const hasError = engine.phase === "error";

  const statusLabel =
    engine.phase === "loading"
      ? engine.label
      : engine.phase === "compiling"
        ? "Compiling…"
        : null;

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
            disabled={!pdfUrl}
            title="Download compiled PDF"
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
            <div className="flex items-center gap-2">
              {isLoading && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  {statusLabel}
                </span>
              )}
              {hasError && compileLog && (
                <button
                  type="button"
                  onClick={() => setShowLog((v) => !v)}
                  className="flex items-center gap-1 text-xs text-destructive hover:underline"
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

          {/* Compile log panel (errors) */}
          {hasError && showLog && compileLog && (
            <div className="max-h-48 overflow-auto border-b border-border/50 bg-destructive/5 p-3">
              <pre className="whitespace-pre-wrap font-mono text-xs text-destructive">
                {compileLog}
              </pre>
            </div>
          )}

          {isEmpty ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-sm text-muted-foreground">
                <p className="mb-1 font-medium">No preview yet</p>
                <p className="text-xs">Add LaTeX source to see a live preview</p>
              </div>
            </div>
          ) : !pdfUrl && hasError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
              <p className="text-center text-sm text-destructive">
                {engine.phase === "error" ? engine.message : "Compilation error"}
              </p>
              {compileLog && !showLog && (
                <button
                  type="button"
                  onClick={() => setShowLog(true)}
                  className="text-xs text-muted-foreground underline"
                >
                  Show compilation log
                </button>
              )}
            </div>
          ) : pdfUrl ? (
            <div className="flex-1 overflow-auto">
              <div
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: "top left",
                  width: `${10000 / zoom}%`,
                  minHeight: "100%",
                }}
              >
                <iframe
                  src={pdfUrl}
                  title="LaTeX PDF preview"
                  className="h-[calc(100vh-7rem)] w-full border-0"
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-sm text-muted-foreground">
                <Loader2 className="mx-auto mb-2 size-5 animate-spin" />
                <p className="text-xs">{statusLabel ?? "Initializing…"}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
