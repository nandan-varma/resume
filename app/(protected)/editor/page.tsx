import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getQueryClient } from "@/app/get-query-client";
import { LatexEditor } from "@/components/latex-editor";
import { EditorSkeleton } from "@/components/latex-editor/editor-skeleton";
import {
  personalInfoQueryKey,
  resumeDocumentQueryKey,
} from "@/lib/queries/resume";
import { getAnalysisByJobId } from "@/server/analysis";
import { getJobById } from "@/server/jobs";
import { getPersonalInformation } from "@/server/resume";
import { getResumeDocument } from "@/server/resume-editor";

export const metadata: Metadata = {
  title: "LaTeX Editor",
};

export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  const { jobId: jobIdStr } = await searchParams;
  const jobId = jobIdStr ? Number(jobIdStr) : null;

  const queryClient = getQueryClient();

  const [personalInfo, job, globalDoc, jobDoc] = await Promise.all([
    getPersonalInformation(),
    jobId ? getJobById(jobId) : Promise.resolve(null),
    getResumeDocument(null),
    jobId ? getResumeDocument(jobId) : Promise.resolve(null),
    jobId ? getAnalysisByJobId(jobId) : Promise.resolve(null),
  ]);

  queryClient.setQueryData(personalInfoQueryKey, personalInfo);
  queryClient.setQueryData(resumeDocumentQueryKey(null), globalDoc);
  if (jobId) {
    queryClient.setQueryData(resumeDocumentQueryKey(jobId), jobDoc);
  }

  const isNewJobResume =
    !!job && !jobDoc?.resumeLatex && (jobDoc?.messages.length ?? 0) === 0;

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<EditorSkeleton />}>
        <LatexEditor
          isNewJobResume={isNewJobResume}
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
    </HydrationBoundary>
  );
}
