import type { Metadata } from "next";
import { JobsList } from "@/components/jobs-list";
import { getJobs } from "@/server/jobs";

export const metadata: Metadata = {
  title: "Applications",
  description: "Track and manage your job applications.",
};

export default async function JobsPage() {
  const jobs = await getJobs();
  return <JobsList initialJobs={jobs} />;
}
