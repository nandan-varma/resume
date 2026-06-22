"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ErrorBoundary } from "@/lib/error-boundary";
import { isValidModelId, type ModelId, models } from "@/lib/models";
import { usePersonalInfo, useSaveAiPreferences } from "@/lib/queries/resume";
import { useModelId } from "@/lib/use-model-id";

const schema = z.object({
  aiPreferences: z.string().max(5000),
});

interface SettingsClientProps {
  userEmail: string;
  userName: string;
}

export function SettingsClient(props: SettingsClientProps) {
  return (
    <ErrorBoundary>
      <SettingsClientInner {...props} />
    </ErrorBoundary>
  );
}

function SettingsClientInner({ userName, userEmail }: SettingsClientProps) {
  const { data: personalInfo } = usePersonalInfo();
  const savePrefs = useSaveAiPreferences();
  const [modelId, setModelId] = useModelId();

  // "values" re-syncs with TQ cache on every render — isDirty becomes false after a successful save
  const form = useForm({
    resolver: zodResolver(schema),
    values: { aiPreferences: personalInfo?.aiPreferences ?? "" },
  });

  const onSubmit = form.handleSubmit(async ({ aiPreferences }) => {
    await savePrefs.mutateAsync(aiPreferences);
  });

  return (
    <div className="mx-auto max-w-2xl px-4 pb-10 md:px-6">
      <Card className="mb-5 animate-enter-up p-6 [animation-delay:80ms]">
        <h2 className="mb-4 font-semibold text-base text-foreground">
          Profile
        </h2>
        <div className="flex items-center gap-4">
          <div
            aria-hidden="true"
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-foreground font-bold text-background text-lg"
          >
            {(userName || userEmail).charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-foreground">{userName}</p>
            <p className="mt-0.5 text-muted-foreground text-sm">{userEmail}</p>
          </div>
        </div>
      </Card>

      <Card className="mb-5 animate-enter-up p-6 [animation-delay:120ms]">
        <div className="mb-4">
          <h2 className="font-semibold text-base text-foreground">AI Model</h2>
          <p className="mt-0.5 text-muted-foreground text-xs">
            Used for resume analysis, editing, and job customization. Saved
            locally.
          </p>
        </div>
        <Select
          onValueChange={(value) => {
            if (isValidModelId(value)) {
              setModelId(value as ModelId);
              toast.success("Model saved");
            }
          }}
          value={modelId}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex flex-col">
                  <span>{model.name}</span>
                  <span className="text-muted-foreground text-xs uppercase">
                    {model.provider}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      <Card className="animate-enter-up p-6 [animation-delay:150ms]">
        <div className="mb-4">
          <h2 className="font-semibold text-base text-foreground">
            AI Analysis Preferences
          </h2>
          <p className="mt-0.5 text-muted-foreground text-xs">
            Context the AI uses when analyzing your resume. Be specific about
            your goals.
          </p>
        </div>
        <form onSubmit={onSubmit}>
          <Textarea
            {...form.register("aiPreferences")}
            placeholder='e.g. "I am targeting senior backend engineering roles at startups…"'
            rows={5}
          />
          <div className="mt-4 flex items-center justify-between">
            <span
              className={`text-xs ${form.formState.isDirty ? "text-warning" : "text-muted-foreground"}`}
            >
              {form.formState.isDirty ? "Unsaved changes" : ""}
            </span>
            <Button
              disabled={form.formState.isSubmitting || !form.formState.isDirty}
              size="sm"
              type="submit"
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="mr-2 size-3.5" />
                  Save
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
