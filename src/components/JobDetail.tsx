import { ArrowRight, Check, ExternalLink, Hand, Minus } from "lucide-react";
import { cn } from "@/lib/cn";
import type { JobDetail as Data } from "@/lib/job-detail";
import TailorButton from "./TailorButton";
import CompanyAvatar from "./ui/CompanyAvatar";
import { buttonVariants } from "./ui/variants";

const modeTag = {
  remote: "tag-green",
  hybrid: "tag-blue",
  onsite: "tag-gray",
} as const;

/** One job: what it is, how you line up, and the one thing to do next. */
export default function JobDetail({
  data,
  heading = "h1",
}: {
  data: Data;
  heading?: "h1" | "h2";
}) {
  const { job, state, resumeId, skills } = data;
  const H = heading;
  const here = encodeURIComponent(`/jobs/${job.id}`);
  const facts = [
    job.location,
    job.pay,
    job.employmentType,
    job.department,
    job.postedAt && `Posted ${job.postedAt}`,
  ].filter(Boolean);

  return (
    <article className="[animation:rise_0.3s_backwards]">
      <div className="flex items-start gap-3">
        <CompanyAvatar name={job.company} className="mt-1 size-11 text-base" />
        <div className="min-w-0">
          <H className="page-title">{job.title}</H>
          <p className="mt-1 text-base text-muted-foreground">{job.company}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-muted-foreground">
        {job.workMode && (
          <span className={cn("tag capitalize", modeTag[job.workMode])}>
            {job.workMode}
          </span>
        )}
        {facts.map((f, i) => (
          <span key={String(f)} className="flex items-center gap-2">
            {(i > 0 || job.workMode) && <span aria-hidden="true">·</span>}
            {f}
          </span>
        ))}
      </div>

      <div className="mt-5 grid max-w-md gap-2">
        {state === "signed-out" && (
          <a
            href={`/login?next=${here}`}
            className={cn(buttonVariants({ size: "lg" }), "w-full")}
          >
            Sign in to make a resume
          </a>
        )}
        {state === "needs-profile" && (
          <div className="grid gap-2 rounded-lg bg-[var(--callout-yellow)] p-3 text-[var(--tag-yellow-fg)]">
            <p className="flex items-start gap-2">
              <Hand className="mt-0.5 size-4 shrink-0" /> First, add your
              details. It takes about a minute.
            </p>
            <a
              href="/profile"
              className={cn(buttonVariants({ size: "lg" }), "w-full")}
            >
              Set up my profile <ArrowRight />
            </a>
          </div>
        )}
        {state === "ready" && resumeId && (
          <>
            <a
              href={`/resumes/${resumeId}`}
              className={cn(buttonVariants({ size: "lg" }), "w-full")}
            >
              Open my resume <ArrowRight />
            </a>
            <TailorButton
              talloId={job.id}
              variant="outline"
              label="Write a fresh version"
              confirm
            />
          </>
        )}
        {state === "ready" && !resumeId && <TailorButton talloId={job.id} />}
        {job.applyUrl && (
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline" }), "w-full")}
          >
            Apply on company site <ExternalLink />
          </a>
        )}
      </div>

      {skills && skills.total > 0 && (
        <section
          className="mt-6 max-w-2xl rounded-lg border bg-card p-4"
          aria-label="How you line up"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-semibold">How you line up</h3>
            <span className="text-muted-foreground">
              {skills.covered} of {skills.total} tools it names
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full origin-left rounded-full bg-[var(--tag-green-fg)] [animation:write_0.8s_cubic-bezier(0.2,0.7,0.2,1)_both]"
              style={{
                width: `${(skills.covered / skills.total) * 100}%`,
                opacity: 0.75,
              }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skills.have.map((s) => (
              <span key={s} className="tag tag-green gap-1">
                <Check className="size-3" strokeWidth={3} />
                {s}
              </span>
            ))}
            {skills.missing.map((s) => (
              <span key={s} className="tag tag-yellow gap-1">
                <Minus className="size-3" strokeWidth={3} />
                {s}
              </span>
            ))}
          </div>
          {skills.missing.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Yellow tools are named in the posting but not on your profile. If
              you have used them, add them and your resume will say so.
            </p>
          )}
        </section>
      )}
      {state === "signed-out" && (
        <p className="mt-6 max-w-2xl text-muted-foreground">
          Sign in to see how your skills line up with this job.
        </p>
      )}

      <h3 className="block-heading">About the job</h3>
      <div className="max-w-3xl text-[0.9375rem] leading-7 whitespace-pre-wrap">
        {job.description}
      </div>
    </article>
  );
}

export function JobDetailSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading the job"
      className="grid gap-3"
    >
      <div className="skeleton h-8 w-3/4" />
      <div className="skeleton h-5 w-1/3" />
      <div className="skeleton mt-3 h-10 w-full max-w-md" />
      <div className="skeleton mt-4 h-24 w-full max-w-2xl" />
      <div className="skeleton h-4 w-full max-w-3xl" />
      <div className="skeleton h-4 w-11/12 max-w-3xl" />
      <div className="skeleton h-4 w-4/5 max-w-3xl" />
    </div>
  );
}
