import {
  type QueryClient,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getPersonalInformation,
  saveAiPreferences,
  savePreferredModelId,
} from "@/server/resume";
import {
  answerQuestion,
  appendTurn,
  clearMessages,
  getResumeDocument,
  restoreRevision,
  saveLatex,
} from "@/server/resume-editor";

export const personalInfoQueryKey = ["personal-info"] as const;
export const resumeDocumentQueryKey = (jobId: number | null) =>
  ["resume-document", jobId ?? "global"] as const;

export type ResumeDocument = NonNullable<
  Awaited<ReturnType<typeof getResumeDocument>>
>;
export type ResumeDocumentMessage = ResumeDocument["messages"][number];

class ResumeConflictError extends Error {}

function notifyConflict(queryClient: QueryClient, jobId: number | null) {
  toast.error("This resume was edited elsewhere.", {
    action: {
      label: "Reload",
      onClick: () =>
        queryClient.invalidateQueries({
          queryKey: resumeDocumentQueryKey(jobId),
        }),
    },
  });
}

function handleMutationError(
  err: unknown,
  queryClient: QueryClient,
  jobId: number | null,
  fallback: string,
  onConflict?: () => void
) {
  if (err instanceof ResumeConflictError) {
    notifyConflict(queryClient, jobId);
    onConflict?.();
    return;
  }
  toast.error(err instanceof Error ? err.message : fallback);
}

interface WriteHookOptions {
  // Called in addition to the conflict toast — lets a caller (e.g. the
  // editor header) surface a persistent "out of sync" badge, not just a
  // toast that can be missed.
  onConflict?: () => void;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function usePersonalInfo() {
  return useSuspenseQuery({
    queryKey: personalInfoQueryKey,
    queryFn: getPersonalInformation,
  });
}

// staleTime 0 + refetchOnWindowFocus overrides the 5min global default —
// this is the query that catches "edited in another tab" conflicts, so it
// needs to actually refetch every time the tab regains focus.
export function useResumeDocument(jobId: number | null) {
  return useSuspenseQuery({
    queryKey: resumeDocumentQueryKey(jobId),
    queryFn: () => getResumeDocument(jobId),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useUploadResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name);
      const res = await fetch("/api/upload-resume", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!(res.ok && data.success)) {
        throw new Error(data.error ?? data.message ?? "Upload failed");
      }
      return data.resumeUrl as string;
    },
    // A brand-new user has no personalInformation row yet, so there's no
    // existing cache entry to patch — invalidate and let it refetch instead.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personalInfoQueryKey });
      toast.success("Resume uploaded");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    },
  });
}

export function useRegenerateLatex() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/regenerate-latex", { method: "POST" });
      const data = await res.json();
      if (!(res.ok && data.success)) {
        throw new Error(data.error ?? "Generation failed");
      }
      return data.resumeLatex as string;
    },
    // Writes via the background PDF->LaTeX path, outside the normal
    // version-checked mutation flow — invalidate rather than hand-patch so
    // the real version the upsert produced gets picked up.
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: resumeDocumentQueryKey(null),
      });
      toast.success("Resume regenerated");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    },
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

export function useSavePreferredModelId() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (preferredModelId: string) => {
      const result = await savePreferredModelId(preferredModelId);
      if (!result.success) {
        throw new Error(result.message ?? "Failed to save model");
      }
      return preferredModelId;
    },
    onMutate: async (preferredModelId) => {
      await queryClient.cancelQueries({ queryKey: personalInfoQueryKey });
      const previous = queryClient.getQueryData(personalInfoQueryKey);
      queryClient.setQueryData(
        personalInfoQueryKey,
        (old: Awaited<ReturnType<typeof getPersonalInformation>>) =>
          old ? { ...old, preferredModelId } : old
      );
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(personalInfoQueryKey, context.previous);
      }
      toast.error(err instanceof Error ? err.message : "Failed to save model");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: personalInfoQueryKey });
    },
  });
}

