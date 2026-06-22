"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BusyTexRunner, PdfLatex } from "texlyre-busytex";
import type { EnginePhase } from "./types";

const PACKAGES_JS = "/core/busytex/texlive-extra.js";

export function useEngine() {
  const [engine, setEngine] = useState<EnginePhase>({ phase: "idle" });
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [compileLog, setCompileLog] = useState("");
  const [showLog, setShowLog] = useState(false);

  const runnerRef = useRef<InstanceType<typeof BusyTexRunner> | null>(null);
  const compilerRef = useRef<InstanceType<typeof PdfLatex> | null>(null);
  const initPromiseRef = useRef<Promise<void> | null>(null);
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

  return {
    engine,
    pdfUrl,
    compileLog,
    showLog,
    setShowLog,
    compile,
    initEngine,
  };
}
