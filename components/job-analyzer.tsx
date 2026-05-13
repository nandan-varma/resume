"use client";

import type { AnalysisResult } from "@/app/api/analyze/route";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AnalysisResults } from "@/components/analysis-results";
import { DEFAULT_MODEL_ID, isValidModelId, type ModelId } from "@/lib/models";

/**
  * JobAnalyzer: lets users paste a job description or fetch from a job URL
  * Handles analysis and stores results in the database
 */
export function JobAnalyzer({ jobId }: { jobId?: number }) {
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [modelId, setModelId] = useState<ModelId>(DEFAULT_MODEL_ID);

  const handleFetchDescription = async () => {
    if (!url.trim()) {
      setError("Please paste a valid job URL.");
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
      toast.success("Job description fetched successfully");
    } catch (err: any) {
      setError(err.message || "Failed to fetch job description");
      toast.error(err.message || "Failed to fetch job description");
    } finally {
      setUrlLoading(false);
    }
  };

  const analyzeMatch = async () => {
    if (!jobDescription.trim()) {
      setError("Please paste a job description first");
      return;
    }
    setLoading(true);
    setError(null);
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
      toast.success("Analysis completed successfully!");

      // Save analysis to database if jobId is provided
      if (jobId) {
        const saveResponse = await fetch("/api/analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId,
            analysisData: data.result,
          }),
        });

        if (!saveResponse.ok) {
          console.error("Failed to save analysis");
          toast.error("Analysis completed but failed to save");
        } else {
          toast.success("Analysis saved to database");
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="size-5 text-muted-foreground" />
          <h2 className="text-foreground font-medium">Job Description</h2>
        </div>
        <div className="space-y-2">
          <Label htmlFor="job-url">
            Paste job posting URL
          </Label>
          <div className="flex gap-2">
            <Input
              className="flex-1"
              disabled={urlLoading}
              id="job-url"
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.linkedin.com/jobs/view/xxxx"
              type="url"
              value={url}
            />
            <Button
              disabled={urlLoading}
              onClick={handleFetchDescription}
              type="button"
              variant="outline"
            >
              {urlLoading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Search className="mr-2 size-4" />
              )}
              Fetch Description
            </Button>
          </div>
          <Textarea
            className="mt-2 min-h-[200px]"
            disabled={urlLoading}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Fetched job description using the URL above, or paste the job description here manually."
            value={jobDescription}
          />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <Button
            disabled={loading || !jobDescription.trim()}
            onClick={analyzeMatch}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="mr-2 size-4" />
                Analyze Match
              </>
            )}
          </Button>
        </div>
      </Card>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          <FileText className="mt-0.5 size-4 shrink-0" />
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {result && <AnalysisResults result={result} />}
    </div>
  );
}
