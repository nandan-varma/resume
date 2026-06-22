"use client";

import {
  ChevronDown,
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  Save,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { saveResumeLatex } from "@/server/resume";

interface ResumeClientProps {
  initialLatex: string | null;
  initialResumeUrl: string | null;
}

export function ResumeClient({
  initialResumeUrl,
  initialLatex,
}: ResumeClientProps) {
  const [resumeUrl, setResumeUrl] = useState(initialResumeUrl);
  const [uploading, setUploading] = useState(false);
  const [latexContent, setLatexContent] = useState(initialLatex ?? "");
  const [savingLatex, setSavingLatex] = useState(false);
  const [latexDirty, setLatexDirty] = useState(false);
  const [latexOpen, setLatexOpen] = useState(!!initialLatex);

  const uploadLabel = resumeUrl
    ? "Replace resume (PDF only)"
    : "Upload resume (PDF only)";
  let latexStatusLabel = "";
  if (latexDirty) {
    latexStatusLabel = "Unsaved changes";
  } else if (latexContent) {
    latexStatusLabel = "Saved";
  }

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }
    setUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const response = await fetch("/api/upload-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileBuffer: Array.from(new Uint8Array(arrayBuffer)),
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Upload failed");
      }
      const data = await response.json();
      if (data.success) {
        setResumeUrl(data.resumeUrl);
        toast.success("Resume uploaded");
      } else {
        throw new Error(data.message || "Upload failed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSaveLatex = async () => {
    setSavingLatex(true);
    const result = await saveResumeLatex(latexContent);
    setSavingLatex(false);
    if (result.success) {
      setLatexDirty(false);
      toast.success("LaTeX saved");
    } else {
      toast.error(result.message || "Failed to save");
    }
  };

  return (
    <main className="min-h-screen p-6 md:p-10" id="main-content">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 animate-enter-up">
          <h1 className="font-bold text-3xl text-foreground">Resume</h1>
          <p className="mt-1 text-muted-foreground">
            Your resume is used for all AI analysis
          </p>
        </div>

        <Card className="mb-4 animate-enter-up p-6 [animation-delay:80ms]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-base text-foreground">
              PDF Resume
            </h2>
            <div className="flex items-center gap-3">
              {resumeUrl && (
                <a
                  className="inline-flex items-center gap-1 text-primary text-xs hover:underline"
                  href={resumeUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <FileText className="size-3" />
                  View current
                  <ExternalLink className="size-3" />
                </a>
              )}
              <Link
                className="inline-flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
                href="/editor"
              >
                <Pencil className="size-3" />
                Open editor
              </Link>
            </div>
          </div>

          {!resumeUrl && (
            <div className="mb-4 flex items-start gap-2.5 border border-warning/20 bg-warning/10 px-3 py-2.5 text-sm text-warning">
              <Upload className="mt-0.5 size-4 shrink-0" />
              <span>No resume uploaded yet — required for AI analysis.</span>
            </div>
          )}

          {resumeUrl && (
            <div className="mb-4 flex items-start gap-2.5 border border-info/20 bg-info/10 px-3 py-2.5 text-info text-sm">
              <FileText className="mt-0.5 size-4 shrink-0" />
              <span>
                After uploading, AI auto-generates editable LaTeX in the{" "}
                <Link
                  className="font-medium underline underline-offset-3 hover:no-underline"
                  href="/editor"
                >
                  editor
                </Link>
                . This may take a moment.
              </span>
            </div>
          )}

          <label
            className={cn(
              "flex cursor-pointer items-center gap-3 border border-border border-dashed px-5 py-4",
              "transition-colors hover:border-primary/40 hover:bg-muted/30",
              uploading && "pointer-events-none opacity-60"
            )}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className="text-muted-foreground text-sm">
              {uploading ? "Uploading…" : uploadLabel}
            </span>
            <input
              accept=".pdf"
              className="hidden"
              disabled={uploading}
              onChange={handleResumeUpload}
              type="file"
            />
          </label>
        </Card>

        <Card className="animate-enter-up p-6 [animation-delay:150ms]">
          <button
            className="flex w-full items-center justify-between text-left"
            onClick={() => setLatexOpen((v) => !v)}
            type="button"
          >
            <div>
              <h2 className="font-semibold text-base text-foreground">
                LaTeX Source
              </h2>
              <p className="mt-0.5 text-muted-foreground text-xs">
                Store your resume source for version control
              </p>
            </div>
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform duration-200",
                latexOpen && "rotate-180"
              )}
            />
          </button>

          {latexOpen && (
            <div className="mt-4 space-y-3">
              <Textarea
                aria-label="LaTeX resume source code"
                className="resize-y font-mono text-sm"
                onChange={(e) => {
                  setLatexContent(e.target.value);
                  setLatexDirty(true);
                }}
                placeholder="Paste your LaTeX resume source here…"
                rows={18}
                value={latexContent}
              />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">
                  {latexStatusLabel}
                </span>
                <Button
                  disabled={savingLatex || !latexDirty}
                  onClick={handleSaveLatex}
                  size="sm"
                >
                  {savingLatex ? (
                    <>
                      <Loader2 className="mr-2 size-3.5 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 size-3.5" />
                      Save LaTeX
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
