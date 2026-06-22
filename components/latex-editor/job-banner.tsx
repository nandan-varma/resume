"use client";

import { Briefcase } from "lucide-react";
import type { EditorJob } from "./types";

interface JobBannerProps {
  job: EditorJob | null;
}

export function JobBanner({ job }: JobBannerProps) {
  if (!job) {
    return null;
  }

  return (
    <div className="flex shrink-0 items-center gap-2 border-primary/20 border-b bg-primary/5 px-4 py-1.5">
      <Briefcase className="size-3 shrink-0 text-primary" />
      <span className="text-primary text-xs">
        Editing customized resume for <strong>{job.title}</strong>
      </span>
      <span className="ml-auto text-muted-foreground text-xs">
        Saves separately · won't affect your default resume
      </span>
    </div>
  );
}
