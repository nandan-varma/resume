import { JobsList } from "@/components/jobs-list";
import { Navigation } from "@/components/navigation";
import { getJobs } from "@/server/jobs";
import { getCurrentUser } from "@/server/users";

export default async function JobsPage() {
  const [, jobs] = await Promise.all([
    getCurrentUser(), // redirects to /login if unauthenticated
    getJobs(),
  ]);

  return (
    <>
      <Navigation activeTab="jobs" />
      <JobsList initialJobs={jobs} />
    </>
  );
}
