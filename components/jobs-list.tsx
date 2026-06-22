"use client";

import {
  Briefcase,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
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

const JOB_STATUSES = jobStatus;

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

const EMPTY_FORM = { jobTitle: "", jobDescription: "", link: "" };

export function JobsList() {
  return (
    <ErrorBoundary>
      <WrappedJobsList />
    </ErrorBoundary>
  );
}

function WrappedJobsList() {
  const { data: jobs } = useJobs();
  const createJobMutation = useCreateJob();
  const deleteJobMutation = useDeleteJob();
  const updateStatusMutation = useUpdateJobStatus();

  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [filterStatus, setFilterStatus] = useState<JobStatus | null>(null);

  const handleSubmit = () => {
    if (!(formData.jobTitle.trim() && formData.jobDescription.trim())) {
      return;
    }
    createJobMutation.mutate(
      {
        title: formData.jobTitle.trim(),
        description: formData.jobDescription.trim(),
        link: formData.link.trim() || undefined,
      },
      {
        onSuccess: () => {
          setFormData(EMPTY_FORM);
          setOpen(false);
        },
      }
    );
  };

  const statusCounts = Object.fromEntries(
    JOB_STATUSES.map((s) => [s, jobs.filter((j) => j.status === s).length])
  ) as Record<JobStatus, number>;

  const displayedJobs = filterStatus
    ? jobs.filter((j) => j.status === filterStatus)
    : jobs;

  return (
    <>
      <div className="mb-5 flex animate-enter-up items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          {jobs.length > 0
            ? `${filterStatus ? `${displayedJobs.length} of ${jobs.length}` : jobs.length} application${jobs.length === 1 ? "" : "s"}`
            : "No applications yet"}
        </p>
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
            <div className="space-y-4 pt-1">
              <div>
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  className="mt-1"
                  id="title"
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, jobTitle: e.target.value }))
                  }
                  placeholder="Senior React Developer at Acme Corp"
                  value={formData.jobTitle}
                />
              </div>
              <div>
                <Label htmlFor="description">Job Description *</Label>
                <Textarea
                  className="mt-1"
                  id="description"
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      jobDescription: e.target.value,
                    }))
                  }
                  placeholder="Paste the job description here…"
                  rows={6}
                  value={formData.jobDescription}
                />
              </div>
              <div>
                <Label htmlFor="link">Job Posting URL (optional)</Label>
                <Input
                  className="mt-1"
                  id="link"
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, link: e.target.value }))
                  }
                  placeholder="https://…"
                  type="url"
                  value={formData.link}
                />
              </div>
              <Button
                className="w-full"
                disabled={
                  createJobMutation.isPending ||
                  !formData.jobTitle.trim() ||
                  !formData.jobDescription.trim()
                }
                onClick={handleSubmit}
              >
                {createJobMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Adding…
                  </>
                ) : (
                  "Add Application"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {jobs.length > 0 && (
        <div className="mb-5 flex animate-enter flex-wrap gap-2 [animation-delay:80ms]">
          {filterStatus && (
            <button
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-muted-foreground text-xs transition-colors hover:border-foreground/30 hover:text-foreground"
              onClick={() => setFilterStatus(null)}
              type="button"
            >
              ✕ All
            </button>
          )}
          {JOB_STATUSES.filter((s) => statusCounts[s] > 0).map((s) => (
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
              <span aria-hidden="true">{STATUS_CONFIG[s].icon}</span>
              <span>{statusCounts[s]}</span>
              <span className="capitalize">{s}</span>
            </button>
          ))}
        </div>
      )}

      {jobs.length === 0 ? (
        <Card className="py-16 text-center">
          <Briefcase className="mx-auto mb-3 size-10 text-muted-foreground/30" />
          <h3 className="mb-1 font-semibold text-foreground">
            No applications yet
          </h3>
          <p className="mb-5 text-muted-foreground text-sm">
            Track your first application or{" "}
            <a
              className="text-primary underline underline-offset-3 hover:no-underline"
              href="/analyze"
            >
              analyze a job
            </a>{" "}
            to get started.
          </p>
          <div className="flex justify-center">
            <Button onClick={() => setOpen(true)} size="sm">
              <Plus className="mr-2 size-4" />
              Add Application
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayedJobs.map((job, i) => (
            <Card
              className="animate-enter-up p-5"
              key={job.id}
              style={{ animationDelay: `${Math.min(i * 50, 250)}ms` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold text-foreground">
                      {job.jobTitle}
                    </h3>
                    <Badge
                      className={`${STATUS_CONFIG[job.status].color} border-0 text-xs`}
                    >
                      {STATUS_CONFIG[job.status].icon} {job.status}
                    </Badge>
                  </div>

                  <div className="mt-1 flex items-center gap-3 text-muted-foreground text-xs">
                    <span>Added {formatDate(job.createdAt)}</span>
                    {job.link && (
                      <a
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                        href={job.link}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        View posting <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>

                  <p className="mt-2 line-clamp-2 text-muted-foreground text-sm">
                    {job.jobDescription}
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      Status:
                    </span>
                    <Select
                      onValueChange={(v) => {
                        const parsed = z.enum(jobStatus).safeParse(v);
                        if (parsed.success) {
                          updateStatusMutation.mutate({
                            jobId: job.id,
                            status: parsed.data,
                          });
                        }
                      }}
                      value={job.status}
                    >
                      <SelectTrigger className="h-7 w-44 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {JOB_STATUSES.map((s) => (
                          <SelectItem className="text-xs" key={s} value={s}>
                            {STATUS_CONFIG[s].icon} {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    asChild
                    size="sm"
                    title="Open resume editor for this job"
                    variant="outline"
                  >
                    <Link href={`/editor?jobId=${job.id}`}>
                      <FileText className="size-3.5" />
                      <span className="ml-1.5 hidden sm:inline">
                        Edit resume
                      </span>
                    </Link>
                  </Button>
                  <Button
                    aria-label={`Delete ${job.jobTitle}`}
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => deleteJobMutation.mutate(job.id)}
                    size="sm"
                    variant="ghost"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
