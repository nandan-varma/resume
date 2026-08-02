"use client";

import { createPlatexClient } from "@nandan-varma/platex/client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { EnginePhase } from "./types";

const WASM_BASE_PATH = "/core/busytex";
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

// No serviceUrl configured → platex/client falls back to its bundled WASM
// TeX Live engine (texlyre-busytex, dynamically imported and cached inside
// the library) on WASM-capable runtimes. The engine warm-up/runner lifecycle
// that used to live here is now @nandan-varma/platex's responsibility.
const platex = createPlatexClient({
  engine: "pdflatex",
  wasm: { basePath: WASM_BASE_PATH, dataPackages: [PACKAGES_JS] },
});

export function useEngine() {
  const [engine, setEngine] = useState<EnginePhase>({ phase: "idle" });
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [compileLog, setCompileLog] = useState("");
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [fillRatio, setFillRatio] = useState<number | null>(null);
  const [showLog, setShowLog] = useState(false);

  const pdfBlobUrlRef = useRef<string | null>(null);
  const hasCompiledRef = useRef(false);

  useEffect(
    () => () => {
      if (pdfBlobUrlRef.current) {
        URL.revokeObjectURL(pdfBlobUrlRef.current);
      }
    },
    []
  );

  const compile = useCallback(async (src: string) => {
    if (!src.trim()) {
      if (pdfBlobUrlRef.current) {
        URL.revokeObjectURL(pdfBlobUrlRef.current);
        pdfBlobUrlRef.current = null;
      }
      setPdfUrl(null);
      return;
    }

    setEngine(
      hasCompiledRef.current
        ? { phase: "compiling" }
        : { phase: "loading", label: "Loading LaTeX engine…" }
    );

    try {
      const result = await platex.compile(withFillProbe(src));
      hasCompiledRef.current = true;
      const log = result.logs.map((entry) => entry.log).join("\n");
      setCompileLog(log);
      const parsed = parseCompileLog(log);
      setPageCount(parsed.pageCount);
      setFillRatio(parsed.fillRatio);
      if (result.pdf) {
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
  }, []);

  return {
    compile,
    compileLog,
    engine,
    fillRatio,
    pageCount,
    pdfUrl,
    setShowLog,
    showLog,
  };
}
