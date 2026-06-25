"use client";

import { AlertTriangle, Link2, Loader2, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type Control, Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { AnalysisResult } from "@/app/api/analyze/route";
import { AnalysisResults } from "@/components/analysis-results";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAnalyzeMatch } from "@/lib/queries/analyze";
import { useCreateJob, useJobs } from "@/lib/queries/jobs";
import { usePersonalInfo } from "@/lib/queries/resume";
import { useModelId } from "@/lib/use-model-id";
import { saveAnalysis } from "@/server/analysis";

interface FormValues {
  jobDescription: string;
  linkedJobId: string;
}
interface AnalysisState {
  linkedJobId: string;
  result: AnalysisResult;
  saved: boolean;
}

function AnalyzeButton({
  control,
  isPending,
  hasResult,
}: {
  control: Control<FormValues>;
  isPending: boolean;
  hasResult: boolean;
}) {
  const jobDescription = useWatch({ control, name: "jobDescription" });
  return (
    <Button
      className="h-8 w-full sm:w-auto"
      disabled={isPending || !jobDescription.trim()}
      type="submit"
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Analyzing…
        </>
      ) : (
        <>
          <Search className="mr-2 size-4" />
          {hasResult ? "Re-analyze" : "Analyze Match"}
        </>
      )}
    </Button>
  );
}

export function JobAnalyzer() {
  const router = useRouter();
  const [modelId] = useModelId();
  const { data: jobs } = useJobs();
  const { data: personalInfo } = usePersonalInfo();
  const createJob = useCreateJob();
  const analyze = useAnalyzeMatch();

  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);

  const form = useForm<FormValues>({
    defaultValues: { jobDescription: "", linkedJobId: "" },
  });

  const handleSaveToJob = async (jobId: number, result: AnalysisResult) => {
    const res = await saveAnalysis(jobId, {
      match_percentage: result.match_percentage,
      summary: result.summary,
      strengths: result.strengths,
      missing_keywords: result.missing_keywords,
      improvement_suggestions: result.improvement_suggestions,
      additional_insights: result.additional_insights,
    });
    if (res.success) {
      setAnalysis((prev) => (prev ? { ...prev, saved: true } : null));
      toast.success("Analysis saved to job");
    } else {
      toast.error(res.message || "Failed to save analysis");
    }
  };

  const handleAnalyze = form.handleSubmit(async (values) => {
    const data = await analyze.mutateAsync({
      jobDescription: values.jobDescription.trim(),
      modelId,
      jobId:
        values.linkedJobId && values.linkedJobId !== "none"
          ? Number(values.linkedJobId)
          : undefined,
    });
    const linked = values.linkedJobId;
    setAnalysis({ result: data, linkedJobId: linked, saved: false });
    toast.success("Analysis complete");
    if (linked && linked !== "none") {
      await handleSaveToJob(Number(linked), data);
    }
  });

  const handleCustomize = () => {
    const { linkedJobId, jobDescription } = form.getValues();
    if (linkedJobId && linkedJobId !== "none") {
      router.push(`/editor?jobId=${linkedJobId}`);
      return;
    }
    if (!jobDescription.trim()) {
      return;
    }
    createJob.mutate(
      {
        title: analysis?.result.short_title ?? "Job Application",
        description: jobDescription.trim(),
      },
      {
        onSuccess: (job) => {
          form.setValue("linkedJobId", String(job.id));
          router.push(`/editor?jobId=${job.id}`);
        },
      }
    );
  };

  const result = analysis?.result ?? null;

  return (
    <div className="space-y-5">
      {!personalInfo?.resumeUrl && (
        <div className="flex animate-enter items-start gap-3 rounded-lg border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>
            No resume uploaded yet.{" "}
            <Link
              className="font-medium underline underline-offset-3 hover:no-underline"
              href="/settings"
            >
              Add your resume
            </Link>{" "}
            to get accurate results.
          </span>
        </div>
      )}

      <div
        className={
          result
            ? "grid gap-5 xl:grid-cols-[2fr_3fr] xl:items-start xl:gap-8"
            : "mx-auto max-w-3xl"
        }
      >
        <Card className="space-y-4 p-5 sm:p-6">
          <form className="space-y-3" onSubmit={handleAnalyze}>
            <div className="space-y-1.5">
              <Label className="font-medium text-sm" htmlFor="jobDescription">
                Job description
                <span className="ml-2 font-normal text-muted-foreground text-xs">
                  or paste directly
                </span>
              </Label>
              <Textarea
                className={`resize-y transition-all duration-300 ${result ? "min-h-[100px]" : "min-h-[200px]"}`}
                id="jobDescription"
                placeholder="Paste the full job description here…"
                {...form.register("jobDescription")}
              />
            </div>

            <div className="flex flex-wrap items-end gap-3">
              {jobs.length > 0 && (
                <div className="space-y-1">
                  <Label className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <Link2 className="size-3" />
                    Link to tracked job
                  </Label>
                  <Controller
                    control={form.control}
                    name="linkedJobId"
                    render={({ field: { onChange, value } }) => (
                      <Select onValueChange={onChange} value={value}>
                        <SelectTrigger className="h-8 w-44 text-sm">
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
                    )}
                  />
                </div>
              )}

              <div className="ml-auto flex flex-col items-end gap-1">
                <AnalyzeButton
                  control={form.control}
                  hasResult={!!result}
                  isPending={analyze.isPending}
                />
                <p className="text-muted-foreground text-xs">
                  Model: {modelId} ·{" "}
                  <Link
                    className="underline hover:no-underline"
                    href="/settings"
                  >
                    change
                  </Link>
                </p>
              </div>
            </div>

            {analyze.isError && (
              <p className="animate-enter rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-destructive text-sm">
                {analyze.error.message}
              </p>
            )}
          </form>
        </Card>

        {result && (
          <div className="animate-enter-up space-y-4">
            <AnalysisResults result={result} />

            {(!analysis?.linkedJobId || analysis.linkedJobId === "none") &&
              !analysis?.saved &&
              jobs.length > 0 && (
                <div className="flex animate-enter items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3">
                  <p className="flex-1 text-muted-foreground text-sm">
                    Save this analysis to a tracked job?
                  </p>
                  <Select
                    onValueChange={(val) => {
                      if (val !== "none") {
                        handleSaveToJob(Number(val), result);
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
                </div>
              )}

            {analysis?.saved && (
              <p className="font-medium text-sm text-success">
                ✓ Analysis saved to job
              </p>
            )}

            <div className="flex animate-enter-up items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 [animation-delay:320ms]">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground text-sm">
                  Customize your resume for this role
                </p>
                <p className="mt-0.5 text-muted-foreground text-xs">
                  Opens AI editor pre-loaded with this job — saves as a separate
                  job resume
                </p>
              </div>
              <Button
                disabled={createJob.isPending}
                onClick={handleCustomize}
                size="sm"
              >
                {createJob.isPending ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 size-3.5" />
                )}
                Customize resume
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
