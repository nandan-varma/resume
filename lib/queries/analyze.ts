import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AnalysisResult } from "@/app/api/analyze/route";

export function useFetchJobDescription() {
  return useMutation({
    mutationFn: async (url: string) => {
      const res = await fetch("/api/fetch-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        throw new Error("Failed to fetch job description");
      }
      const data = await res.json();
      return data.description as string;
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to fetch"),
  });
}

export function useAnalyzeMatch() {
  return useMutation({
    mutationFn: async ({
      jobDescription,
      modelId,
      jobId,
    }: {
      jobDescription: string;
      modelId: string;
      jobId?: number;
    }) => {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, modelId, jobId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Analysis failed");
      }
      const data = await res.json();
      return data.result as AnalysisResult;
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Analysis failed"),
  });
}
