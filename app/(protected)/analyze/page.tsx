import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getQueryClient } from "@/app/get-query-client";
import { JobAnalyzer } from "@/components/job-analyzer";
import { Skeleton } from "@/components/ui/skeleton";
import { jobsQueryKey } from "@/lib/queries/jobs";
import { personalInfoQueryKey } from "@/lib/queries/resume";
import { getJobs } from "@/server/jobs";
import { getPersonalInformation } from "@/server/resume";

export const metadata: Metadata = {
  title: "Analyze Match",
  description: "See how well your resume fits a job posting.",
};

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
  const queryClient = getQueryClient();
  queryClient.prefetchQuery({ queryKey: jobsQueryKey, queryFn: getJobs });
  queryClient.prefetchQuery({
    queryKey: personalInfoQueryKey,
    queryFn: getPersonalInformation,
  });

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
          <HydrationBoundary state={dehydrate(queryClient)}>
            <Suspense fallback={<AnalyzeContentSkeleton />}>
              <JobAnalyzer />
            </Suspense>
          </HydrationBoundary>
        </div>
      </div>
    </main>
  );
}
