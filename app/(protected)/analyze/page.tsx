import { JobAnalyzer } from "@/components/job-analyzer";
import { getJobs } from "@/server/jobs";
import { getPersonalInformation } from "@/server/resume";

export default async function AnalyzePage() {
  const [jobs, personalInfo] = await Promise.all([
    getJobs(),
    getPersonalInformation(),
  ]);

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 animate-enter-up">
          <h1 className="font-bold text-3xl text-foreground">Analyze Match</h1>
          <p className="mt-1 text-muted-foreground">
            See how well your resume fits a job posting
          </p>
        </div>
        <div className="animate-enter-up [animation-delay:80ms]">
          <JobAnalyzer
            hasResume={!!personalInfo?.resumeUrl}
            initialJobs={jobs.map((j) => ({
              id: j.id,
              jobTitle: j.jobTitle,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
