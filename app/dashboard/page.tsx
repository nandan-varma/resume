import { getCurrentUser, getJobs } from "@/server/users";
import Link from "next/link";
import { Briefcase, BarChart3, Target, CheckCircle2 } from "lucide-react";
import type { JobStatus } from "@/db/schema";
import { STATUS_COLORS } from "@/lib/status";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SpotlightCard } from "@/components/spotlight-card";
import { CountUp } from "@/components/count-up";

export default async function Dashboard() {
  const userData = await getCurrentUser();
  const jobs = await getJobs();

  const interviewCount = jobs.filter((j) => j.status === "interview").length;
  const offerCount     = jobs.filter((j) => j.status === "offer").length;
  const acceptedCount  = jobs.filter((j) => j.status === "accepted").length;

  const stats = [
    { label: "Applications", value: jobs.length,    icon: Briefcase,    color: "text-primary" },
    { label: "Interviews",   value: interviewCount, icon: BarChart3,    color: "text-info" },
    { label: "Offers",       value: offerCount,      icon: Target,       color: "text-success" },
    { label: "Accepted",     value: acceptedCount,  icon: CheckCircle2, color: "text-success" },
  ];

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-5xl">

        {/* Welcome */}
        <div className="mb-8 animate-enter-up">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {userData.currentUser.name}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Here's your job search at a glance
          </p>
        </div>

        {/* Stat cards */}
        <Link href="/jobs">
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map(({ label, value, icon: Icon, color }, i) => (
              <SpotlightCard
                key={label}
                className="p-5 transition-all duration-200 hover:-translate-y-0.5 animate-enter-up"
                style={{ animationDelay: `${60 + i * 60}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                    <p className="text-3xl font-bold text-foreground mt-1 tabular-nums">
                      <CountUp to={value} duration={900} />
                    </p>
                  </div>
                  <Icon className={`size-6 ${color} opacity-80`} />
                </div>
              </SpotlightCard>
            ))}
          </div>
        </Link>

        {/* Applications list */}
        {jobs.length === 0 ? (
          <Card className="p-10 text-center animate-enter-up [animation-delay:320ms]">
            <Briefcase className="mx-auto mb-3 size-10 text-muted-foreground/30" />
            <h3 className="mb-1 font-semibold text-foreground">No applications yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start by analyzing a job or adding one to track.
            </p>
            <div className="flex justify-center gap-3">
              <Button asChild size="sm">
                <Link href="/analyze">Analyze a Job</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/jobs">Add Application</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="animate-enter-up [animation-delay:300ms]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground uppercase tracking-wide">
                Recent Applications
              </h2>
              <Link
                href="/jobs"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View all →
              </Link>
            </div>
            <Card>
              <div className="divide-y divide-border">
                {jobs.slice(0, 6).map((job, i) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted/30 animate-enter"
                    style={{ animationDelay: `${320 + i * 35}ms` }}
                  >
                    <p className="font-medium text-foreground text-sm">{job.jobTitle}</p>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium capitalize ${
                        STATUS_COLORS[job.status as JobStatus] ?? "bg-muted text-muted-foreground"
                      }`}
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
