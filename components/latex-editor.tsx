"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Terminal,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Link from "next/link";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DEFAULT_MODEL_ID, isValidModelId, type ModelId } from "@/lib/models";
import { saveResumeLatex } from "@/server/resume";

const MODEL_STORAGE_KEY = "job-match-ai-model";

const DEBOUNCE_MS = 2500;
const LATEX_BLOCK_REGEX = /```latex\n([\s\S]*?)\n?```/;
// texlive-extra is the cumulative tier: includes collection-latex, collection-latexrecommended,
// collection-latexextra, collection-fontsrecommended (cm-super, lm, etc.) and more.
const PACKAGES_JS = "/core/busytex/texlive-extra.js";

type EnginePhase =
  | { phase: "idle" }
  | { phase: "loading"; label: string }
  | { phase: "ready" }
  | { phase: "compiling" }
  | { phase: "error"; message: string };

type ChatMsg =
  | { role: "user" | "assistant"; content: string }
  | { role: "notice"; content: string };

const MAX_AUTO_FIX = 2;

// Strips the latex code block so we don't re-send huge content in history
function toHistoryContent(content: string) {
  return content
    .replace(/```latex[\s\S]*?```/g, "[latex applied to editor]")
    .trim();
}

// Shows explanation text and an "applied" indicator instead of raw latex
function AssistantBubble({
  content,
  streaming,
}: {
  content: string;
  streaming: boolean;
}) {
  const latexStart = content.indexOf("```latex");
  const hasBlock = latexStart !== -1;
  const explanation = hasBlock ? content.slice(0, latexStart).trim() : content;
  const closed =
    hasBlock && content.indexOf("```", latexStart + 7) > latexStart + 7;

  return (
    <span className="whitespace-pre-wrap">
      {explanation}
      {hasBlock && (
        <>
          {explanation ? " " : ""}
          <span className="inline-flex items-center gap-1 font-medium text-green-600 dark:text-green-400">
            <CheckCircle2 className="size-3 shrink-0" />
            {closed ? "Applied to editor" : "Applying…"}
          </span>
        </>
      )}
      {!hasBlock && streaming && (
        <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-current align-middle" />
      )}
    </span>
  );
}

