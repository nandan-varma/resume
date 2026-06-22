import type { Metadata } from "next";
import { Suspense } from "react";
import { LatexEditor } from "@/components/latex-editor";
import { getJobById } from "@/server/jobs";
import { getJobResume, getPersonalInformation } from "@/server/resume";
import { getCurrentUser } from "@/server/users";

export const metadata: Metadata = {
  title: "LaTeX Editor",
};

function EditorSkeleton() {
  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex h-12 shrink-0 items-center justify-between border-border border-b px-4">
        <div className="flex items-center gap-4">
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          <div className="h-4 w-px bg-border" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
          <div className="h-8 w-16 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex-1 animate-pulse bg-muted/30" />
        <div className="w-1 bg-border" />
        <div className="flex-1 animate-pulse bg-muted/20" />
      </div>
    </div>
  );
}

export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  const { jobId: jobIdStr } = await searchParams;
  const jobId = jobIdStr ? Number(jobIdStr) : null;

  const [, personalInfo, job, jobResume] = await Promise.all([
    getCurrentUser(),
    getPersonalInformation(),
    jobId ? getJobById(jobId) : Promise.resolve(null),
    jobId ? getJobResume(jobId) : Promise.resolve(null),
  ]);

  const initialLatex =
    jobResume?.resumeLatex || personalInfo?.resumeLatex || "";

  return (
    <Suspense fallback={<EditorSkeleton />}>
      <LatexEditor
        initialLatex={initialLatex}
        isNewJobResume={!!job && !jobResume}
        job={
          job
            ? {
                id: job.id,
                title: job.jobTitle,
                description: job.jobDescription,
              }
            : null
        }
      />
    </Suspense>
  );
}
