import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type { Job, JobStatus } from "@/db/schema";
import { saveAnalysis } from "@/server/analysis";
import { createJob, deleteJob, getJobs, updateJobStatus } from "@/server/jobs";

export const jobsQueryKey = ["jobs"] as const;

export function useJobs() {
  return useSuspenseQuery({
    queryKey: jobsQueryKey,
    queryFn: getJobs,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      title,
      description,
      link,
    }: {
      title: string;
      description: string;
      link?: string;
    }) => {
      const result = await createJob(title, description, link);
      if (!(result.success && result.job)) {
        throw new Error(result.message ?? "Failed to create job");
      }
      return result.job;
    },
    onSuccess: (job) => {
      queryClient.setQueryData<Job[]>(jobsQueryKey, (old) => [
        job,
        ...(old ?? []),
      ]);
      toast.success("Application added");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to add application"
      );
      queryClient.invalidateQueries({ queryKey: jobsQueryKey });
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: number) => {
      const result = await deleteJob(jobId);
      if (!result.success) {
        throw new Error(result.message ?? "Failed to delete");
      }
      return jobId;
    },
    onMutate: async (jobId) => {
      await queryClient.cancelQueries({ queryKey: jobsQueryKey });
      const previous = queryClient.getQueryData<Job[]>(jobsQueryKey);
      queryClient.setQueryData<Job[]>(
        jobsQueryKey,
        (old) => old?.filter((j) => j.id !== jobId) ?? []
      );
      return { previous };
    },
    onSuccess: () => {
      toast.success("Application removed");
    },
    onError: (err, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(jobsQueryKey, context.previous);
      }
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: jobsQueryKey });
    },
  });
}

export function useReanalyzeJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      jobDescription,
      modelId,
    }: {
      jobId: number;
      jobDescription: string;
      modelId: string;
    }) => {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, modelId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Analysis failed");
      }
      const { result } = await res.json();
      const saved = await saveAnalysis(jobId, result);
      if (!saved.success) {
        throw new Error(saved.message ?? "Failed to save");
      }
      return result.match_percentage as number;
    },
    onSuccess: (matchPercentage) => {
      queryClient.invalidateQueries({ queryKey: jobsQueryKey });
      toast.success(`Score updated: ${matchPercentage}%`);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Re-analyze failed"),
  });
}

export function useUpdateJobStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      status,
    }: {
      jobId: number;
      status: JobStatus;
    }) => {
      const result = await updateJobStatus(jobId, status);
      if (!result.success) {
        throw new Error(result.message ?? "Failed to update status");
      }
      return { jobId, status };
    },
    onMutate: async ({ jobId, status }) => {
      await queryClient.cancelQueries({ queryKey: jobsQueryKey });
      const previous = queryClient.getQueryData<Job[]>(jobsQueryKey);
      queryClient.setQueryData<Job[]>(
        jobsQueryKey,
        (old) => old?.map((j) => (j.id === jobId ? { ...j, status } : j)) ?? []
      );
      return { previous };
    },
    onSuccess: () => {
      toast.success("Status updated");
    },
    onError: (err, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(jobsQueryKey, context.previous);
      }
      toast.error(
        err instanceof Error ? err.message : "Failed to update status"
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: jobsQueryKey });
    },
  });
}
