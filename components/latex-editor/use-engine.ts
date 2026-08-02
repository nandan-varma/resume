"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BusyTexRunner, PdfLatex } from "texlyre-busytex";
import type { EnginePhase } from "./types";

const PACKAGES_JS = "/core/busytex/texlive-extra.js";
const PAGE_COUNT_RE = /Output written.*?\((\d+)\s+page/;
const FILL_PROBE_RE = /JOBMATCH_FILL:([\d.]+)pt:([\d.]+)pt/;

// Measuring unused space on the last page: \pagetotal (height used so far)
// vs \textheight (fixed page content height from geometry) — read right
// before \end{document}, while the last page is still "open". \pagegoal
// isn't usable here since LaTeX sets it to \maxdimen on the final page under
// \raggedbottom (the default for article), which these resumes use.
function withFillProbe(src: string): string {
  const idx = src.lastIndexOf("\\end{document}");
  if (idx === -1) {
    return src;
  }
  return `${src.slice(0, idx)}\\typeout{JOBMATCH_FILL:\\the\\pagetotal:\\the\\textheight}\n${src.slice(idx)}`;
}

function parseCompileLog(log: string) {
  const pages = log.match(PAGE_COUNT_RE)?.[1];
  const fillMatch = log.match(FILL_PROBE_RE);
  return {
    pageCount: pages ? Number.parseInt(pages, 10) : null,
    fillRatio: fillMatch
      ? Number.parseFloat(fillMatch[1]) / Number.parseFloat(fillMatch[2])
      : null,
  };
}

// Module-level singletons — survive navigation away from and back to /editor
let _runner: InstanceType<typeof BusyTexRunner> | null = null;
let _compiler: InstanceType<typeof PdfLatex> | null = null;
let _initPromise: Promise<void> | null = null;

export function useEngine() {
  const [engine, setEngine] = useState<EnginePhase>(
    _runner ? { phase: "ready" } : { phase: "idle" }
  );
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [compileLog, setCompileLog] = useState("");
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [fillRatio, setFillRatio] = useState<number | null>(null);
  const [showLog, setShowLog] = useState(false);

  const pdfBlobUrlRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (pdfBlobUrlRef.current) {
        URL.revokeObjectURL(pdfBlobUrlRef.current);
      }
    },
    []
  );

  const initEngine = useCallback((): Promise<void> => {
    if (_runner) {
      return Promise.resolve();
    }
    if (_initPromise) {
      return _initPromise;
    }

    _initPromise = (async () => {
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
      _runner = runner;
      _compiler = new PdfLatex(runner);
      setEngine({ phase: "ready" });
    })().catch((err) => {
      setEngine({
        phase: "error",
        message: err instanceof Error ? err.message : String(err),
      });
      _initPromise = null;
      throw err;
    });

    return _initPromise;
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
        if (!_compiler) {
          throw new Error("Compiler not initialized");
        }
        const result = await _compiler.compile({
          input: withFillProbe(src),
          rerun: true,
          verbose: "silent",
        });
        const log = result.log ?? "";
        setCompileLog(log);
        const parsed = parseCompileLog(log);
        setPageCount(parsed.pageCount);
        setFillRatio(parsed.fillRatio);
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

  return {
    engine,
    pageCount,
    fillRatio,
    pdfUrl,
    compileLog,
    showLog,
    setShowLog,
    compile,
    initEngine,
  };
}
