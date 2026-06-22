import { Suspense } from "react";
import { JobAnalyzer } from "@/components/job-analyzer";
import { Skeleton } from "@/components/ui/skeleton";
import { getJobs } from "@/server/jobs";
import { getPersonalInformation } from "@/server/resume";

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
    <div className="space-y-4">
      <Skeleton className="h-[52px] w-full" />
      <Skeleton className="h-[160px] w-full" />
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <main className="min-h-screen p-6 md:p-10" id="main-content">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 animate-enter-up">
          <h1 className="font-bold text-3xl text-foreground">Analyze Match</h1>
          <p className="mt-1 text-muted-foreground">
            See how well your resume fits a job posting
          </p>
        </div>
        <Suspense fallback={<AnalyzeContentSkeleton />}>
          <AnalyzeContent />
        </Suspense>
      </div>
    </main>
  );
}
