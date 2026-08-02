"use client";

import { AlertTriangle, FileText, Loader2 } from "lucide-react";
import { ResumeUploadZone } from "@/components/resume-upload-zone";
import { Card } from "@/components/ui/card";

interface ResumeOnboardingProps {
  hasResume: boolean;
  onRegenerate: () => void;
  onSkip: () => void;
  pending: boolean;
  regenerating: boolean;
  timedOut: boolean;
}

export function ResumeOnboarding({
  hasResume,
  onRegenerate,
  onSkip,
  pending,
  regenerating,
  timedOut,
}: ResumeOnboardingProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="max-w-md p-8 text-center">
        <FileText className="mx-auto mb-3 size-8 text-muted-foreground" />
        <h2 className="mb-1 font-semibold text-foreground text-lg">
          Start from your resume
        </h2>
        <p className="mb-5 text-muted-foreground text-sm">
          Upload a PDF and AI converts it to editable LaTeX — or skip and write
          from scratch.
        </p>

        {pending && (
          <div className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-xs">
            {timedOut ? (
              <>
                <AlertTriangle className="size-3.5 shrink-0 text-warning" />
                <span className="text-muted-foreground">
                  Generation is taking a while.
                </span>
                <button
                  className="shrink-0 font-medium text-foreground underline underline-offset-3 hover:no-underline disabled:opacity-50"
                  disabled={regenerating}
                  onClick={onRegenerate}
                  type="button"
                >
                  {regenerating ? "Retrying…" : "Retry"}
                </button>
              </>
            ) : (
              <>
                <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">
                  Generating LaTeX from your uploaded PDF…
                </span>
              </>
            )}
          </div>
        )}

        <ResumeUploadZone
          className="h-36"
          label={hasResume ? "Upload a different resume" : "Upload your resume"}
        />

        <button
          className="mt-5 text-muted-foreground text-xs underline underline-offset-3 hover:text-foreground"
          onClick={onSkip}
          type="button"
        >
          Start writing from scratch
        </button>
      </Card>
    </div>
  );
}
