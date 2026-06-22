"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
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
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_MODEL_ID,
  isValidModelId,
  MODEL_STORAGE_KEY,
  type ModelId,
} from "@/lib/models";
import { saveJobResumeLatex, saveResumeLatex } from "@/server/resume";

const DEBOUNCE_MS = 2500;
const PACKAGES_JS = "/core/busytex/texlive-extra.js";
const MAX_AUTO_FIX = 2;

// ── Types ────────────────────────────────────────────────────────────────────

type EnginePhase =
  | { phase: "idle" }
  | { phase: "loading"; label: string }
  | { phase: "ready" }
  | { phase: "compiling" }
  | { phase: "error"; message: string };

interface ConsultAnswer {
  answer: string;
  key: string;
  question: string;
}

type ChatMsg =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; editsApplied?: number }
  | {
      role: "question";
      key: string;
      question: string;
      options: string[];
      answered?: string;
    }
  | { role: "notice"; content: string };

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildHistory(msgs: ChatMsg[]) {
  return msgs.flatMap((m): { role: "user" | "assistant"; content: string }[] =>
    m.role === "user" || m.role === "assistant"
      ? [{ role: m.role, content: m.content }]
      : []
  );
}

// ── QuestionBubble ────────────────────────────────────────────────────────────

function QuestionBubble({
  question,
  options,
  answered,
  loading,
  onPick,
  onSkip,
}: {
  question: string;
  options: string[];
  answered?: string;
  loading: boolean;
  onPick: (a: string) => void;
  onSkip: () => void;
}) {
  const [showCustom, setShowCustom] = useState(false);
  const [custom, setCustom] = useState("");

  return (
    <div className="max-w-[90%] space-y-2 rounded bg-muted px-2.5 py-2 text-xs">
      <p
        className={
          answered ? "text-muted-foreground" : "font-medium text-foreground"
        }
      >
        {question}
      </p>
      {answered ? (
        <span className="text-primary">→ {answered}</span>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {options.map((opt) => (
              <button
                className="rounded border border-border px-2.5 py-1 transition-colors hover:border-primary/60 disabled:opacity-50"
                disabled={loading}
                key={opt}
                onClick={() => onPick(opt)}
                type="button"
              >
                {opt}
              </button>
            ))}
          </div>
          {showCustom ? (
            <div className="flex gap-1.5">
              <input
                autoFocus
                className="h-6 flex-1 rounded border border-border bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && custom.trim() && onPick(custom.trim())
                }
                placeholder="Type your answer…"
                value={custom}
              />
              <button
                className="rounded bg-primary px-2 text-primary-foreground disabled:opacity-50"
                disabled={!custom.trim() || loading}
                onClick={() => onPick(custom.trim())}
                type="button"
              >
                OK
              </button>
            </div>
          ) : (
            <div className="flex gap-3 text-muted-foreground">
              <button
                className="underline hover:text-foreground"
                onClick={() => setShowCustom(true)}
                type="button"
              >
                Other…
              </button>
              <button
                className="underline hover:text-foreground"
                disabled={loading}
                onClick={onSkip}
                type="button"
              >
                Skip
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── AssistantBubble ───────────────────────────────────────────────────────────

function AssistantBubble({
  content,
  editsApplied,
}: {
  content: string;
  editsApplied?: number;
}) {
  return (
    <span className="whitespace-pre-wrap">
      {content}
      {!!editsApplied && (
        <>
          {" "}
          <span className="inline-flex items-center gap-1 font-medium text-green-600 dark:text-green-400">
            <CheckCircle2 className="size-3 shrink-0" />
            Applied to editor
          </span>
        </>
      )}
    </span>
  );
}

// ── LatexEditor ───────────────────────────────────────────────────────────────

interface LatexEditorProps {
  initialLatex: string;
  initialResumeUrl: string | null;
  isNewJobResume?: boolean;
  job?: { id: number; title: string; description: string } | null;
}

export function LatexEditor({
  initialLatex,
  initialResumeUrl,
  job,
  isNewJobResume = false,
}: LatexEditorProps) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [latex, setLatex] = useState(initialLatex);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [engine, setEngine] = useState<EnginePhase>({ phase: "idle" });
  const [compileLog, setCompileLog] = useState("");
  const [showLog, setShowLog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [activeTab, setActiveTab] = useState<"editor" | "chat">(() =>
    job && isNewJobResume ? "chat" : "editor"
  );
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
  const [consultAnswers, setConsultAnswers] = useState<ConsultAnswer[]>([]);
  const [consultDone, setConsultDone] = useState(
    () => !(job && isNewJobResume)
  );

  // ── Refs ───────────────────────────────────────────────────────────────────
  const chatEndRef = useRef<HTMLDivElement>(null);
  const aiAppliedRef = useRef(false);
  const autoFixCountRef = useRef(0);
  const runAutoFixRef = useRef<(log: string) => void>(() => {});
  const latexRef = useRef(latex);
  const runnerRef = useRef<any>(null);
  const compilerRef = useRef<any>(null);
  const initPromiseRef = useRef<Promise<void> | null>(null);
  const pdfBlobUrlRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    latexRef.current = latex;
  }, [latex]);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);
  useEffect(
    () => () => {
      if (pdfBlobUrlRef.current) {
        URL.revokeObjectURL(pdfBlobUrlRef.current);
      }
    },
    []
  );

  // ── Engine ─────────────────────────────────────────────────────────────────

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
      setEngine({
        phase: "error",
        message: err instanceof Error ? err.message : String(err),
      });
      initPromiseRef.current = null;
      throw err;
    });
    return initPromiseRef.current;
  }, []);

  const compile = useCallback(
    async (src: string) => {
      if (!src.trim()) {
        if (pdfBlobUrlRef.current) {
          URL.revokeObjectURL(pdfBlobUrlRef.current);
          pdfBlobUrlRef.current = null;
        }
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
          if (pdfBlobUrlRef.current) {
            URL.revokeObjectURL(pdfBlobUrlRef.current);
          }
          const url = URL.createObjectURL(
            new Blob([result.pdf], { type: "application/pdf" })
          );
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
        setEngine({
          phase: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [initEngine]
  );

  useEffect(() => {
    initEngine().catch(() => {});
  }, [initEngine]);
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (!latex.trim()) {
      if (pdfBlobUrlRef.current) {
        URL.revokeObjectURL(pdfBlobUrlRef.current);
        pdfBlobUrlRef.current = null;
      }
      setPdfUrl(null);
      return;
    }
    debounceRef.current = setTimeout(() => compile(latex), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [latex, compile]);

  // ── AI edit ────────────────────────────────────────────────────────────────

  const executeAIEdit = useCallback(
    async (
      instruction: string,
      history: { role: "user" | "assistant"; content: string }[],
      noticeMsg?: string,
      jobDescription?: string
    ) => {
      if (noticeMsg) {
        setChatMessages((prev) => [
          ...prev,
          { role: "notice" as const, content: noticeMsg },
        ]);
      }
      setChatLoading(true);
      try {
        const res = await fetch("/api/edit-latex", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instruction,
            latex: latexRef.current,
            modelId,
            history,
            ...(jobDescription ? { jobDescription } : {}),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error ?? "Request failed");
        }

        const { explanation, edits } = data as {
          explanation: string;
          edits: { find: string; replace: string }[];
        };
        let next = latexRef.current;
        let applied = 0;
        for (const { find, replace } of edits) {
          const f = find.replace(/\r\n/g, "\n");
          if (next.includes(f)) {
            next = next.replace(f, replace);
            applied++;
          }
        }
        if (applied > 0) {
          setLatex(next);
          setDirty(true);
          aiAppliedRef.current = true;
        } else if (edits.length > 0) {
          setChatMessages((prev) => [
            ...prev,
            {
              role: "notice" as const,
              content: "Could not apply edits — try rephrasing.",
            },
          ]);
        }
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant" as const,
            content: explanation,
            editsApplied: applied,
          },
        ]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "AI request failed");
      } finally {
        setChatLoading(false);
      }
    },
    [modelId]
  );

  // ── Auto-fix after compile error ───────────────────────────────────────────

  const runAutoFix = useCallback(
    (errorLog: string) => {
      if (chatLoading) {
        return;
      }
      executeAIEdit(
        `The LaTeX has compilation errors. Fix them.\n\nError log:\n${errorLog.slice(0, 2000)}`,
        buildHistory(chatMessages),
        "Compilation error — fixing automatically…",
        job?.description
      );
    },
    [chatMessages, chatLoading, executeAIEdit, job]
  );

  useEffect(() => {
    runAutoFixRef.current = runAutoFix;
  }, [runAutoFix]);

  useEffect(() => {
    if (engine.phase !== "error" && engine.phase !== "ready") {
      return;
    }
    const wasAI = aiAppliedRef.current;
    aiAppliedRef.current = false;
    if (!wasAI || engine.phase !== "error" || !compileLog) {
      return;
    }
    if (autoFixCountRef.current < MAX_AUTO_FIX) {
      autoFixCountRef.current += 1;
      runAutoFixRef.current(compileLog);
    } else {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "notice" as const,
          content:
            "Could not auto-fix — edit manually or try a different instruction.",
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.phase, compileLog]);

  // ── Consultation ───────────────────────────────────────────────────────────

  const doConsultEdit = useCallback(
    (answers: ConsultAnswer[]) => {
      const ctx =
        answers.length > 0
          ? `\nContext you asked for:\n${answers.map((a) => `- ${a.question}: ${a.answer}`).join("\n")}`
          : "";
      setChatMessages((prev) => [
        ...prev,
        { role: "user" as const, content: "Customize my resume for this job" },
      ]);
      executeAIEdit(
        `Customize my resume for this job.${ctx}`,
        [],
        undefined,
        job?.description
      );
    },
    [executeAIEdit, job]
  );

  const fetchNextQuestion = useCallback(
    async (answers: ConsultAnswer[]) => {
      setChatLoading(true);
      let chain = false;
      try {
        const res = await fetch("/api/job-customize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latex: latexRef.current,
            jobDescription: job?.description,
            modelId,
            answers,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          toast.error(data.error ?? "Rate limit — try later");
          setConsultDone(true);
        } else if (!res.ok) {
          throw new Error(data.error ?? "Consultation failed");
        } else if (data.type === "question") {
          setChatMessages((prev) => [
            ...prev,
            {
              role: "question" as const,
              key: data.key,
              question: data.question,
              options: data.options,
            },
          ]);
        } else {
          chain = true;
          setConsultDone(true);
          doConsultEdit(answers);
        }
      } catch {
        toast.error("Consultation failed — use chat to customize");
        setConsultDone(true);
      } finally {
        if (!chain) {
          setChatLoading(false);
        }
      }
    },
    [job, modelId, doConsultEdit]
  );

  const handleConsultPick = useCallback(
    (idx: number, key: string, question: string, answer: string) => {
      const next: ConsultAnswer[] = [
        ...consultAnswers,
        { key, question, answer },
      ];
      setConsultAnswers(next);
      setChatMessages((prev) => [
        ...prev.map((m, i) => (i === idx ? { ...m, answered: answer } : m)),
        { role: "user" as const, content: answer },
      ]);
      fetchNextQuestion(next);
    },
    [consultAnswers, fetchNextQuestion]
  );

  const handleConsultSkip = useCallback(() => {
    setConsultDone(true);
    doConsultEdit(consultAnswers);
  }, [consultAnswers, doConsultEdit]);

  // mount-only: start consultation for new job resumes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (job && isNewJobResume && initialLatex.trim()) {
      fetchNextQuestion([]);
    }
  }, [job, isNewJobResume, initialLatex.trim, fetchNextQuestion]);

  // ── Chat ───────────────────────────────────────────────────────────────────

  const handleChatSend = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) {
      return;
    }
    setChatInput("");
    autoFixCountRef.current = 0;
    setChatMessages((prev) => [
      ...prev,
      { role: "user" as const, content: msg },
    ]);
    await executeAIEdit(
      msg,
      buildHistory(chatMessages),
      undefined,
      job?.description
    );
  };

  // ── Save / download ────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    const result = job
      ? await saveJobResumeLatex(job.id, latex)
      : await saveResumeLatex(latex);
    setSaving(false);
    if (result.success) {
      setDirty(false);
      toast.success(job ? "Job resume saved" : "LaTeX saved");
    } else {
      toast.error(result.message ?? "Failed to save");
    }
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
        setLatex(`${latex.slice(0, s)}  ${latex.slice(end)}`);
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [latex, dirty, saving, handleSave]
  );

  // ── Derived ────────────────────────────────────────────────────────────────

  const isEmpty = !latex.trim();
  const isCompiling =
    engine.phase === "loading" || engine.phase === "compiling";
  const hasError = engine.phase === "error";
  const statusLabel =
    engine.phase === "loading"
      ? engine.label
      : engine.phase === "compiling"
        ? "Compiling…"
        : null;
  const lastMsg = chatMessages.at(-1);
  const pendingQuestion =
    !consultDone && lastMsg?.role === "question" && !lastMsg.answered;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
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
              onClick={() => setZoom((z) => Math.min(200, z + 10))}
              title="Zoom in"
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
            onClick={() => {
              if (!pdfUrl) {
                return;
              }
              const a = document.createElement("a");
              a.href = pdfUrl;
              a.download = "resume.pdf";
              a.click();
            }}
            size="sm"
            title="Download PDF"
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

      {/* Job banner */}
      {job && (
        <div className="flex shrink-0 items-center gap-2 border-primary/20 border-b bg-primary/5 px-4 py-1.5">
          <Briefcase className="size-3 shrink-0 text-primary" />
          <span className="text-primary text-xs">
            Editing customized resume for <strong>{job.title}</strong>
          </span>
          <span className="ml-auto text-muted-foreground text-xs">
            Saves separately · won't affect your default resume
          </span>
        </div>
      )}

      {/* Split pane */}
      <div className="flex min-h-0 flex-1">
        {/* Left: editor + chat */}
        <div className="flex min-h-0 w-1/2 flex-col border-border border-r">
          {/* Tabs */}
          <div className="flex shrink-0 items-center border-border/50 border-b">
            {(["editor", "chat"] as const).map((tab) => (
              <button
                className={`flex items-center gap-1 border-b-2 px-3 py-2 text-xs transition-colors ${activeTab === tab ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                key={tab}
                onClick={() => setActiveTab(tab)}
                type="button"
              >
                {tab === "chat" && <Sparkles className="size-3" />}
                {tab === "editor" ? "Editor" : "AI Chat"}
              </button>
            ))}
            {activeTab === "editor" && (
              <span className="ml-auto px-3 text-muted-foreground text-xs">
                {latex.split("\n").length} lines
              </span>
            )}
          </div>

          {/* Editor */}
          <textarea
            aria-label="LaTeX source"
            className={`min-h-0 flex-1 resize-none bg-background p-4 font-mono text-foreground text-sm focus:outline-none ${activeTab === "chat" ? "hidden" : ""}`}
            onChange={(e) => {
              setLatex(e.target.value);
              setDirty(true);
              aiAppliedRef.current = false;
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isEmpty && initialResumeUrl
                ? "AI is generating LaTeX from your PDF…"
                : "Paste or type your LaTeX here…"
            }
            ref={textareaRef}
            spellCheck={false}
            value={latex}
          />

          {/* Chat */}
          <div
            className={`min-h-0 flex-col border-border border-t ${activeTab === "chat" ? "flex flex-1" : "hidden"}`}
          >
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {chatMessages.length === 0 ? (
                chatLoading ? (
                  <div className="flex justify-start">
                    <span className="inline-flex items-center gap-1.5 rounded bg-muted px-2.5 py-1.5 text-muted-foreground text-xs">
                      <Loader2 className="size-3 animate-spin" />
                      Reviewing resume…
                    </span>
                  </div>
                ) : (
                  <p className="py-4 text-center text-muted-foreground text-xs">
                    {job
                      ? "Resume customized — ask for further changes."
                      : "Describe what you'd like to change and AI will edit your LaTeX."}
                  </p>
                )
              ) : (
                chatMessages.map((msg, i) => {
                  if (msg.role === "notice") {
                    return (
                      <div
                        className="flex items-center justify-center gap-1.5 py-0.5 text-muted-foreground text-xs"
                        key={i}
                      >
                        <AlertTriangle className="size-3 shrink-0 text-yellow-500" />
                        {msg.content}
                      </div>
                    );
                  }
                  if (msg.role === "question") {
                    return (
                      <div className="flex justify-start" key={i}>
                        <QuestionBubble
                          answered={msg.answered}
                          loading={chatLoading}
                          onPick={(a) =>
                            handleConsultPick(i, msg.key, msg.question, a)
                          }
                          onSkip={handleConsultSkip}
                          options={msg.options}
                          question={msg.question}
                        />
                      </div>
                    );
                  }
                  return (
                    <div
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      key={i}
                    >
                      <span
                        className={`inline-block max-w-[85%] rounded px-2.5 py-1.5 text-xs leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
                      >
                        {msg.role === "assistant" ? (
                          <AssistantBubble
                            content={msg.content}
                            editsApplied={msg.editsApplied}
                          />
                        ) : (
                          msg.content
                        )}
                      </span>
                    </div>
                  );
                })
              )}
              {chatLoading && lastMsg?.role === "user" && (
                <div className="flex justify-start">
                  <span className="inline-flex items-center gap-1 rounded bg-muted px-2.5 py-1.5 text-muted-foreground text-xs">
                    <Loader2 className="size-3 animate-spin" />
                    Thinking…
                  </span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="flex shrink-0 items-center gap-2 border-border/50 border-t p-2">
              <input
                className="h-7 flex-1 rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                disabled={chatLoading || pendingQuestion}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleChatSend();
                  }
                }}
                placeholder={
                  pendingQuestion
                    ? "Pick an option above…"
                    : job
                      ? "Ask for more changes…"
                      : "e.g. Add a skills section…"
                }
                type="text"
                value={chatInput}
              />
              <Button
                aria-label="Send"
                className="h-7 w-7 shrink-0 p-0"
                disabled={chatLoading || !chatInput.trim() || pendingQuestion}
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

        {/* Right: PDF preview */}
        <div className="relative flex w-1/2 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-border/50 border-b px-3 py-1">
            <span className="text-muted-foreground text-xs">Preview</span>
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

          {hasError && showLog && compileLog && (
            <div className="max-h-48 overflow-auto border-border/50 border-b bg-destructive/5 p-3">
              <pre className="whitespace-pre-wrap font-mono text-destructive text-xs">
                {compileLog}
              </pre>
            </div>
          )}

          {isEmpty ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-muted-foreground text-sm">
                <p className="mb-1 font-medium">No preview yet</p>
                <p className="text-xs">
                  Add LaTeX source to see a live preview
                </p>
              </div>
            </div>
          ) : !pdfUrl && hasError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
              <p className="text-center text-destructive text-sm">
                {engine.phase === "error"
                  ? engine.message
                  : "Compilation error"}
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
          ) : pdfUrl ? (
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
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-muted-foreground text-sm">
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
