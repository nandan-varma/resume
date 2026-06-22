import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { getPersonalInformation, saveAiPreferences } from "@/server/resume";

export const personalInfoQueryKey = ["personal-info"] as const;

export function usePersonalInfo() {
  return useSuspenseQuery({
    queryKey: personalInfoQueryKey,
    queryFn: getPersonalInformation,
  });
}

export function useSaveAiPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (aiPreferences: string) => {
      const result = await saveAiPreferences(aiPreferences);
      if (!result.success) {
        throw new Error(result.message ?? "Failed to save preferences");
      }
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
      toast.error(
        err instanceof Error ? err.message : "Failed to save preferences"
      );
    },
  });
}