// Manual-typing autosave path — version-checked, no revision row. The
// expected version always comes from what's currently cached, so callers
// just pass the new text.
export function useSaveLatex(jobId: number | null, options?: WriteHookOptions) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (latex: string) => {
      const current = queryClient.getQueryData<ResumeDocument | null>(
        resumeDocumentQueryKey(jobId)
      );
      const result = await saveLatex(jobId, latex, current?.version ?? 0);
      if (!result.success) {
        if (result.conflict) {
          throw new ResumeConflictError(result.message);
        }
        throw new Error(result.message);
      }
      return result.document;
    },
    onSuccess: (document) => {
      queryClient.setQueryData<ResumeDocument | null>(
        resumeDocumentQueryKey(jobId),
        (old) => (old ? { ...old, ...document } : { ...document, messages: [] })
      );
    },
    onError: (err) =>
      handleMutationError(
        err,
        queryClient,
        jobId,
        "Failed to save",
        options?.onConflict
      ),
  });
}

type AppendTurnMessages = Parameters<typeof appendTurn>[1]["messages"];

// The one call per chat turn — a user message send, an AI response finish,
// or a consultation question/notice. `latex` (if given) becomes a
// version-checked update + a new revision row, using whatever version is
// currently cached.
export function useAppendTurn(
  jobId: number | null,
  options?: WriteHookOptions
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      messages,
      latex,
    }: {
      messages: AppendTurnMessages;
      latex?: string;
    }) => {
      const current = queryClient.getQueryData<ResumeDocument | null>(
        resumeDocumentQueryKey(jobId)
      );
      const result = await appendTurn(jobId, {
        messages,
        ...(latex === undefined
          ? {}
          : {
              latexUpdate: { latex, expectedVersion: current?.version ?? 0 },
            }),
      });
      if (!result.success) {
        if (result.conflict) {
          throw new ResumeConflictError(result.message);
        }
        throw new Error(result.message);
      }
      return result;
    },
    onSuccess: ({ document, messages }) => {
      queryClient.setQueryData<ResumeDocument | null>(
        resumeDocumentQueryKey(jobId),
        (old) => ({
          ...document,
          messages: [...(old?.messages ?? []), ...messages],
        })
      );
    },
    onError: (err) =>
      handleMutationError(
        err,
        queryClient,
        jobId,
        "Failed to send",
        options?.onConflict
      ),
  });
}

export function useRestoreRevision(
  jobId: number | null,
  options?: WriteHookOptions
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (revisionId: number) => {
      const current = queryClient.getQueryData<ResumeDocument | null>(
        resumeDocumentQueryKey(jobId)
      );
      const result = await restoreRevision(
        jobId,
        revisionId,
        current?.version ?? 0
      );
      if (!result.success) {
        if (result.conflict) {
          throw new ResumeConflictError(result.message);
        }
        throw new Error(result.message);
      }
      return result;
    },
    onSuccess: ({ document, message }) => {
      queryClient.setQueryData<ResumeDocument | null>(
        resumeDocumentQueryKey(jobId),
        (old) => ({
          ...document,
          messages: [...(old?.messages ?? []), message],
        })
      );
    },
    onError: (err) =>
      handleMutationError(
        err,
        queryClient,
        jobId,
        "Restore failed",
        options?.onConflict
      ),
  });
}

export function useAnswerQuestion(jobId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      messageId,
      answer,
    }: {
      messageId: number;
      answer: string;
    }) => {
      const result = await answerQuestion(jobId, messageId, answer);
      if (!result.success) {
        throw new Error(result.message ?? "Failed to save answer");
      }
      return result.message;
    },
    onSuccess: (message) => {
      queryClient.setQueryData<ResumeDocument | null>(
        resumeDocumentQueryKey(jobId),
        (old) =>
          old
            ? {
                ...old,
                messages: old.messages.map((m) =>
                  m.id === message.id ? message : m
                ),
              }
            : old
      );
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to save answer");
    },
  });
}

export function useClearMessages(jobId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await clearMessages(jobId);
      if (!result.success) {
        throw new Error(result.message ?? "Failed to clear chat");
      }
    },
    onSuccess: () => {
      queryClient.setQueryData<ResumeDocument | null>(
        resumeDocumentQueryKey(jobId),
        (old) => (old ? { ...old, messages: [] } : old)
      );
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to clear chat");
    },
  });
}
