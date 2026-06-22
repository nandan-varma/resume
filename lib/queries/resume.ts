import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getJobResume,
  getPersonalInformation,
  saveAiPreferences,
  saveJobResumeLatex,
  saveResumeLatex,
} from "@/server/resume";

export const personalInfoQueryKey = ["personal-info"] as const;
export const jobResumeQueryKey = (jobId: number) => ["job-resume", jobId] as const;

// ── Queries ───────────────────────────────────────────────────────────────────

export function usePersonalInfo() {
  return useSuspenseQuery({
    queryKey: personalInfoQueryKey,
    queryFn: getPersonalInformation,
  });
}

export function useJobResume(jobId: number) {
  return useSuspenseQuery({
    queryKey: jobResumeQueryKey(jobId),
    queryFn: () => getJobResume(jobId),
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useSaveAiPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (aiPreferences: string) => {
      const result = await saveAiPreferences(aiPreferences);
      if (!result.success) throw new Error(result.message ?? "Failed to save preferences");
      return aiPreferences;
    },
    onSuccess: (aiPreferences) => {
      queryClient.setQueryData(
        personalInfoQueryKey,
        (old: Awaited<ReturnType<typeof getPersonalInformation>>) =>
          old ? { ...old, aiPreferences } : old
      );
      toast.success("Preferences saved");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to save preferences");
    },
  });
}

// Unified save for editor — handles both global resume and job-specific resumes.
// Updates the correct cache key on success so navigation back is instant.
export function useSaveEditorState(jobId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { latex: string; chatMessages: unknown[] }) => {
      const result = jobId
        ? await saveJobResumeLatex(jobId, payload.latex, payload.chatMessages)
        : await saveResumeLatex(payload.latex, payload.chatMessages);
      if (!result.success) throw new Error(result.message ?? "Failed to save");
      return payload;
    },
    onSuccess: ({ latex, chatMessages }) => {
      if (jobId) {
        queryClient.setQueryData(
          jobResumeQueryKey(jobId),
          (old: Awaited<ReturnType<typeof getJobResume>>) =>
            old ? { ...old, resumeLatex: latex, chatMessages } : old
        );
      } else {
        queryClient.setQueryData(
          personalInfoQueryKey,
          (old: Awaited<ReturnType<typeof getPersonalInformation>>) =>
            old ? { ...old, resumeLatex: latex, chatMessages } : old
        );
      }
    },
  });
}
