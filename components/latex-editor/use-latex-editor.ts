"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { BusyTexRunner, PdfLatex } from "texlyre-busytex";
import {
  DEFAULT_MODEL_ID,
  isValidModelId,
  MODEL_STORAGE_KEY,
  type ModelId,
} from "@/lib/models";
import { saveJobResumeLatex, saveResumeLatex } from "@/server/resume";
import type { ChatMsg, ConsultAnswer, EditorJob, EnginePhase } from "./types";
import { buildHistory, createMsgId } from "./types";

const DEBOUNCE_MS = 2500;
const PACKAGES_JS = "/core/busytex/texlive-extra.js";
const MAX_AUTO_FIX = 2;

function notice(content: string): ChatMsg {
  return { id: createMsgId(), role: "notice", content };
}

function userMsg(content: string): ChatMsg {
  return { id: createMsgId(), role: "user", content };
}

function assistantMsg(content: string, editsApplied?: number): ChatMsg {
  return {
    id: createMsgId(),
    role: "assistant",
    content,
    ...(editsApplied === undefined ? {} : { editsApplied }),
  };
}

function questionMsg(
  key: string,
  question: string,
  options: string[]
): ChatMsg {
  return { id: createMsgId(), role: "question", key, question, options };
}

export function useLatexEditor(
  initialLatex: string,
  _initialResumeUrl: string | null,
  job: EditorJob | null,
  isNewJobResume: boolean
) {
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

  const [autoSaving, setAutoSaving] = useState(false);

  const aiAppliedRef = useRef(false);
  const autoFixCountRef = useRef(0);
  const runAutoFixRef = useRef<(log: string) => void>(() => {
    /* initial placeholder */
  });
  const latexRef = useRef(latex);
  const runnerRef = useRef<InstanceType<typeof BusyTexRunner> | null>(null);
  const compilerRef = useRef<InstanceType<typeof PdfLatex> | null>(null);
  const initPromiseRef = useRef<Promise<void> | null>(null);
  const pdfBlobUrlRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEditRef = useRef(Date.now());

  useEffect(() => {
    latexRef.current = latex;
  }, [latex]);

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
        if (!compilerRef.current) {
          throw new Error("Compiler not initialized");
        }
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
            new Blob([result.pdf as BlobPart], { type: "application/pdf" })
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
    initEngine().catch(() => {
      /* startup failure handled by state */
    });
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

  const applyEdits = useCallback(
    (
      edits: { find: string; replace: string }[]
    ): { next: string; applied: number } => {
      let next = latexRef.current;
      let applied = 0;
      for (const { find, replace } of edits) {
        const f = find.replace(/\r\n/g, "\n");
        if (next.includes(f)) {
          next = next.replace(f, replace);
          applied++;
        }
      }
      return { next, applied };
    },
    []
  );

  const executeAIEdit = useCallback(
    async (
      instruction: string,
      history: { role: "user" | "assistant"; content: string }[],
      noticeMsg?: string,
      jobDescription?: string
    ) => {
      if (noticeMsg) {
        setChatMessages((prev) => [...prev, notice(noticeMsg)]);
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
        const { next, applied } = applyEdits(edits);

        if (applied > 0) {
          setLatex(next);
          setDirty(true);
          aiAppliedRef.current = true;
        } else if (edits.length > 0) {
          setChatMessages((prev) => [
            ...prev,
            notice("Could not apply edits — try rephrasing."),
          ]);
        }
        setChatMessages((prev) => [
          ...prev,
          assistantMsg(explanation, applied),
        ]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "AI request failed");
      } finally {
        setChatLoading(false);
      }
    },
    [modelId, applyEdits]
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
        notice(
          "Could not auto-fix — edit manually or try a different instruction."
        ),
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
        userMsg("Customize my resume for this job"),
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
            questionMsg(data.key, data.question, data.options),
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
        userMsg(answer),
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

  const handleChatSend = useCallback(async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) {
      return;
    }
    setChatInput("");
    autoFixCountRef.current = 0;
    setChatMessages((prev) => [...prev, userMsg(msg)]);
    await executeAIEdit(
      msg,
      buildHistory(chatMessages),
      undefined,
      job?.description
    );
  }, [chatInput, chatLoading, chatMessages, executeAIEdit, job]);

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const result = job
        ? await saveJobResumeLatex(job.id, latex)
        : await saveResumeLatex(latex);
      if (result.success) {
        setDirty(false);
        setAutoSaving(false);
        toast.success(job ? "Job resume saved" : "LaTeX saved");
      } else {
        toast.error(result.message ?? "Failed to save");
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }, [job, latex]);

  // ── Auto-save ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!dirty || saving) {
      return;
    }
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      setAutoSaving(true);
      handleSave();
    }, 5000);
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [dirty, saving, handleSave]);

  // ── Text change ────────────────────────────────────────────────────────────

  const handleLatexChange = useCallback((value: string) => {
    setLatex(value);
    setDirty(true);
    aiAppliedRef.current = false;
    lastEditRef.current = Date.now();
  }, []);

  // ── Key handler ────────────────────────────────────────────────────────────

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
    },
    [latex, dirty, saving, handleSave]
  );

  // ── Derived ────────────────────────────────────────────────────────────────

  const isEmpty = !latex.trim();
  const lastMsg = chatMessages.at(-1);
  const pendingQuestion =
    !consultDone && lastMsg?.role === "question" && !lastMsg.answered;

  return {
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
  };
}
