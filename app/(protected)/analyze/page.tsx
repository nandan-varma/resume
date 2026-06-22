import type { Metadata } from "next";
import { Suspense } from "react";
import { JobAnalyzer } from "@/components/job-analyzer";
import { Skeleton } from "@/components/ui/skeleton";
import { getJobs } from "@/server/jobs";
import { getPersonalInformation } from "@/server/resume";

export const metadata: Metadata = {
  title: "Analyze Match",
  description: "See how well your resume fits a job posting.",
};

async function AnalyzeContent() {
  const [jobs, personalInfo] = await Promise.all([
    getJobs(),
    getPersonalInformation(),
  ]);
  return (
    <div className="animate-enter-up [animation-delay:80ms]">
      <JobAnalyzer
        hasResume={!!personalInfo?.resumeUrl}
        initialJobs={jobs.map((j) => ({
          id: j.id,
          jobTitle: j.jobTitle,
        }))}
      />
    </div>
  );
}

function AnalyzeContentSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Skeleton className="h-[52px] w-full" />
      <Skeleton className="h-[160px] w-full" />
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <main className="min-h-screen" id="main-content">
      <div className="animate-enter-up border-border/40 border-b px-4 py-5 md:px-6 md:py-6">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-bold text-3xl text-foreground tracking-tight">
            Analyze Match
          </h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            See how well your resume fits a job posting
          </p>
        </div>
      </div>
      <div className="px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto max-w-5xl">
          <Suspense fallback={<AnalyzeContentSkeleton />}>
            <AnalyzeContent />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
