"use client";

import { AlertTriangle, Link2, Loader2, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useState } from "react";
import { toast } from "sonner";
import type { AnalysisResult } from "@/app/api/analyze/route";
import { AnalysisResults } from "@/components/analysis-results";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import type { Job } from "@/db/schema";
import { useModelId } from "@/lib/use-model-id";
import { saveAnalysis } from "@/server/analysis";
import { createJob } from "@/server/jobs";

type JobSummary = Pick<Job, "id" | "jobTitle">;

// ─── Sub-components ─────────────────────────────────────────────────────

interface UrlFetcherProps {
  disabled: boolean;
  onFetch: () => void;
  onUrlChange: (url: string) => void;
  url: string;
}

const UrlFetcher = memo(function UrlFetcher({
  disabled,
  url,
  onUrlChange,
  onFetch,
}: UrlFetcherProps) {
  return (
    <div className="flex gap-2">
      <Input
        className="min-w-0 flex-1"
        disabled={disabled}
        id="job-url"
        onChange={(e) => onUrlChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onFetch()}
        placeholder="https://www.linkedin.com/jobs/view/…"
        type="url"
        value={url}
      />
      <Button
        className="shrink-0"
        disabled={disabled || !url.trim()}
        onClick={onFetch}
        type="button"
        variant="outline"
      >
        {disabled ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Search className="size-4" />
        )}
        <span className="ml-1.5">Fetch</span>
      </Button>
    </div>
  );
});

// ─── Save bar ────────────────────────────────────────────────────────────

interface SaveAnalysisBarProps {
  jobs: JobSummary[];
  onSave: (jobId: number) => void;
  saving: boolean;
}

