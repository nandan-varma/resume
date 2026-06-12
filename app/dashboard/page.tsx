import { getCurrentUser, getJobs } from "@/server/users";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Briefcase, BarChart3, Target, CheckCircle2 } from "lucide-react";
import type { JobStatus } from "@/db/schema";

export default async function Dashboard() {
  const userData = await getCurrentUser();
  const jobs = await getJobs();

  const interviewCount = jobs.filter((j) => j.status === "interview").length;
  const offerCount = jobs.filter((j) => j.status === "offer").length;
  const acceptedCount = jobs.filter((j) => j.status === "accepted").length;

  const stats = [
    {
      label: "Applications",
      value: jobs.length,
      icon: Briefcase,
      color: "text-primary",
    },
    {
      label: "Interviews",
      value: interviewCount,
      icon: BarChart3,
      color: "text-blue-500",
    },
    {
      label: "Offers",
      value: offerCount,
      icon: Target,
      color: "text-green-500",
    },
    {
      label: "Accepted",
      value: acceptedCount,
      icon: CheckCircle2,
      color: "text-emerald-500",
    },
  ];

  const statusBadgeColors: Record<JobStatus, string> = {
    submitted: "bg-primary/10 text-primary",
    "waiting for response": "bg-yellow-500/10 text-yellow-600",
    rejected: "bg-destructive/10 text-destructive",
    interview: "bg-blue-500/10 text-blue-600",
    offer: "bg-green-500/10 text-green-600",
    accepted: "bg-emerald-500/10 text-emerald-600",
    withdrawn: "bg-muted text-muted-foreground",
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {userData.currentUser.name}
            </h1>
            <p className="mt-1 text-muted-foreground">
              Here's your job search at a glance
            </p>
          </div>

          <Link href="/jobs">
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 cursor-pointer group">
              {stats.map(({ label, value, icon: Icon, color }) => (
                <Card
                  key={label}
                  className="p-5 transition-shadow group-hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className="text-3xl font-bold text-foreground mt-0.5">
                        {value}
                      </p>
                    </div>
                    <Icon className={`size-7 ${color}`} />
                  </div>
                </Card>
              ))}
            </div>
          </Link>

          {jobs.length === 0 ? (
            <Card className="p-10 text-center">
              <Briefcase className="mx-auto mb-3 size-10 text-muted-foreground/40" />
              <h3 className="mb-1 font-semibold text-foreground">
                No applications yet
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start by analyzing a job or adding one to track.
              </p>
              <div className="flex justify-center gap-3">
                <Link
                  href="/analyze"
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Analyze a Job
                </Link>
                <Link
                  href="/jobs"
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Add Application
                </Link>
              </div>
            </Card>
          ) : (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  Recent Applications
                </h2>
                <Link
                  href="/jobs"
                  className="text-sm text-primary hover:underline"
                >
                  View all →
                </Link>
              </div>
              <Card>
                <div className="divide-y divide-border">
                  {jobs.slice(0, 6).map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between px-5 py-3"
                    >
                      <p className="font-medium text-foreground text-sm">
                        {job.jobTitle}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadgeColors[job.status as JobStatus] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {job.status}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
  );
}
