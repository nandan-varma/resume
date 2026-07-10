import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getQueryClient } from "@/app/get-query-client";
import { JobAnalyzer } from "@/components/job-analyzer";
import { jobsQueryKey } from "@/lib/queries/jobs";
import { personalInfoQueryKey } from "@/lib/queries/resume";
import { getJobs } from "@/server/jobs";
import { getPersonalInformation } from "@/server/resume";

export const metadata: Metadata = {
  title: "Analyze Job",
  description: "Paste a job description and see how your resume matches up.",
};

export default function AnalyzePage() {
  const queryClient = getQueryClient();
  queryClient.prefetchQuery({ queryKey: jobsQueryKey, queryFn: getJobs });
  queryClient.prefetchQuery({
    queryKey: personalInfoQueryKey,
    queryFn: getPersonalInformation,
  });

  return (
    <main className="min-h-screen" id="main-content">
      <div className="border-border/40 border-b px-4 py-5 md:px-6 md:py-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-bold text-3xl text-foreground tracking-tight">
            Analyze Job
          </h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            Paste a job description to see how your resume matches up
          </p>
        </div>
      </div>
      <div className="px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto max-w-6xl">
          <HydrationBoundary state={dehydrate(queryClient)}>
            <Suspense>
              <JobAnalyzer />
            </Suspense>
          </HydrationBoundary>
        </div>
      </div>
    </main>
  );
}
