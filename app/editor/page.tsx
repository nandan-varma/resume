import type { Metadata } from "next";
import { LatexEditor } from "@/components/latex-editor";
import { getJobById } from "@/server/jobs";
import { getJobResume, getPersonalInformation } from "@/server/resume";
import { getCurrentUser } from "@/server/users";

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

  const [, personalInfo, job, jobResume] = await Promise.all([
    getCurrentUser(), // redirects to /login if unauthenticated
    getPersonalInformation(),
    jobId ? getJobById(jobId) : Promise.resolve(null),
    jobId ? getJobResume(jobId) : Promise.resolve(null),
  ]);

  // Job resume falls back to default resume latex on first visit
  const initialLatex =
    jobResume?.resumeLatex || personalInfo?.resumeLatex || "";

  return (
    <LatexEditor
      initialLatex={initialLatex}
      initialResumeUrl={personalInfo?.resumeUrl ?? null}
      isNewJobResume={!!job && !jobResume}
      job={
        job
          ? { id: job.id, title: job.jobTitle, description: job.jobDescription }
          : null
      }
    />
  );
}
