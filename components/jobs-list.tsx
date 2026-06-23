"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  BarChart3,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  Target,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AnalyzeDialog } from "@/components/analyze-dialog";
import { CountUp } from "@/components/count-up";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { JobStatus } from "@/db/schema";
import { jobStatus } from "@/db/schema";
import { ErrorBoundary } from "@/lib/error-boundary";
import {
  useCreateJob,
  useDeleteJob,
  useJobs,
  useUpdateJobStatus,
} from "@/lib/queries/jobs";
import { STATUS_CONFIG } from "@/lib/status";

const addJobSchema = z.object({
  jobTitle: z.string().min(1, "Required"),
  jobDescription: z.string().min(1, "Required"),
  link: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
});

type AddJobValues = z.infer<typeof addJobSchema>;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function AddJobDialog() {
  const [open, setOpen] = useState(false);
  const createJob = useCreateJob();
  const form = useForm<AddJobValues>({
    resolver: zodResolver(addJobSchema),
    defaultValues: { jobTitle: "", jobDescription: "", link: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    createJob.mutate(
      {
        title: values.jobTitle,
        description: values.jobDescription,
        link: values.link || undefined,
      },
      {
        onSuccess: () => {
          form.reset();
          setOpen(false);
        },
      }
    );
  });

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 size-4" />
          Add Job
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Application</DialogTitle>
        </DialogHeader>
        <form className="space-y-4 pt-1" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="jobTitle">Job Title *</Label>
            <Input
              className="mt-1"
              id="jobTitle"
              placeholder="Senior React Developer at Acme Corp"
              {...form.register("jobTitle")}
            />
            {form.formState.errors.jobTitle && (
              <p className="mt-1 text-destructive text-xs">
                {form.formState.errors.jobTitle.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="jobDescription">Job Description *</Label>
            <Textarea
              className="mt-1"
              id="jobDescription"
              placeholder="Paste the job description here…"
              rows={6}
              {...form.register("jobDescription")}
            />
            {form.formState.errors.jobDescription && (
              <p className="mt-1 text-destructive text-xs">
                {form.formState.errors.jobDescription.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="link">Job Posting URL (optional)</Label>
            <Input
              className="mt-1"
              id="link"
              placeholder="https://…"
              type="url"
              {...form.register("link")}
            />
            {form.formState.errors.link && (
              <p className="mt-1 text-destructive text-xs">
                {form.formState.errors.link.message}
              </p>
            )}
          </div>
          <Button
            className="w-full"
            disabled={createJob.isPending}
            type="submit"
          >
            {createJob.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Adding…
              </>
            ) : (
              "Add Application"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function JobsList() {
  return (
    <ErrorBoundary>
      <WrappedJobsList />
    </ErrorBoundary>
  );
}

function WrappedJobsList() {
  const { data: jobs } = useJobs();
  const deleteJob = useDeleteJob();
  const updateStatus = useUpdateJobStatus();
  const [filterStatus, setFilterStatus] = useState<JobStatus | null>(null);

  const statusCounts = Object.fromEntries(
    jobStatus.map((s) => [s, jobs.filter((j) => j.status === s).length])
  ) as Record<JobStatus, number>;

  const displayed = filterStatus
    ? jobs.filter((j) => j.status === filterStatus)
    : jobs;

  const stats = [
    { label: "Applications", value: jobs.length, Icon: Briefcase, color: "text-primary" },
    { label: "Interviews", value: statusCounts.interview ?? 0, Icon: BarChart3, color: "text-info" },
    { label: "Offers", value: statusCounts.offer ?? 0, Icon: Target, color: "text-success" },
    { label: "Accepted", value: statusCounts.accepted ?? 0, Icon: CheckCircle2, color: "text-success" },
  ] as const;

  return (
    <>
      <div className="mb-6 grid animate-enter-up grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ label, value, Icon, color }) => (
          <Card className="p-4" key={label}>
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">{label}</p>
              <Icon aria-hidden="true" className={`size-4 ${color} opacity-70`} />
            </div>
            <p className="mt-1.5 font-bold text-2xl tabular-nums">
              <CountUp to={value} />
            </p>
          </Card>
        ))}
      </div>

      <div className="mb-5 flex animate-enter-up items-center justify-between gap-4 [animation-delay:60ms]">
        <p className="text-muted-foreground text-sm">
          {jobs.length > 0
            ? `${filterStatus ? `${displayed.length} of ${jobs.length}` : jobs.length} application${jobs.length === 1 ? "" : "s"}`
            : "No applications yet"}
        </p>
        <AddJobDialog />
      </div>

      {jobs.length > 0 && (
        <div className="mb-5 flex animate-enter flex-wrap gap-2 [animation-delay:80ms]">
          {filterStatus && (
            <button
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-muted-foreground text-xs transition-colors hover:border-foreground/30 hover:text-foreground"
              onClick={() => setFilterStatus(null)}
              type="button"
            >
              <X className="size-3" /> All
            </button>
          )}
          {jobStatus
            .filter((s) => statusCounts[s] > 0)
            .map((s) => {
              const Icon = STATUS_CONFIG[s].icon;
              return (
                <button
                  aria-pressed={filterStatus === s}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                    filterStatus === s
                      ? `${STATUS_CONFIG[s].color} border-current/20 font-medium`
                      : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                  key={s}
                  onClick={() => setFilterStatus(filterStatus === s ? null : s)}
                  type="button"
                >
                  <Icon aria-hidden="true" className="size-3.5" />
                  <span>{statusCounts[s]}</span>
                  <span className="capitalize">{s}</span>
                </button>
              );
            })}
        </div>
      )}

      {jobs.length === 0 && (
        <Card className="py-16 text-center">
          <Briefcase className="mx-auto mb-3 size-10 text-muted-foreground/30" />
          <h3 className="mb-1 font-semibold text-foreground">
            No applications yet
          </h3>
          <p className="mb-5 text-muted-foreground text-sm">
            Track your first application or{" "}
            <AnalyzeDialog
              trigger={
                <button
                  className="text-primary underline underline-offset-3 hover:no-underline"
                  type="button"
                >
                  analyze a job
                </button>
              }
            />{" "}
            to get started.
          </p>
        </Card>
      )}
      {jobs.length > 0 && displayed.length === 0 && (
        <Card className="py-12 text-center">
          <p className="text-muted-foreground text-sm">
            No applications with this status.{" "}
            <button
              className="text-primary underline underline-offset-3 hover:no-underline"
              onClick={() => setFilterStatus(null)}
              type="button"
            >
              Clear filter
            </button>
          </p>
        </Card>
      )}
      {displayed.length > 0 && (
        <div className="space-y-3">
          {displayed.map((job, i) => {
            const StatusIcon = STATUS_CONFIG[job.status].icon;
            return (
              <Card
                className="animate-enter-up overflow-hidden"
                key={job.id}
                style={{ animationDelay: `${Math.min(i * 50, 250)}ms` }}
              >
                <div className="p-5">
                  {/* Header row */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${STATUS_CONFIG[job.status].color}`}
                    >
                      <StatusIcon aria-hidden="true" className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="min-w-0 font-semibold text-foreground leading-snug">
                          {job.jobTitle}
                        </h3>
                        <Button
                          aria-label={`Delete ${job.jobTitle}`}
                          className="-mt-1 -mr-1 shrink-0 text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => deleteJob.mutate(job.id)}
                          size="icon"
                          variant="ghost"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-muted-foreground text-xs">
                        <span>{formatDate(job.createdAt)}</span>
                        {job.link && (
                          <>
                            <span aria-hidden="true">·</span>
                            <a
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                              href={job.link}
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                              View posting
                              <ExternalLink className="size-3" />
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="mt-3 line-clamp-2 text-muted-foreground text-sm leading-relaxed">
                    {job.jobDescription}
                  </p>

                  {/* Footer */}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <Select
                      onValueChange={(v) => {
                        const parsed = z.enum(jobStatus).safeParse(v);
                        if (parsed.success) {
                          updateStatus.mutate({
                            jobId: job.id,
                            status: parsed.data,
                          });
                        }
                      }}
                      value={job.status}
                    >
                      <SelectTrigger
                        aria-label={`Change status: ${job.status}`}
                        className={`h-8 max-w-44 gap-1.5 rounded-full border-current/20 px-3 font-medium text-xs ${STATUS_CONFIG[job.status].color}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {jobStatus.map((s) => {
                          const Icon = STATUS_CONFIG[s].icon;
                          return (
                            <SelectItem className="text-xs" key={s} value={s}>
                              <span
                                className={`inline-flex items-center gap-1.5 ${STATUS_CONFIG[s].color}`}
                              >
                                <Icon aria-hidden="true" className="size-3.5" />
                                <span className="capitalize">{s}</span>
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    <Button asChild size="sm">
                      <Link href={`/editor?jobId=${job.id}`}>
                        <FileText className="size-3.5" />
                        Edit resume
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
