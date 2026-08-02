"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ResumeUploadZone } from "@/components/resume-upload-zone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ErrorBoundary } from "@/lib/error-boundary";
import {
  usePersonalInfo,
  useRegenerateLatex,
  useResumeDocument,
  useSaveLatex,
} from "@/lib/queries/resume";

export function ResumeClient() {
  return (
    <ErrorBoundary>
      <ResumeClientInner />
    </ErrorBoundary>
  );
}

function ResumeClientInner() {
  const { data: personalInfo } = usePersonalInfo();
  const { data: doc } = useResumeDocument(null);
  const [resumeUrl, setResumeUrl] = useState(personalInfo?.resumeUrl ?? null);
  const [latexContent, setLatexContent] = useState(doc?.resumeLatex ?? "");
  const [latexDirty, setLatexDirty] = useState(false);
  const [outOfSync, setOutOfSync] = useState(false);
  const saveLatex = useSaveLatex(null, {
    onConflict: () => setOutOfSync(true),
  });
  const regenerate = useRegenerateLatex();

  const uploadLabel = resumeUrl ? "Replace resume" : "Upload your resume";
  const pendingGeneration = !!resumeUrl && !latexContent;

  let latexStatusLabel = "";
  if (outOfSync) {
    latexStatusLabel = "Edited elsewhere — reload to continue";
  } else if (latexDirty) {
    latexStatusLabel = "Unsaved changes";
  } else if (latexContent) {
    latexStatusLabel = "Saved";
  }

  const handleSaveLatex = async () => {
    try {
      await saveLatex.mutateAsync(latexContent);
      setLatexDirty(false);
    } catch {
      // toasted by the mutation's onError (including conflict)
    }
  };

  const handleRegenerate = async () => {
    try {
      const newLatex = await regenerate.mutateAsync();
      setLatexContent(newLatex);
      setLatexDirty(false);
    } catch {
      // toasted by the mutation's onError
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 md:px-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="flex animate-enter-up flex-col p-6 [animation-delay:80ms]">
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

          {resumeUrl && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-info/20 bg-info/10 px-3 py-2.5 text-info text-sm">
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

          <ResumeUploadZone
            className="flex-1"
            label={uploadLabel}
            onUploaded={(url) => {
              setResumeUrl(url);
              setLatexContent("");
              setLatexDirty(false);
            }}
          />
        </Card>

        <Card className="flex animate-enter-up flex-col p-6 [animation-delay:150ms]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-base text-foreground">
                LaTeX Source
              </h2>
              <p className="mt-0.5 text-muted-foreground text-xs">
                Store your resume source for version control
              </p>
            </div>
            {latexContent && !latexDirty && (
              <Badge
                className="gap-1 border-success/30 text-success"
                variant="outline"
              >
                <CheckCircle2 className="size-3" />
                Synced from PDF
              </Badge>
            )}
            {pendingGeneration && (
              <Badge
                className="gap-1 border-warning/30 text-warning"
                variant="outline"
              >
                <AlertTriangle className="size-3" />
                Not generated
              </Badge>
            )}
          </div>

          {pendingGeneration ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-border border-dashed p-6 text-center">
              <AlertTriangle className="size-6 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">
                No LaTeX has been generated from your uploaded PDF yet.
              </p>
              <Button
                disabled={regenerate.isPending}
                onClick={handleRegenerate}
                size="sm"
                variant="outline"
              >
                {regenerate.isPending ? (
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 size-3.5" />
                )}
                Generate from PDF
              </Button>
            </div>
          ) : (
            <Textarea
              aria-label="LaTeX resume source code"
              className="mb-3 flex-1 resize-none font-mono text-sm"
              onChange={(e) => {
                setLatexContent(e.target.value);
                setLatexDirty(true);
              }}
              placeholder="Paste your LaTeX resume source here…"
              value={latexContent}
            />
          )}

          <div className="mt-3 flex items-center justify-between">
            <span className="text-muted-foreground text-xs">
              {latexStatusLabel}
            </span>
            <div className="flex items-center gap-2">
              {!pendingGeneration && resumeUrl && (
                <Button
                  disabled={regenerate.isPending}
                  onClick={handleRegenerate}
                  size="sm"
                  variant="ghost"
                >
                  {regenerate.isPending ? (
                    <Loader2 className="mr-2 size-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 size-3.5" />
                  )}
                  Regenerate
                </Button>
              )}
              <Button
                disabled={saveLatex.isPending || !latexDirty || outOfSync}
                onClick={handleSaveLatex}
                size="sm"
              >
                {saveLatex.isPending ? (
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
        </Card>
      </div>
    </div>
  );
}
