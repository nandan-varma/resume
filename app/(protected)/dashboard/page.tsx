import { BarChart3, Briefcase, CheckCircle2, Target } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { CountUp } from "@/components/count-up";
import { SpotlightCard } from "@/components/spotlight-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_CONFIG } from "@/lib/status";
import { getJobs } from "@/server/jobs";
import { getSession } from "@/server/session";

async function DashboardContent() {
  const [session, jobs] = await Promise.all([getSession(), getJobs()]);

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
      color: "text-info",
    },
    { label: "Offers", value: offerCount, icon: Target, color: "text-success" },
    {
      label: "Accepted",
      value: acceptedCount,
      icon: CheckCircle2,
      color: "text-success",
    },
  ];

  return (
    <>
      <div className="mb-8 animate-enter-up">
        <h1 className="font-bold text-3xl text-foreground">
          Welcome back, {session?.user.name}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here's your job search at a glance
        </p>
      </div>

      <Link aria-label="View all applications" href="/jobs">
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, color }, i) => (
            <SpotlightCard
              className="animate-enter-up p-5 transition-all duration-200 hover:-translate-y-0.5"
              key={label}
              style={{ animationDelay: `${60 + i * 60}ms` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">
                    {label}
                  </p>
                  <p className="mt-1 font-bold text-3xl text-foreground tabular-nums">
                    <CountUp duration={900} to={value} />
                  </p>
                </div>
                <Icon className={`size-6 ${color} opacity-80`} />
              </div>
            </SpotlightCard>
          ))}
        </div>
      </Link>

      {jobs.length === 0 ? (
        <Card className="animate-enter-up p-10 text-center [animation-delay:320ms]">
          <Briefcase className="mx-auto mb-3 size-10 text-muted-foreground/30" />
          <h3 className="mb-1 font-semibold text-foreground">
            No applications yet
          </h3>
          <p className="mb-4 text-muted-foreground text-sm">
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
            <h2 className="font-medium text-foreground text-sm uppercase tracking-wide">
              Recent Applications
            </h2>
            <Link
              className="text-muted-foreground text-xs transition-colors hover:text-foreground"
              href="/jobs"
            >
              View all →
            </Link>
          </div>
          <Card>
            <div className="divide-y divide-border">
              {jobs.slice(0, 6).map((job, i) => (
                <div
                  className="flex animate-enter items-center justify-between px-5 py-3 transition-colors hover:bg-muted/30"
                  key={job.id}
                  style={{ animationDelay: `${320 + i * 35}ms` }}
                >
                  <p className="font-medium text-foreground text-sm">
                    {job.jobTitle}
                  </p>
                  <span
                    className={`px-2 py-0.5 font-medium text-xs capitalize ${
                      STATUS_CONFIG[job.status].color
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
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="mb-8">
        <Skeleton className="mb-2 h-9 w-56" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["a", "b", "c", "d"].map((id) => (
          <Skeleton className="h-[90px]" key={id} />
        ))}
      </div>
      <Skeleton className="mb-4 h-5 w-44" />
      <Skeleton className="h-[180px]" />
    </>
  );
}

export default function Dashboard() {
  return (
    <main className="min-h-screen p-6 md:p-10" id="main-content">
      <div className="mx-auto max-w-5xl">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent />
        </Suspense>
      </div>
    </main>
  );
}
