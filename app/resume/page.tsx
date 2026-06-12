"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthGuard } from "@/components/auth-guard";
import { Navigation } from "@/components/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Upload, FileText, Loader2, Save, ExternalLink, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPersonalInformation, saveResumeLatex } from "@/server/users";

interface PersonalInfo {
  resumeUrl: string | null;
  resumeLatex: string | null;
}

export default function ResumePage() {
  const [info, setInfo] = useState<PersonalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [latexContent, setLatexContent] = useState("");
  const [savingLatex, setSavingLatex] = useState(false);
  const [latexDirty, setLatexDirty] = useState(false);
  const [latexOpen, setLatexOpen] = useState(false);

  useEffect(() => {
    getPersonalInformation().then((data) => {
      if (data) {
        setInfo({ resumeUrl: data.resumeUrl ?? null, resumeLatex: data.resumeLatex ?? null });
        setLatexContent(data.resumeLatex ?? "");
        if (data.resumeLatex) setLatexOpen(true);
      }
      setLoading(false);
    });
  }, []);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
        setInfo((prev) => ({ ...prev!, resumeUrl: data.resumeUrl }));
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

  if (loading) {
    return (
      <AuthGuard>
        <Navigation activeTab="resume" />
        <div className="min-h-screen bg-background p-6 md:p-10">
          <div className="mx-auto max-w-2xl space-y-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-12" />
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Navigation activeTab="resume" />
      <div className="min-h-screen bg-background p-6 md:p-10">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Resume</h1>
            <p className="mt-1 text-muted-foreground">
              Your resume is used for all AI analysis
            </p>
          </div>

          {/* PDF Resume */}
          <Card className="mb-4 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">PDF Resume</h2>
              {info?.resumeUrl && (
                <a
                  href={info.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <FileText className="size-3" />
                  View current
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>

            {!info?.resumeUrl && (
              <p className="mb-3 text-sm text-amber-600 dark:text-amber-400">
                No resume uploaded yet — required for AI analysis.
              </p>
            )}

            <label className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border px-5 py-4",
              "hover:border-primary/40 hover:bg-muted/30 transition-colors",
              uploading && "pointer-events-none opacity-60"
            )}>
              {uploading ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="size-4 text-muted-foreground shrink-0" />
              )}
              <span className="text-sm text-muted-foreground">
                {uploading
                  ? "Uploading…"
                  : info?.resumeUrl
                    ? "Replace resume (PDF only)"
                    : "Upload resume (PDF only)"}
              </span>
              <input
                type="file"
                accept=".pdf"
                onChange={handleResumeUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </Card>

          {/* LaTeX — collapsible */}
          <Card className="p-6">
            <button
              type="button"
              onClick={() => setLatexOpen((v) => !v)}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <h2 className="text-base font-semibold text-foreground">LaTeX Source</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
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
                  value={latexContent}
                  onChange={(e) => {
                    setLatexContent(e.target.value);
                    setLatexDirty(true);
                  }}
                  rows={18}
                  placeholder="Paste your LaTeX resume source here…"
                  className="font-mono text-sm resize-y"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {latexDirty ? "Unsaved changes" : latexContent ? "Saved" : ""}
                  </span>
                  <Button
                    onClick={handleSaveLatex}
                    disabled={savingLatex || !latexDirty}
                    size="sm"
                  >
                    {savingLatex ? (
                      <><Loader2 className="mr-2 size-3.5 animate-spin" />Saving…</>
                    ) : (
                      <><Save className="mr-2 size-3.5" />Save LaTeX</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
