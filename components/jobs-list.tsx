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
import { toast } from "sonner";
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
import type { Job, JobStatus } from "@/db/schema";
import { jobStatus } from "@/db/schema";
import { STATUS_CONFIG } from "@/lib/status";
import { createJob, deleteJob, getJobs, updateJobStatus } from "@/server/jobs";

const JOB_STATUSES = jobStatus;

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

const EMPTY_FORM = { jobTitle: "", jobDescription: "", link: "" };

export function JobsList({ initialJobs }: { initialJobs: Job[] }) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const handleSubmit = async () => {
    if (!(formData.jobTitle.trim() && formData.jobDescription.trim())) {
      toast.error("Job title and description are required");
      return;
    }
    setCreating(true);
    const result = await createJob(
      formData.jobTitle.trim(),
      formData.jobDescription.trim(),
      formData.link.trim() || undefined
    );
    setCreating(false);

    if (result.success && result.job) {
      setJobs((prev) => [result.job, ...prev]);
      setFormData(EMPTY_FORM);
      setOpen(false);
      toast.success("Application added");
    } else {
      toast.error(result.message || "Failed to add application");
    }
  };

  const handleDelete = async (jobId: number) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    const result = await deleteJob(jobId);
    if (result.success) {
      toast.success("Application removed");
    } else {
      getJobs().then((data) => setJobs(data));
      toast.error(result.message || "Failed to delete");
    }
  };

  const handleStatusChange = async (jobId: number, newStatus: JobStatus) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j))
    );
    const result = await updateJobStatus(jobId, newStatus);
    if (!result.success) {
      getJobs().then((data) => setJobs(data));
      toast.error(result.message || "Failed to update status");
    }
  };

  const statusCounts = Object.fromEntries(
    JOB_STATUSES.map((s) => [s, jobs.filter((j) => j.status === s).length])
  ) as Record<JobStatus, number>;

  return (
    <main className="min-h-screen p-6 md:p-10" id="main-content">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex animate-enter-up items-start justify-between gap-4">
          <div>
            <h1 className="font-bold text-3xl text-foreground">Applications</h1>
            <p className="mt-1 text-muted-foreground text-sm">
              {jobs.length > 0
                ? `${jobs.length} application${jobs.length === 1 ? "" : "s"} tracked`
                : "Track your job applications"}
            </p>
          </div>
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
                  disabled={creating}
                  onClick={handleSubmit}
                >
                  {creating ? (
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
          <ul
            aria-label="Application status summary"
            className="mb-6 flex animate-enter flex-wrap gap-2 [animation-delay:80ms]"
          >
            {JOB_STATUSES.filter((s) => statusCounts[s] > 0).map((s) => (
              <li
                className="inline-flex items-center gap-1.5 border border-border bg-background px-3 py-1 text-muted-foreground text-xs"
                key={s}
              >
                <span aria-hidden="true">{STATUS_CONFIG[s].icon}</span>
                <span className="font-medium text-foreground">
                  {statusCounts[s]}
                </span>
                <span className="capitalize">{s}</span>
              </li>
            ))}
          </ul>
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
            {jobs.map((job, i) => (
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
                        onValueChange={(v) =>
                          handleStatusChange(job.id, v as JobStatus)
                        }
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
                      onClick={() => handleDelete(job.id)}
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
      </div>
    </main>
  );
}