interface LatexEditorProps {
  initialLatex: string;
  initialResumeUrl: string | null;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: LaTeX editor is a single coherent component managing engine, compile, and chat state together
export function LatexEditor({
  initialLatex,
  initialResumeUrl,
}: LatexEditorProps) {
  const [latex, setLatex] = useState(initialLatex);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [engine, setEngine] = useState<EnginePhase>({ phase: "idle" });
  const [compileLog, setCompileLog] = useState("");
  const [showLog, setShowLog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [zoom, setZoom] = useState(100);

  // Chat state
  const [activeTab, setActiveTab] = useState<"editor" | "chat">("editor");
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [modelId] = useState<ModelId>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_MODEL_ID;
    }
    const stored = localStorage.getItem(MODEL_STORAGE_KEY);
    return stored && isValidModelId(stored)
      ? (stored as ModelId)
      : DEFAULT_MODEL_ID;
  });
  const chatEndRef = useRef<HTMLDivElement>(null);
  const aiAppliedRef = useRef(false);
  const autoFixCountRef = useRef(0);
  // Holds the latest runAutoFix so the compile-error effect never captures a stale closure
  const runAutoFixRef = useRef<(log: string) => void>(() => {
    /* noop until first render */
  });

  // biome-ignore lint/suspicious/noExplicitAny: WASM module types resolved via dynamic import
  const runnerRef = useRef<any>(null);
  // biome-ignore lint/suspicious/noExplicitAny: WASM module types resolved via dynamic import
  const compilerRef = useRef<any>(null);
  const initPromiseRef = useRef<Promise<void> | null>(null);
  const pdfBlobUrlRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const revokePdf = useCallback(() => {
    if (pdfBlobUrlRef.current) {
      URL.revokeObjectURL(pdfBlobUrlRef.current);
      pdfBlobUrlRef.current = null;
    }
  }, []);

  const initEngine = useCallback((): Promise<void> => {
    if (runnerRef.current) {
      return Promise.resolve();
    }
    if (initPromiseRef.current) {
      return initPromiseRef.current;
    }

    initPromiseRef.current = (async () => {
      setEngine({ phase: "loading", label: "Loading LaTeX engine…" });
      const { BusyTexRunner, PdfLatex } = await import("texlyre-busytex");

      setEngine({
        phase: "loading",
        label: "Downloading TeX packages (first time only)…",
      });
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
          setEngine({
            phase: "error",
            message: "Compilation failed — see log below",
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setEngine({ phase: "error", message });
      }
    },
    [initEngine, revokePdf]
  );

  // Pre-initialize engine on mount so it's ready when user starts typing
  useEffect(() => {
    initEngine().catch(() => {
      /* pre-init failure handled by engine state */
    });
  }, [initEngine]);

  // Debounced compile on latex change
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (!latex.trim()) {
      revokePdf();
      setPdfUrl(null);
      return;
    }
    debounceRef.current = setTimeout(() => compile(latex), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [latex, compile, revokePdf]);

  // Cleanup blob URL on unmount
  useEffect(() => () => revokePdf(), [revokePdf]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Shared fetch+stream logic used by both user chat and auto-fix
  const executeAIEdit = useCallback(
    async (
      instruction: string,
      currentLatex: string,
      history: { role: "user" | "assistant"; content: string }[],
      noticeMsg?: string
    ) => {
      if (noticeMsg) {
        setChatMessages((prev) => [
          ...prev,
          { role: "notice" as const, content: noticeMsg },
        ]);
      }
      setChatLoading(true);

      try {
        const response = await fetch("/api/edit-latex", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instruction,
            latex: currentLatex,
            modelId,
            history,
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error ?? "Request failed");
        }

        if (!response.body) {
          throw new Error("No response body");
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: "" },
        ]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          accumulated += decoder.decode(value, { stream: true });
          setChatMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: accumulated,
            };
            return updated;
          });
        }

        const match = accumulated.match(LATEX_BLOCK_REGEX);
        if (match) {
          setLatex(match[1].trim());
          setDirty(true);
          aiAppliedRef.current = true;
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "AI request failed";
        toast.error(message);
        setChatMessages((prev) =>
          prev.at(-1)?.content === "" ? prev.slice(0, -1) : prev
        );
      } finally {
        setChatLoading(false);
      }
    },
    [modelId]
  );

  const handleChatSend = async () => {
    const instruction = chatInput.trim();
    if (!instruction || chatLoading) {
      return;
    }

    setChatInput("");
    autoFixCountRef.current = 0;
    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: instruction },
    ]);

    const history = chatMessages
      .filter(
        (m): m is Extract<ChatMsg, { role: "user" | "assistant" }> =>
          m.role === "user" || m.role === "assistant"
      )
      .map((m) => ({
        role: m.role,
        content:
          m.role === "assistant" ? toHistoryContent(m.content) : m.content,
      }));

    await executeAIEdit(instruction, latex, history);
  };

  const runAutoFix = useCallback(
    (errorLog: string) => {
      if (chatLoading) {
        return;
      }

      const instruction = `The LaTeX you generated has compilation errors. Fix them so the document compiles successfully.\n\nCompilation error log:\n${errorLog.slice(0, 2000)}`;

      const history = chatMessages
        .filter(
          (m): m is Extract<ChatMsg, { role: "user" | "assistant" }> =>
            m.role === "user" || m.role === "assistant"
        )
        .map((m) => ({
          role: m.role,
          content:
            m.role === "assistant" ? toHistoryContent(m.content) : m.content,
        }));

      executeAIEdit(
        instruction,
        latex,
        history,
        "Compilation error — fixing automatically…"
      );
    },
    [latex, chatMessages, chatLoading, executeAIEdit]
  );

  // Keep the ref current so the compile-error effect always calls the latest version
  useEffect(() => {
    runAutoFixRef.current = runAutoFix;
  }, [runAutoFix]);

  // After an AI edit, watch for compile errors and auto-fix (up to MAX_AUTO_FIX times)
  useEffect(() => {
    if (engine.phase !== "error" && engine.phase !== "ready") {
      return;
    }

    const wasAiApplied = aiAppliedRef.current;
    aiAppliedRef.current = false;

    if (!wasAiApplied) {
      return;
    }

    if (engine.phase === "error" && compileLog) {
      if (autoFixCountRef.current < MAX_AUTO_FIX) {
        autoFixCountRef.current += 1;
        runAutoFixRef.current(compileLog);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "notice" as const,
            content:
              "Could not fix compilation errors automatically — please edit manually or try a different instruction.",
          },
        ]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.phase, compileLog]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const result = await saveResumeLatex(latex);
    setSaving(false);
    if (result.success) {
      setDirty(false);
      toast.success("LaTeX saved");
    } else {
      toast.error(result.message ?? "Failed to save");
    }
  }, [latex]);

  const handleDownload = () => {
    if (!pdfUrl) {
      return;
    }
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
        if (!ta) {
          return;
        }
        const { selectionStart: s, selectionEnd: end } = ta;
        const next = `${latex.slice(0, s)}  ${latex.slice(end)}`;
        setLatex(next);
        setDirty(true);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = s + 2;
        });
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (dirty && !saving) {
          handleSave();
        }
      }
    },
    [latex, dirty, saving, handleSave]
  );

  const isEmpty = !latex.trim();
  const isLoading = engine.phase === "loading" || engine.phase === "compiling";
  const hasError = engine.phase === "error";

  let statusLabel: string | null = null;
  if (engine.phase === "loading") {
    statusLabel = engine.label;
  } else if (engine.phase === "compiling") {
    statusLabel = "Compiling…";
  }

  let previewContent: ReactNode;
  if (isEmpty) {
    previewContent = (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-muted-foreground text-sm">
          <p className="mb-1 font-medium">No preview yet</p>
          <p className="text-xs">Add LaTeX source to see a live preview</p>
        </div>
      </div>
    );
  } else if (!pdfUrl && hasError) {
    previewContent = (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <p className="text-center text-destructive text-sm">
          {engine.phase === "error" ? engine.message : "Compilation error"}
        </p>
        {compileLog && !showLog && (
          <button
            className="text-muted-foreground text-xs underline"
            onClick={() => setShowLog(true)}
            type="button"
          >
            Show compilation log
          </button>
        )}
      </div>
    );
  } else if (pdfUrl) {
    previewContent = (
      <div className="flex-1 overflow-auto">
        <div
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top left",
            width: `${10_000 / zoom}%`,
            minHeight: "100%",
          }}
        >
          <iframe
            className="h-[calc(100vh-7rem)] w-full border-0"
            src={pdfUrl}
            title="LaTeX PDF preview"
          />
        </div>
      </div>
    );
  } else {
    previewContent = (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-muted-foreground text-sm">
          <Loader2 className="mx-auto mb-2 size-5 animate-spin" />
          <p className="text-xs">{statusLabel ?? "Initializing…"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* ── Header ── */}
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
          {dirty && (
            <span className="text-xs text-yellow-500 dark:text-yellow-400">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 sm:flex">
            <button
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setZoom((z) => Math.max(50, z - 10))}
              title="Zoom out preview"
              type="button"
            >
              <ZoomOut className="size-3.5" />
            </button>
            <span className="min-w-[3ch] text-center text-muted-foreground text-xs">
              {zoom}%
            </span>
            <button
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setZoom((z) => Math.min(200, z + 10))}
              title="Zoom in preview"
              type="button"
            >
              <ZoomIn className="size-3.5" />
            </button>
            <button
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setZoom(100)}
              title="Reset zoom"
              type="button"
            >
              <RotateCcw className="size-3" />
            </button>
          </div>

          <div className="h-4 w-px bg-border" />

          <Button
            disabled={!pdfUrl}
            onClick={handleDownload}
            size="sm"
            title="Download compiled PDF"
            variant="outline"
          >
            <Download className="size-3.5" />
            <span className="ml-1.5 hidden sm:inline">Download PDF</span>
          </Button>
          <Button disabled={saving || !dirty} onClick={handleSave} size="sm">
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
        <div className="flex min-h-0 w-1/2 flex-col border-border border-r">
          <div className="flex shrink-0 items-center border-border/50 border-b">
            <button
              className={`border-b-2 px-3 py-2 text-xs transition-colors ${activeTab === "editor" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              onClick={() => setActiveTab("editor")}
              type="button"
            >
              Editor
            </button>
            <button
              className={`flex items-center gap-1 border-b-2 px-3 py-2 text-xs transition-colors ${activeTab === "chat" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              onClick={() => setActiveTab("chat")}
              type="button"
            >
              <Sparkles className="size-3" />
              AI Chat
            </button>
            {activeTab === "editor" && (
              <span className="ml-auto px-3 text-muted-foreground text-xs">
                {latex.split("\n").length} lines
              </span>
            )}
          </div>

          <textarea
            aria-label="LaTeX source"
            className={`min-h-0 flex-1 resize-none bg-background p-4 font-mono text-foreground text-sm focus:outline-none ${activeTab === "chat" ? "hidden" : ""}`}
            onChange={(e) => {
              setLatex(e.target.value);
              setDirty(true);
              aiAppliedRef.current = false; // cancel pending auto-fix if user edits manually
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isEmpty && initialResumeUrl
                ? "AI is generating LaTeX from your uploaded PDF — check back in a moment…"
                : "Paste or type your LaTeX here…\n\nExample:\n\\documentclass{article}\n\\begin{document}\nHello World\n\\end{document}"
            }
            ref={textareaRef}
            spellCheck={false}
            value={latex}
          />

          {/* AI chat panel */}
          <div
            className={`min-h-0 flex-col border-border border-t ${activeTab === "chat" ? "flex flex-1" : "hidden"}`}
          >
            {/* Message list */}
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {chatMessages.length === 0 ? (
                <p className="py-4 text-center text-muted-foreground text-xs">
                  Describe what you'd like to change and AI will edit your
                  LaTeX.
                </p>
              ) : (
                chatMessages.map((msg, i) =>
                  msg.role === "notice" ? (
                    // biome-ignore lint/suspicious/noArrayIndexKey: chat messages are append-only and never reordered
                    <div
                      className="flex items-center justify-center gap-1.5 py-0.5 text-muted-foreground text-xs"
                      key={i}
                    >
                      <AlertTriangle className="size-3 shrink-0 text-yellow-500" />
                      {msg.content}
                    </div>
                  ) : (
                    // biome-ignore lint/suspicious/noArrayIndexKey: chat messages are append-only and never reordered
                    <div
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      key={i}
                    >
                      <span
                        className={`inline-block max-w-[85%] rounded px-2.5 py-1.5 text-xs leading-relaxed ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <AssistantBubble
                            content={msg.content}
                            streaming={
                              chatLoading && i === chatMessages.length - 1
                            }
                          />
                        ) : (
                          msg.content
                        )}
                      </span>
                    </div>
                  )
                )
              )}
              {chatLoading && chatMessages.at(-1)?.role === "user" && (
                <div className="flex justify-start">
                  <span className="inline-flex items-center gap-1 rounded bg-muted px-2.5 py-1.5 text-muted-foreground text-xs">
                    <Loader2 className="size-3 animate-spin" />
                    Thinking…
                  </span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input row */}
            <div className="flex shrink-0 items-center gap-2 border-border/50 border-t p-2">
              <input
                className="h-7 flex-1 rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                disabled={chatLoading}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleChatSend();
                  }
                }}
                placeholder="e.g. Add a skills section, make fonts smaller…"
                type="text"
                value={chatInput}
              />
              <Button
                aria-label="Send"
                className="h-7 w-7 shrink-0 p-0"
                disabled={chatLoading || !chatInput.trim()}
                onClick={handleChatSend}
                size="sm"
              >
                {chatLoading ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Send className="size-3" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div className="relative flex w-1/2 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-border/50 border-b px-3 py-1">
            <span className="text-muted-foreground text-xs">Preview</span>
            <div className="flex items-center gap-2">
              {isLoading && (
                <span className="flex items-center gap-1 text-muted-foreground text-xs">
                  <Loader2 className="size-3 animate-spin" />
                  {statusLabel}
                </span>
              )}
              {hasError && compileLog && (
                <button
                  className="flex items-center gap-1 text-destructive text-xs hover:underline"
                  onClick={() => setShowLog((v) => !v)}
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

          {/* Compile log panel (errors) */}
          {hasError && showLog && compileLog && (
            <div className="max-h-48 overflow-auto border-border/50 border-b bg-destructive/5 p-3">
              <pre className="whitespace-pre-wrap font-mono text-destructive text-xs">
                {compileLog}
              </pre>
            </div>
          )}

          {previewContent}
        </div>
      </div>
    </div>
  );
}
