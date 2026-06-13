"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Loader2, ExternalLink, Briefcase } from "lucide-react";
import { createJob, getJobs, deleteJob, updateJobStatus } from "@/server/users";
import type { JobStatus } from "@/db/schema";
import { STATUS_COLORS, STATUS_ICONS } from "@/lib/status";
import { Navigation } from "@/components/navigation";
import { AuthGuard } from "@/components/auth-guard";

const JOB_STATUSES: JobStatus[] = [
  "submitted",
  "waiting for response",
  "rejected",
  "interview",
  "offer",
  "accepted",
  "withdrawn",
];

interface Job {
  id: number;
  jobTitle: string;
  jobDescription: string;
  link: string | null;
  status: JobStatus;
  createdAt: Date;
  updatedAt: Date;
}


function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

const EMPTY_FORM = { jobTitle: "", jobDescription: "", link: "" };

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    getJobs()
      .then((data) => setJobs(data as Job[]))
      .catch(() => toast.error("Failed to load applications"))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!formData.jobTitle.trim() || !formData.jobDescription.trim()) {
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
      setJobs((prev) => [result.job as Job, ...prev]);
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
    if (!result.success) {
      // Reload to restore state if deletion failed
      getJobs().then((data) => setJobs(data as Job[]));
      toast.error(result.message || "Failed to delete");
    } else {
      toast.success("Application removed");
    }
  };

  const handleStatusChange = async (jobId: number, newStatus: JobStatus) => {
    // Optimistic update
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j))
    );
    const result = await updateJobStatus(jobId, newStatus);
    if (!result.success) {
      // Reload to restore correct state
      getJobs().then((data) => setJobs(data as Job[]));
      toast.error(result.message || "Failed to update status");
    }
  };

  const statusCounts = JOB_STATUSES.reduce<Record<JobStatus, number>>(
    (acc, s) => ({ ...acc, [s]: jobs.filter((j) => j.status === s).length }),
    {} as Record<JobStatus, number>
  );

  return (
    <AuthGuard>
      <Navigation activeTab="jobs" />
      <div className="min-h-screen p-6 md:p-10">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between gap-4 animate-enter-up">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Applications</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {jobs.length > 0
                  ? `${jobs.length} application${jobs.length !== 1 ? "s" : ""} tracked`
                  : "Track your job applications"}
              </p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
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
                      id="title"
                      placeholder="Senior React Developer at Acme Corp"
                      value={formData.jobTitle}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, jobTitle: e.target.value }))
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Job Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Paste the job description here…"
                      value={formData.jobDescription}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, jobDescription: e.target.value }))
                      }
                      rows={6}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="link">Job Posting URL (optional)</Label>
                    <Input
                      id="link"
                      placeholder="https://…"
                      type="url"
                      value={formData.link}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, link: e.target.value }))
                      }
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleSubmit} disabled={creating} className="w-full">
                    {creating ? (
                      <><Loader2 className="mr-2 size-4 animate-spin" />Adding…</>
                    ) : (
                      "Add Application"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Status summary — non-zero only */}
          {!loading && jobs.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2 animate-enter [animation-delay:80ms]" role="list" aria-label="Application status summary">
              {JOB_STATUSES.filter((s) => statusCounts[s] > 0).map((s) => (
                <span
                  key={s}
                  role="listitem"
                  className="inline-flex items-center gap-1.5 border border-border bg-background px-3 py-1 text-xs text-muted-foreground"
                >
                  <span aria-hidden="true">{STATUS_ICONS[s]}</span>
                  <span className="font-medium text-foreground">{statusCounts[s]}</span>
                  <span className="capitalize">{s}</span>
                </span>
              ))}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}
            </div>
          ) : jobs.length === 0 ? (
            <Card className="py-16 text-center">
              <Briefcase className="mx-auto mb-3 size-10 text-muted-foreground/30" />
              <h3 className="mb-1 font-semibold text-foreground">No applications yet</h3>
              <p className="mb-5 text-sm text-muted-foreground">
                Track your first application or{" "}
                <a
                  href="/analyze"
                  className="text-primary underline underline-offset-3 hover:no-underline"
                >
                  analyze a job
                </a>{" "}
                to get started.
              </p>
              <div className="flex justify-center">
                <Button size="sm" onClick={() => setOpen(true)}>
                  <Plus className="mr-2 size-4" />
                  Add Application
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {jobs.map((job, i) => (
                <Card
                  key={job.id}
                  className="p-5 animate-enter-up"
                  style={{ animationDelay: `${Math.min(i * 50, 250)}ms` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Title row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground truncate">
                          {job.jobTitle}
                        </h3>
                        <Badge className={`${STATUS_COLORS[job.status]} border-0 text-xs`}>
                          {STATUS_ICONS[job.status]} {job.status}
                        </Badge>
                      </div>

                      {/* Meta row */}
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Added {formatDate(job.createdAt)}</span>
                        {job.link && (
                          <a
                            href={job.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            View posting <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>

                      {/* Description preview */}
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {job.jobDescription}
                      </p>

                      {/* Status selector */}
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Status:</span>
                        <Select
                          value={job.status}
                          onValueChange={(v) =>
                            handleStatusChange(job.id, v as JobStatus)
                          }
                        >
                          <SelectTrigger className="h-7 w-44 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {JOB_STATUSES.map((s) => (
                              <SelectItem key={s} value={s} className="text-xs">
                                {STATUS_ICONS[s]} {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Delete */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(job.id)}
                      aria-label={`Delete ${job.jobTitle}`}
                      className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
