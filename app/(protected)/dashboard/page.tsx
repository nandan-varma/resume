import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import {
  BarChart3,
  Briefcase,
  CheckCircle2,
  Puzzle,
  Target,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { getQueryClient } from "@/app/get-query-client";
import { CountUp } from "@/components/count-up";
import { SpotlightCard } from "@/components/spotlight-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { jobStatus } from "@/db/schema";
import { jobsQueryKey } from "@/lib/queries/jobs";
import { STATUS_CONFIG } from "@/lib/status";
import { getJobs } from "@/server/jobs";
import { getSession } from "@/server/session";

async function UserName() {
  const session = await getSession();
  return session?.user.name ? `, ${session.user.name}` : null;
}

async function DashboardContent() {
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
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }, i) => (
          <Link
            aria-label={`${label}: ${value}. View all applications`}
            href="/jobs"
            key={label}
          >
            <SpotlightCard
              className="animate-enter-up p-5 transition-all duration-200 hover:-translate-y-0.5"
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
          </Link>
        ))}
      </div>

      <SpotlightCard className="mb-6 animate-enter-up p-5 [animation-delay:240ms]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
              <Puzzle className="size-5 text-indigo-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">
                Chrome Extension
              </p>
              <p className="mt-0.5 text-muted-foreground text-xs">
                See your match score on any LinkedIn job — right on the page.
              </p>
            </div>
          </div>
          <Button asChild className="shrink-0" size="sm" variant="outline">
            <Link
              href="https://github.com/nandan-varma/resume/tree/main/extension"
              target="_blank"
            >
              Install
            </Link>
          </Button>
        </div>
      </SpotlightCard>

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
          <div className="mb-2 flex items-center justify-between">
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
          <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1">
            {jobStatus.map((s) => {
              const Icon = STATUS_CONFIG[s].icon;
              return (
                <span
                  className="inline-flex items-center gap-1 text-muted-foreground text-xs"
                  key={s}
                >
                  <Icon
                    aria-hidden="true"
                    className={`size-3.5 ${STATUS_CONFIG[s].color.split(" ")[1]}`}
                  />
                  <span className="capitalize">{s}</span>
                </span>
              );
            })}
          </div>
          <Card>
            <div className="divide-y divide-border">
              {jobs.slice(0, 6).map((job, i) => (
                <div
                  className="flex animate-enter items-center justify-between px-5 py-3 transition-colors hover:bg-muted/30"
                  key={job.id}
                  style={{ animationDelay: `${320 + i * 35}ms` }}
                >
                  <p className="min-w-0 flex-1 truncate font-medium text-foreground text-sm">
                    {job.jobTitle}
                  </p>
                  {(() => {
                    const Icon = STATUS_CONFIG[job.status].icon;
                    return (
                      <span
                        className={`ml-3 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 ${STATUS_CONFIG[job.status].color}`}
                        title={job.status}
                      >
                        <Icon aria-hidden="true" className="size-3.5" />
                        <span className="sr-only capitalize">{job.status}</span>
                      </span>
                    );
                  })()}
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
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
  const queryClient = getQueryClient();
  queryClient.prefetchQuery({ queryKey: jobsQueryKey, queryFn: getJobs });

  return (
    <main className="min-h-screen" id="main-content">
      <div className="animate-enter-up border-border/40 border-b px-4 py-5 md:px-6 md:py-6">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-bold text-3xl text-foreground tracking-tight">
            Welcome back
            <Suspense fallback={null}>
              <UserName />
            </Suspense>
          </h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            Here's your job search at a glance
          </p>
        </div>
      </div>
      <div className="px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto max-w-5xl">
          <HydrationBoundary state={dehydrate(queryClient)}>
            <Suspense fallback={<DashboardSkeleton />}>
              <DashboardContent />
            </Suspense>
          </HydrationBoundary>
        </div>
      </div>
    </main>
  );
}
