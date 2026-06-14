import { JobAnalyzer } from "@/components/job-analyzer";
import { Navigation } from "@/components/navigation";
import { getCurrentUser, getJobs, getPersonalInformation } from "@/server/users";

export default async function AnalyzePage() {
  const [, jobs, personalInfo] = await Promise.all([
    getCurrentUser(), // redirects to /login if unauthenticated
    getJobs(),
    getPersonalInformation(),
  ]);

  return (
    <>
      <Navigation activeTab="analyze" />
      <main id="main-content" className="min-h-screen p-6 md:p-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 animate-enter-up">
            <h1 className="text-3xl font-bold text-foreground">Analyze Match</h1>
            <p className="mt-1 text-muted-foreground">
              See how well your resume fits a job posting
            </p>
          </div>
          <div className="animate-enter-up [animation-delay:80ms]">
            <JobAnalyzer
              initialJobs={jobs.map((j) => ({ id: j.id, jobTitle: j.jobTitle }))}
              hasResume={!!personalInfo?.resumeUrl}
            />
          </div>
        </div>
      </main>
    </>
  );
}
