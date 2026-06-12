"use client";

import type { AnalysisResult } from "@/app/api/analyze/route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Link2, Loader2, Search, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AnalysisResults } from "@/components/analysis-results";
import {
  DEFAULT_MODEL_ID,
  isValidModelId,
  type Model,
  type ModelId,
  models,
} from "@/lib/models";
import { getJobs, getPersonalInformation, saveAnalysis } from "@/server/users";

const MODEL_STORAGE_KEY = "job-match-ai-model";

interface Job {
  id: number;
  jobTitle: string;
}

export function JobAnalyzer() {
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [linkedJobId, setLinkedJobId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasResume, setHasResume] = useState<boolean | null>(null);

  const [modelId, setModelId] = useState<ModelId>(() => {
    if (typeof window === "undefined") return DEFAULT_MODEL_ID;
    const stored = localStorage.getItem(MODEL_STORAGE_KEY);
    return stored && isValidModelId(stored) ? (stored as ModelId) : DEFAULT_MODEL_ID;
  });

  useEffect(() => {
    getJobs().then((data) => setJobs(data as Job[]));
    getPersonalInformation().then((info) => setHasResume(!!info?.resumeUrl));
  }, []);

  const handleModelChange = (value: string) => {
    if (isValidModelId(value)) {
      setModelId(value as ModelId);
      localStorage.setItem(MODEL_STORAGE_KEY, value);
    }
  };

  const handleFetchDescription = async () => {
    if (!url.trim()) {
      setError("Please enter a valid job URL.");
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
      if (!response.ok) throw new Error("Failed to fetch job description");
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
    if (!result) return;
    setSaving(true);
    const saveResult = await saveAnalysis(jobId, {
      match_percentage: result.match_percentage,
      summary: result.summary,
      strengths: result.strengths,
      missing_keywords: result.missing_keywords,
      improvement_suggestions: result.improvement_suggestions,
      additional_insights: result.additional_insights,
    });
    setSaving(false);
    if (saveResult.success) {
      setSaved(true);
      toast.success("Analysis saved to job");
    } else {
      toast.error(saveResult.message || "Failed to save analysis");
    }
  };

  const analyzeMatch = async () => {
    if (!jobDescription.trim()) {
      setError("Please add a job description first.");
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
        body: JSON.stringify({ jobDescription: jobDescription.trim(), modelId }),
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
      const msg = err instanceof Error ? err.message : "An unknown error occurred";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const currentModel = models.find((m) => m.id === modelId);

  return (
    <div className="space-y-5">
      {/* Resume status warning */}
      {hasResume === false && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <span>
            No resume uploaded yet.{" "}
            <Link href="/resume" className="font-medium underline underline-offset-3 hover:no-underline">
              Add your resume
            </Link>{" "}
            to get accurate results.
          </span>
        </div>
      )}

      {/* Step 1: Job input */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="job-url" className="text-sm font-medium">
            Job posting URL
            <span className="ml-2 font-normal text-muted-foreground text-xs">
              auto-fills the description below
            </span>
          </Label>
          <div className="flex gap-2">
            <Input
              className="flex-1"
              disabled={urlLoading}
              id="job-url"
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFetchDescription()}
              placeholder="https://www.linkedin.com/jobs/view/…"
              type="url"
              value={url}
            />
            <Button
              disabled={urlLoading || !url.trim()}
              onClick={handleFetchDescription}
              type="button"
              variant="outline"
              className="shrink-0"
            >
              {urlLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              <span className="ml-1.5">Fetch</span>
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="job-description" className="text-sm font-medium">
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

      {/* Step 2: Options + action */}
      <div className="flex flex-wrap items-end gap-3 pt-1">
        {jobs.length > 0 && (
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Link2 className="size-3" />
              Link to tracked job
            </Label>
            <Select value={linkedJobId} onValueChange={setLinkedJobId}>
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

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">AI model</Label>
          <Select onValueChange={handleModelChange} value={modelId}>
            <SelectTrigger className="h-8 w-56 text-sm">
              <SelectValue>
                <span className="truncate">{currentModel?.name ?? modelId}</span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(models as readonly Model[]).map((model: Model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex flex-col">
                    <span>{model.name}</span>
                    <span className="text-xs text-muted-foreground uppercase">
                      {model.provider}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          disabled={loading || !jobDescription.trim()}
          onClick={analyzeMatch}
          className="ml-auto h-8"
          title={!jobDescription.trim() ? "Paste a job description first" : undefined}
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
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {result && (
        <>
          <div className="border-t border-border pt-5">
            <AnalysisResults result={result} />
          </div>

          {/* Post-analysis save bar */}
          {(!linkedJobId || linkedJobId === "none") && !saved && jobs.length > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3">
              <p className="text-sm text-muted-foreground flex-1">
                Save this analysis to a tracked job?
              </p>
              <Select
                onValueChange={(val) => {
                  if (val !== "none") handleSaveToJob(Number(val));
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
              {saving && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            </div>
          )}

          {saved && (
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              ✓ Analysis saved to job
            </p>
          )}
        </>
      )}
    </div>
  );
}