const SaveAnalysisBar = memo(function SaveAnalysisBar({
  jobs,
  saving,
  onSave,
}: SaveAnalysisBarProps) {
  return (
    <div className="flex animate-enter items-center gap-3 border border-border bg-muted/50 px-4 py-3">
      <p className="flex-1 text-muted-foreground text-sm">
        Save this analysis to a tracked job?
      </p>
      <Select
        onValueChange={(val) => {
          if (val !== "none") {
            onSave(Number(val));
          }
        }}
      >
        <SelectTrigger className="h-8 w-48 text-sm">
          <SelectValue placeholder="Choose a job…" />
        </SelectTrigger>
        <SelectContent>
          {jobs.map((job) => (
            <SelectItem key={job.id} value={String(job.id)}>
              {job.jobTitle}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {saving && (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      )}
    </div>
  );
});

// ─── Customize CTA ──────────────────────────────────────────────────────

interface CustomizeCtaProps {
  creatingJob: boolean;
  onCustomize: () => void;
}

const CustomizeCta = memo(function CustomizeCta({
  creatingJob,
  onCustomize,
}: CustomizeCtaProps) {
  return (
    <div className="flex animate-enter-up items-center gap-3 border border-primary/20 bg-primary/5 px-4 py-3 [animation-delay:320ms]">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground text-sm">
          Customize your resume for this role
        </p>
        <p className="mt-0.5 text-muted-foreground text-xs">
          Opens AI editor pre-loaded with this job — saves as a separate job
          resume
        </p>
      </div>
      <Button disabled={creatingJob} onClick={onCustomize} size="sm">
        {creatingJob ? (
          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
        ) : (
          <Sparkles className="mr-1.5 size-3.5" />
        )}
        Customize resume
      </Button>
    </div>
  );
});

// ─── Main component ─────────────────────────────────────────────────────

interface JobAnalyzerProps {
  hasResume: boolean;
  initialJobs: JobSummary[];
}

export function JobAnalyzer({ initialJobs, hasResume }: JobAnalyzerProps) {
  const router = useRouter();
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [jobs, setJobs] = useState<JobSummary[]>(initialJobs);
  const [linkedJobId, setLinkedJobId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [creatingJob, setCreatingJob] = useState(false);

  const [modelId] = useModelId();

  const handleFetchDescription = async () => {
    if (!url.trim()) {
      setError(
        "Please enter a valid job URL (e.g., LinkedIn, company career page)."
      );
      return;
    }
    setUrlLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/fetch-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch job description");
      }
      const data = await response.json();
      setJobDescription(data.description || "");
      toast.success("Job description fetched");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch";
      setError(msg);
      toast.error(msg);
    } finally {
      setUrlLoading(false);
    }
  };

  const handleSaveToJob = async (jobId: number) => {
    if (!result) {
      return;
    }
    setSaving(true);
    try {
      const saveResult = await saveAnalysis(jobId, {
        match_percentage: result.match_percentage,
        summary: result.summary,
        strengths: result.strengths,
        missing_keywords: result.missing_keywords,
        improvement_suggestions: result.improvement_suggestions,
        additional_insights: result.additional_insights,
      });
      if (saveResult.success) {
        setSaved(true);
        toast.success("Analysis saved to job");
      } else {
        toast.error(saveResult.message || "Failed to save analysis");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save analysis"
      );
    } finally {
      setSaving(false);
    }
  };

  const analyzeMatch = async () => {
    if (!jobDescription.trim()) {
      setError(
        "Please add a job description first. You can paste it directly or fetch from a job URL."
      );
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: jobDescription.trim(),
          modelId,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Analysis failed");
      }
      const data = await response.json();
      setResult(data.result);
      toast.success("Analysis complete");
      if (linkedJobId && linkedJobId !== "none") {
        await handleSaveToJob(Number(linkedJobId));
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomize = async () => {
    if (linkedJobId && linkedJobId !== "none") {
      router.push(`/editor?jobId=${linkedJobId}`);
      return;
    }
    if (!jobDescription.trim()) {
      return;
    }
    const title = result?.short_title ?? "Job Application";
    setCreatingJob(true);
    try {
      const res = await createJob(title, jobDescription.trim());
      if (res.success && res.job) {
        setJobs((prev) => [
          ...prev,
          { id: res.job.id, jobTitle: res.job.jobTitle },
        ]);
        setLinkedJobId(String(res.job.id));
        router.push(`/editor?jobId=${res.job.id}`);
      } else {
        toast.error(res.message ?? "Failed to create job");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setCreatingJob(false);
    }
  };

  return (
    <div className="space-y-5">
      {!hasResume && (
        <div className="flex animate-enter items-start gap-3 border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>
            No resume uploaded yet.{" "}
            <Link
              className="font-medium underline underline-offset-3 hover:no-underline"
              href="/resume"
            >
              Add your resume
            </Link>{" "}
            to get accurate results.
          </span>
        </div>
      )}

      <Card className="space-y-5 p-5 sm:p-6">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="font-medium text-sm" htmlFor="job-url">
              Job posting URL
              <span className="ml-2 font-normal text-muted-foreground text-xs">
                auto-fills the description below
              </span>
            </Label>
            <UrlFetcher
              disabled={urlLoading}
              onFetch={handleFetchDescription}
              onUrlChange={setUrl}
              url={url}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-medium text-sm" htmlFor="job-description">
              Job description
              <span className="ml-2 font-normal text-muted-foreground text-xs">
                or paste directly
              </span>
            </Label>
            <Textarea
              className="min-h-[200px] resize-y"
              disabled={urlLoading}
              id="job-description"
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here…"
              value={jobDescription}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {jobs.length > 0 && (
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Link2 className="size-3" />
                Link to tracked job
              </Label>
              <Select onValueChange={setLinkedJobId} value={linkedJobId}>
                <SelectTrigger className="h-8 w-48 text-sm">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No link</SelectItem>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={String(job.id)}>
                      {job.jobTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="ml-auto flex flex-col items-end gap-1">
            <Button
              className="h-8 w-full sm:w-auto"
              disabled={loading || !jobDescription.trim()}
              onClick={analyzeMatch}
              title={
                jobDescription.trim()
                  ? undefined
                  : "Paste a job description first"
              }
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <Search className="mr-2 size-4" />
                  Analyze Match
                </>
              )}
            </Button>
            <p className="text-muted-foreground text-xs">
              Model: {modelId} ·{" "}
              <Link className="underline hover:no-underline" href="/settings">
                change
              </Link>
            </p>
          </div>
        </div>

        {error && (
          <p className="animate-enter border border-destructive/20 bg-destructive/10 px-4 py-3 text-destructive text-sm">
            {error}
          </p>
        )}
      </Card>

      {result && (
        <>
          <div className="animate-enter-up">
            <AnalysisResults result={result} />
          </div>

          {(!linkedJobId || linkedJobId === "none") &&
            !saved &&
            jobs.length > 0 && (
              <SaveAnalysisBar
                jobs={jobs}
                onSave={handleSaveToJob}
                saving={saving}
              />
            )}

          {saved && (
            <p className="font-medium text-sm text-success">
              ✓ Analysis saved to job
            </p>
          )}

          <CustomizeCta
            creatingJob={creatingJob}
            onCustomize={handleCustomize}
          />
        </>
      )}
    </div>
  );
}
