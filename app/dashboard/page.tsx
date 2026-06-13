import { getCurrentUser, getJobs } from "@/server/users";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Briefcase, BarChart3, Target, CheckCircle2 } from "lucide-react";
import type { JobStatus } from "@/db/schema";
import { STATUS_COLORS } from "@/lib/status";

export default async function Dashboard() {
  const userData = await getCurrentUser();
  const jobs = await getJobs();

  const interviewCount = jobs.filter((j) => j.status === "interview").length;
  const offerCount = jobs.filter((j) => j.status === "offer").length;
  const acceptedCount = jobs.filter((j) => j.status === "accepted").length;

  const stats = [
    { label: "Applications", value: jobs.length,      icon: Briefcase,    color: "text-primary" },
    { label: "Interviews",   value: interviewCount,   icon: BarChart3,    color: "text-info" },
    { label: "Offers",       value: offerCount,        icon: Target,       color: "text-success" },
    { label: "Accepted",     value: acceptedCount,    icon: CheckCircle2, color: "text-success" },
  ];

  const statusBadgeColors = STATUS_COLORS;

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 animate-enter-up">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {userData.currentUser.name}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Here's your job search at a glance
          </p>
        </div>

        <Link href="/jobs">
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 cursor-pointer group">
            {stats.map(({ label, value, icon: Icon, color }, i) => (
              <Card
                key={label}
                className="p-5 transition-colors group-hover:bg-muted/40 animate-enter-up"
                style={{ animationDelay: `${60 + i * 60}ms` }}
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
          <Card className="p-10 text-center animate-enter-up [animation-delay:320ms]">
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
                className="bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/85 transition-colors"
              >
                Analyze a Job
              </Link>
              <Link
                href="/jobs"
                className="border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Add Application
              </Link>
            </div>
          </Card>
        ) : (
          <div className="animate-enter-up [animation-delay:300ms]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Recent Applications
              </h2>
              <Link
                href="/jobs"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View all →
              </Link>
            </div>
            <Card>
              <div className="divide-y divide-border">
                {jobs.slice(0, 6).map((job, i) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between px-5 py-3 animate-enter"
                    style={{ animationDelay: `${320 + i * 40}ms` }}
                  >
                    <p className="font-medium text-foreground text-sm">
                      {job.jobTitle}
                    </p>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium capitalize ${statusBadgeColors[job.status as JobStatus] ?? "bg-muted text-muted-foreground"}`}
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
