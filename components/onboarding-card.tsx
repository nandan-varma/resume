"use client";

import { ResumeUploadZone } from "@/components/resume-upload-zone";
import { Card } from "@/components/ui/card";

interface OnboardingCardProps {
  onSkip: () => void;
}

export function OnboardingCard({ onSkip }: OnboardingCardProps) {
  return (
    <Card className="mx-auto max-w-lg animate-enter-up p-8 text-center">
      <h2 className="mb-1 font-semibold text-foreground text-xl">
        Welcome to JobMatch
      </h2>
      <p className="mb-6 text-muted-foreground text-sm">
        Upload your resume to get AI match scores against job descriptions,
        keyword gap analysis, and an AI-assisted resume editor.
      </p>
      <ResumeUploadZone className="h-44" label="Upload your resume" />
      <button
        className="mt-5 text-muted-foreground text-xs underline underline-offset-3 hover:text-foreground"
        onClick={onSkip}
        type="button"
      >
        Skip for now
      </button>
    </Card>
  );
}
