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
import { Navigation } from "@/components/navigation";
import { AuthGuard } from "@/components/auth-guard";

const jobStatuses: JobStatus[] = [
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

const getStatusColor = (status: JobStatus) => {
  const colors: Record<JobStatus, string> = {
    submitted: "bg-primary/10 text-primary hover:bg-primary/20",
    "waiting for response": "bg-warning/10 text-warning hover:bg-warning/20",
    rejected: "bg-destructive/10 text-destructive hover:bg-destructive/20",
    interview: "bg-info/10 text-info hover:bg-info/20",
    offer: "bg-success/10 text-success hover:bg-success/20",
    accepted: "bg-success/10 text-success hover:bg-success/20",
    withdrawn: "bg-muted text-foreground hover:bg-muted",
  };
  return colors[status] || "bg-muted text-foreground";
};

const getStatusIcon = (status: JobStatus) => {
  switch (status) {
    case "submitted":
      return "📤";
    case "waiting for response":
      return "⏳";
    case "rejected":
      return "❌";
    case "interview":
      return "🎤";
    case "offer":
      return "🎉";
    case "accepted":
      return "✅";
    case "withdrawn":
      return "🚪";
    default:
      return "📄";
  }
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    jobTitle: "",
    jobDescription: "",
    link: "",
  });

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const data = await getJobs();
      setJobs(data as Job[]);
    } catch (error) {
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.jobTitle.trim() || !formData.jobDescription.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setCreating(true);
      const result = await createJob(
        formData.jobTitle,
        formData.jobDescription,
        formData.link || undefined
      );

      if (result.success && result.job) {
        setJobs([...jobs, result.job as Job]);
        setFormData({ jobTitle: "", jobDescription: "", link: "" });
        setOpen(false);
        toast.success("Job created successfully!");
      } else {
        toast.error(result.message || "Failed to create job");
      }
    } catch (error) {
      toast.error("Failed to create job");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (jobId: number) => {
    if (!confirm("Are you sure you want to delete this job?")) return;

    try {
      const result = await deleteJob(jobId);
      if (result.success) {
        setJobs(jobs.filter((j) => j.id !== jobId));
        toast.success("Job deleted successfully!");
      } else {
        toast.error(result.message || "Failed to delete job");
      }
    } catch (error) {
      toast.error("Failed to delete job");
    }
  };

  const handleStatusChange = async (jobId: number, newStatus: JobStatus) => {
    try {
      const result = await updateJobStatus(jobId, newStatus);
      if (result.success && result.job) {
        setJobs(jobs.map((j) => (j.id === jobId ? (result.job as Job) : j)));
        toast.success("Job status updated!");
      } else {
        toast.error(result.message || "Failed to update job");
      }
    } catch (error) {
      toast.error("Failed to update job status");
    }
  };

  const statusCounts = jobStatuses.reduce((acc, status) => {
    acc[status] = jobs.filter((j) => j.status === status).length;
    return acc;
  }, {} as Record<JobStatus, number>);

  return (
    <AuthGuard>
      <Navigation activeTab="jobs" />
      <div className="min-h-screen bg-background p-6 md:p-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Job Tracker</h1>
              <p className="text-muted-foreground">Track and manage your job applications</p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 size-4" />
                  Add Job
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add New Job</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Job Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Senior React Developer"
                      value={formData.jobTitle}
                      onChange={(e) =>
                        setFormData({ ...formData, jobTitle: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Job Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Paste the job description here..."
                      value={formData.jobDescription}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          jobDescription: e.target.value,
                        })
                      }
                      rows={6}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="link">Job Link (Optional)</Label>
                    <Input
                      id="link"
                      placeholder="https://..."
                      type="url"
                      value={formData.link}
                      onChange={(e) =>
                        setFormData({ ...formData, link: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <Button
                    onClick={handleSubmit}
                    disabled={creating}
                    className="w-full"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Job"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Status Summary */}
          {!loading && jobs.length > 0 && (
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7">
              {jobStatuses.map((status) => (
                <Card key={status} className="p-3 text-center">
                  <p className="text-xl">{getStatusIcon(status)}</p>
                  <p className="text-lg font-bold text-foreground">{statusCounts[status]}</p>
                  <p className="text-xs text-muted-foreground capitalize">{status}</p>
                </Card>
              ))}
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <Card className="p-12 text-center">
              <Briefcase className="mx-auto mb-4 size-12 text-muted-foreground/50" />
              <h3 className="mb-2 text-lg font-semibold text-foreground">No jobs yet</h3>
              <p className="mb-6 text-muted-foreground">Start tracking your first job application to see your progress.</p>
              <Button onClick={() => setOpen(true)}>
                <Plus className="mr-2 size-4" />
                Add Your First Job
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {jobs.map((job) => (
                <Card key={job.id} className="p-6 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground truncate">
                          {job.jobTitle}
                        </h3>
                        <Badge className={getStatusColor(job.status)}>
                          {getStatusIcon(job.status)} {job.status}
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
                        {job.jobDescription}
                      </p>
                      {job.link && (
                        <a
                          href={job.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          View Job <ExternalLink className="size-3" />
                        </a>
                      )}
                      <div className="mt-4 flex items-center gap-2">
                        <Label className="text-muted-foreground text-sm">Update Status:</Label>
                        <Select
                          value={job.status}
                          onValueChange={(value) =>
                            handleStatusChange(job.id, value as JobStatus)
                          }
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {jobStatuses.map((status) => (
                              <SelectItem key={status} value={status}>
                                {getStatusIcon(status)} {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(job.id)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
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
      </div>
    </AuthGuard>
  );
}
