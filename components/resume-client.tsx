"use client";

import { ExternalLink, FileText, Loader2, Pencil, Save } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ResumeUploadZone } from "@/components/resume-upload-zone";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ErrorBoundary } from "@/lib/error-boundary";
import { saveResumeLatex } from "@/server/resume";

interface ResumeClientProps {
  initialLatex: string | null;
  initialResumeUrl: string | null;
}

export function ResumeClient(props: ResumeClientProps) {
  return (
    <ErrorBoundary>
      <ResumeClientInner {...props} />
    </ErrorBoundary>
  );
}

function ResumeClientInner({
  initialResumeUrl,
  initialLatex,
}: ResumeClientProps) {
  const [resumeUrl, setResumeUrl] = useState(initialResumeUrl);
  const [latexContent, setLatexContent] = useState(initialLatex ?? "");
  const [savingLatex, setSavingLatex] = useState(false);
  const [latexDirty, setLatexDirty] = useState(false);

  const uploadLabel = resumeUrl ? "Replace resume" : "Upload your resume";
  let latexStatusLabel = "";
  if (latexDirty) {
    latexStatusLabel = "Unsaved changes";
  } else if (latexContent) {
    latexStatusLabel = "Saved";
  }

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
            onUploaded={setResumeUrl}
          />
        </Card>

        <Card className="flex animate-enter-up flex-col p-6 [animation-delay:150ms]">
          <div className="mb-4">
            <h2 className="font-semibold text-base text-foreground">
              LaTeX Source
            </h2>
            <p className="mt-0.5 text-muted-foreground text-xs">
              Store your resume source for version control
            </p>
          </div>
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
        </Card>
      </div>
    </div>
  );
}
